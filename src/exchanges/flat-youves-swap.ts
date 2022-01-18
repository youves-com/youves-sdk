import { ContractAbstraction, TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { FlatYouvesExchangeInfo } from '../networks.base'
import { Token } from '../tokens/token'
import { round } from '../utils'
import { Exchange } from './exchange'
import { cashBought, marginalPrice, tokensBought } from './flat-cfmm-utils'
import { AddLiquidityInfo, getLiquidityAddCash, getLiquidityAddToken } from './flat-youves-utils'

const globalPromiseCache = new Map<string, Promise<unknown>>()

export interface CfmmStorage {
  tokenPool: number
  cashPool: number
  lqtTotal: number
  pendingPoolUpdates: number
  tokenAddress: string
  tokenId: number
  cashAddress: string
  cashId: number
  lqtAddress: string
}

const simpleHash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }

  return h
}

export const cache = () => {
  return (_target: Object, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    const constructKey = (symbol: string, collateralSymbol: string, input: any[]) => {
      const processedInput = input.map((value) => {
        if (value instanceof ContractAbstraction) {
          return value.address
        } else if (value instanceof BigNumber) {
          return value.toString(10)
        } else if (typeof value === 'object') {
          return simpleHash(JSON.stringify(value))
        } else {
          return value
        }
      })
      return `${symbol}-${collateralSymbol}-${propertyKey}-${processedInput.join('-')}`
    }

    descriptor.value = async function (...args: any[]) {
      const exchange = this as FlatYouvesExchange
      const constructedKey = constructKey(exchange?.token1.symbol, exchange?.token2.symbol, args)
      const promise = globalPromiseCache.get(constructedKey)
      if (promise) {
        // log with constructedKey --> goes into cache
        // console.log(constructedKey, await promise)
        return promise
      } else {
        const newPromise = originalMethod.apply(this, args)
        globalPromiseCache.set(constructedKey, newPromise)
        return newPromise
      }
    }

    return descriptor
  }
}

export class FlatYouvesExchange extends Exchange {
  public exchangeUrl: string = 'https://youves.com/swap'
  public exchangeId: string = ``
  public name: string = 'FlatYouves'
  public logo: string = 'youves.svg'

  public fee: number = 0.9985

  private liquidityToken: Token

  constructor(tezos: TezosToolkit, contractAddress: string, dexInfo: FlatYouvesExchangeInfo) {
    super(tezos, contractAddress, dexInfo.token1, dexInfo.token2)
    this.liquidityToken = dexInfo.liquidityToken
  }

  public async token1ToToken2(tokenAmount: number, minimumReceived: number): Promise<string> {
    return this.token1ToToken2Swap(tokenAmount, minimumReceived)
  }

  public async token2ToToken1(tokenAmount: number, minimumReceived: number): Promise<string> {
    return this.token2ToToken1Swap(tokenAmount, minimumReceived)
  }

  public async getToken1MaximumExchangeAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(1)
  }

  public async getToken2MaximumExchangeAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(2)
  }

  public async addLiquidity(minLiquidityMinted: BigNumber, maxTokenDeposit: BigNumber, cashDeposit: BigNumber) {
    const source = await this.getOwnAddress()

    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const deadline = await this.getDeadline()

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(await this.prepareAddTokenOperator(this.token1.contractAddress, this.dexAddress, this.token1.tokenId))
        .withContractCall(await this.prepareAddTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId))
        .withContractCall(
          dexContract.methods.addLiquidity(source, round(minLiquidityMinted), round(maxTokenDeposit), round(cashDeposit), deadline)
        )
        .withContractCall(await this.prepareRemoveTokenOperator(this.token1.contractAddress, this.dexAddress, this.token1.tokenId))
        .withContractCall(await this.prepareRemoveTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId))
    )
  }

  public async removeLiquidity(liquidityToBurn: BigNumber, minCashWithdrawn: BigNumber, minTokensWithdrawn: BigNumber) {
    const source = await this.getOwnAddress()

    const deadline = await this.getDeadline()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(
          dexContract.methods.removeLiquidity(source, round(liquidityToBurn), round(minCashWithdrawn), round(minTokensWithdrawn), deadline)
        )
    )
  }

  @cache()
  public async getExchangeRate(): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage: CfmmStorage = (await this.getStorageOfContract(dexContract)) as any

    const res = marginalPrice(
      new BigNumber(storage.cashPool).shiftedBy(-1 * this.token1.decimals),
      new BigNumber(storage.tokenPool).shiftedBy(-1 * this.token2.decimals)
    )

    return new BigNumber(res[0].toString()).div(res[1].toString())
  }

  public async getToken1Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token1.contractAddress, await this.getOwnAddress(), Number(this.token1.tokenId))
  }

  public async getToken2Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token2.contractAddress, await this.getOwnAddress(), Number(this.token2.tokenId))
  }

  public async getExpectedMinimumReceivedToken1(cashAmount: number): Promise<BigNumber> {
    const poolInfo = await this.getLiquidityPoolInfo()

    return new BigNumber(
      cashBought(new BigNumber(poolInfo.cashPool), new BigNumber(poolInfo.tokenPool), new BigNumber(cashAmount)).toString()
    )
  }

  public async getExpectedMinimumReceivedToken2(tokenAmount: number): Promise<BigNumber> {
    const poolInfo = await this.getLiquidityPoolInfo()

    return new BigNumber(
      tokensBought(new BigNumber(poolInfo.cashPool), new BigNumber(poolInfo.tokenPool), new BigNumber(tokenAmount)).toString()
    )
  }

  private async getExchangeMaximumTokenAmount(tokenNumber: 1 | 2): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage[`token${tokenNumber}_pool`])
    return currentTokenPool.dividedBy(3)
  }

  public async token1ToToken2Swap(tokenAmount: number, minimumReceived: number): Promise<string> {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage = (await this.getStorageOfContract(dexContract)) as any

    // const tokenAddress = dexStorage['tokenAddress']
    // const tokenId = dexStorage['tokenId']
    const cashAddress = dexStorage['cashAddress']
    const cashId = dexStorage['cashId']

    const deadline: string = this.getDeadline()

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(await this.prepareAddTokenOperator(cashAddress, this.dexAddress, cashId))
        .withContractCall(dexContract.methods.cashToToken(source, Math.floor(minimumReceived), Math.floor(tokenAmount), deadline))
        .withContractCall(await this.prepareRemoveTokenOperator(cashAddress, this.dexAddress, cashId))
    )
  }

  private getDeadline(): string {
    return new Date(new Date().getTime() + 60000).toISOString()
  }

  public async token2ToToken1Swap(tokenAmount: number, minimumReceived: number): Promise<string> {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage = (await this.getStorageOfContract(dexContract)) as any

    const tokenAddress = dexStorage['tokenAddress']
    const tokenId = dexStorage['tokenId']
    // const cashAddress = dexStorage['cashAddress']
    // const cashId = dexStorage['cashId']

    const deadline: string = this.getDeadline()

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(await this.prepareAddTokenOperator(tokenAddress, this.dexAddress, tokenId))
        .withContractCall(dexContract.methods.tokenToCash(source, Math.floor(minimumReceived), Math.floor(tokenAmount), deadline))
        .withContractCall(await this.prepareRemoveTokenOperator(tokenAddress, this.dexAddress, tokenId))
    )
  }

  @cache()
  public async getMinReceivedForCash(amount: BigNumber) {
    const poolInfo: CfmmStorage = await this.getLiquidityPoolInfo()

    return tokensBought(
      new BigNumber(poolInfo.cashPool).shiftedBy(-1 * this.token1.decimals),
      new BigNumber(poolInfo.tokenPool).shiftedBy(-1 * this.token2.decimals),
      amount.shiftedBy(-1 * this.token1.decimals)
    ).times(this.fee)
  }

  @cache()
  public async getMinReceivedForToken(amount: BigNumber) {
    const poolInfo: CfmmStorage = await this.getLiquidityPoolInfo()

    return cashBought(
      new BigNumber(poolInfo.cashPool).shiftedBy(-1 * this.token1.decimals),
      new BigNumber(poolInfo.tokenPool).shiftedBy(-1 * this.token2.decimals),
      amount.shiftedBy(-1 * this.token2.decimals)
    ).times(this.fee)
  }

  @cache()
  public async getLiquidityPoolInfo(): Promise<CfmmStorage> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage: CfmmStorage = (await this.getStorageOfContract(dexContract)) as any

    return dexStorage
  }

  @cache()
  public async getOwnLiquidityPoolTokens(): Promise<BigNumber> {
    const source = await this.getOwnAddress()

    const tokenContract = await this.tezos.wallet.at(this.liquidityToken.contractAddress)
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const tokenAmount = await tokenStorage['tokens'].get(source)

    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  @cache()
  public async getLiquidityForCash(cash: BigNumber): Promise<AddLiquidityInfo> {
    const poolInfo: CfmmStorage = await this.getLiquidityPoolInfo()

    return getLiquidityAddCash(
      cash,
      new BigNumber(poolInfo.cashPool).shiftedBy(-1 * this.token1.decimals),
      new BigNumber(poolInfo.tokenPool).shiftedBy(-1 * this.token2.decimals),
      new BigNumber(poolInfo.lqtTotal).shiftedBy(-1 * this.token1.decimals)
    )
  }

  @cache()
  public async getLiquidityForToken(token: BigNumber): Promise<AddLiquidityInfo> {
    const poolInfo: CfmmStorage = await this.getLiquidityPoolInfo()

    return getLiquidityAddToken(
      token,
      new BigNumber(poolInfo.cashPool).shiftedBy(-1 * this.token1.decimals),
      new BigNumber(poolInfo.tokenPool).shiftedBy(-1 * this.token2.decimals),
      new BigNumber(poolInfo.lqtTotal).shiftedBy(-1 * this.token1.decimals)
    )
  }

  @cache()
  public async getLiquidityPoolReturn(
    ownPoolTokens: BigNumber,
    slippage: number
  ): Promise<{ cashAmount: BigNumber; tokenAmount: BigNumber }> {
    const dexStorage: CfmmStorage = await this.getLiquidityPoolInfo()

    const poolShare = ownPoolTokens.div(dexStorage.lqtTotal)

    const adjustedSlippage = 1 - slippage / 100

    const cashAmount = poolShare.times(dexStorage.cashPool).times(adjustedSlippage)
    const tokenAmount = poolShare.times(dexStorage.tokenPool).times(adjustedSlippage)

    return { cashAmount, tokenAmount }
  }

  async getPriceImpactCashIn(cashIn: BigNumber) {
    const dexStorage: CfmmStorage = await this.getLiquidityPoolInfo()

    const exchangeRate = await this.getExchangeRate()
    console.log('Current Exchange Rate', exchangeRate.toString(10))

    console.log('cashIn', cashIn.toString())

    const tokenReceived = (await this.getMinReceivedForCash(cashIn)).shiftedBy(this.token2.decimals)
    console.log('tokenReceived', tokenReceived.toString())
    console.log('cashPool', dexStorage.cashPool.toString())
    console.log('tokenPool', dexStorage.tokenPool.toString())

    const newCashPool = new BigNumber(dexStorage.cashPool).plus(cashIn)
    const newTokenPool = new BigNumber(dexStorage.tokenPool).minus(tokenReceived)

    const res = marginalPrice(newCashPool.shiftedBy(-1 * this.token1.decimals), newTokenPool.shiftedBy(-1 * this.token2.decimals))
    const newExchangeRate = new BigNumber(res[0].toString()).div(res[1].toString()).toString()
    console.log('New Exchange Rate', newExchangeRate)

    return new BigNumber(1).minus(exchangeRate.div(newExchangeRate))
  }

  public async getExchangeUrl(): Promise<string> {
    return `https://youves.com/swap?from=${this.token1.symbol}&to=${this.token2.symbol}`
  }
}

// const tezos = new TezosToolkit('https://tezos-hangzhounet-node.prod.gke.papers.tech')
// const exchange = new FlatYouvesExchange(
//   tezos,
//   'KT1HDtYvo6qY7yfx5EeXtk9TBwsEARBfYkri',
//   hangzhounetTokens.uusdToken,
//   hangzhounetTokens.udefiToken
// )

// console.log(exchange.name)
// ;(async () => {
//   // try {
//   //   console.log((await exchange.getExchangeRate()).toString())
//   // } catch (e) {
//   //   console.log(e)
//   // }
//   // console.log(await exchange.getToken1Balance())
//   // console.log(await exchange.getToken2Balance())

//   // const res = marginalPrice(new BigNumber(1_000_000), new BigNumber(1_000_000))
//   // console.log('xxx', res[0].div(res[1]).toString())

//   {
//     // const tokens = cashBought(new BigNumber(1_100_000), new BigNumber(900_000), new BigNumber(100_000))
//     // const cash = cashBought(new BigNumber(1_750_000), new BigNumber(271_480.58), new BigNumber(1000))
//     // console.log('tokens', tokens.toString())
//     // console.log('cash', cash.toString())
//   }
// })()
