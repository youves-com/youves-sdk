import { ContractAbstraction, TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { CheckerExchangeInfo, DexType } from '../networks.base'
import { Token } from '../tokens/token'
import { round } from '../utils'
import { Exchange } from './exchange'
import { cashBought, marginalPrice, tokensBought } from './flat-cfmm-utils'
import { CfmmStorage } from './flat-youves-swap'
import { AddLiquidityInfo, getLiquidityAddCash, getLiquidityAddToken } from './flat-youves-utils'

const globalPromiseCache = new Map<string, Promise<unknown>>()

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
      const exchange = this as CheckerExchange
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

export class CheckerExchange extends Exchange {
  public exchangeUrl: string = 'https://app.youves.com/swap'
  public exchangeId: string = ``
  public name: string = 'Youves (Checker)'
  public logo: string = 'checker_logo.svg'

  public TOKEN_DECIMALS = 12
  public TEZ_DECIMALS = 6

  public readonly dexType: DexType = DexType.CHECKER

  public fee: number = 0.997

  private liquidityToken: Token

  constructor(tezos: TezosToolkit, contractAddress: string, dexInfo: CheckerExchangeInfo) {
    super(tezos, contractAddress, dexInfo.token1, dexInfo.token2)
    this.liquidityToken = dexInfo.liquidityToken
  }

  public async token1ToToken2(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    return this.token1ToToken2Swap(tokenAmount, minimumReceived)
  }

  public async token2ToToken1(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
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

    const dexStorage = await this.getLiquidityPoolInfo()

    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const deadline = await this.getDeadline()

    if (dexStorage.cashId) {
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
    } else {
      const tokenContract = await this.getContractWalletAbstraction(dexStorage.cashAddress)
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(tokenContract.methods.approve(this.dexAddress, round(cashDeposit)))
          .withContractCall(await this.prepareAddTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId))
          .withContractCall(
            dexContract.methods.addLiquidity(source, round(minLiquidityMinted), round(maxTokenDeposit), round(cashDeposit), deadline)
          )
          .withContractCall(tokenContract.methods.approve(this.dexAddress, 0))
          .withContractCall(await this.prepareRemoveTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId))
      )
    }
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
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const cfmm = storage['deployment_state']['sealed']['cfmm']

    return new BigNumber(cfmm['ctez'])
      .dividedBy(10 ** this.TEZ_DECIMALS)
      .dividedBy(new BigNumber(cfmm['kit']).dividedBy(10 ** this.TOKEN_DECIMALS))
  }

  public async getToken1Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token1, await this.getOwnAddress())
  }

  public async getToken2Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token2, await this.getOwnAddress())
  }

  public async getExpectedMinimumReceivedToken1ForToken2(cashAmount: BigNumber): Promise<BigNumber> {
    return this.getMinReceivedCashForToken(cashAmount)
  }

  public async getExpectedMinimumReceivedToken2ForToken1(tokenAmount: BigNumber): Promise<BigNumber> {
    return this.getMinReceivedTokenForCash(tokenAmount)
  }

  private async getExchangeMaximumTokenAmount(tokenNumber: 1 | 2): Promise<BigNumber> {
    const poolInfo: CfmmStorage = await this.getLiquidityPoolInfo()
    if (tokenNumber === 1) {
      return new BigNumber(poolInfo.cashPool)
    } else {
      return new BigNumber(poolInfo.tokenPool)
    }
  }

  public async token1ToToken2Swap(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage = await this.getLiquidityPoolInfo()

    const cashAddress = dexStorage.cashAddress
    const cashId = dexStorage.cashId

    const deadline: string = this.getDeadline()

    if (cashId) {
      // If we have a cashId, it's FA2
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(await this.prepareAddTokenOperator(cashAddress, this.dexAddress, cashId))
          .withContractCall(dexContract.methods.cashToToken(source, round(minimumReceived), round(tokenAmount), deadline))
          .withContractCall(await this.prepareRemoveTokenOperator(cashAddress, this.dexAddress, cashId))
      )
    } else {
      const tokenContract = await this.getContractWalletAbstraction(cashAddress)
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(tokenContract.methods.approve(this.dexAddress, round(tokenAmount)))
          .withContractCall(dexContract.methods.cashToToken(source, round(minimumReceived), round(tokenAmount), deadline))
          .withContractCall(tokenContract.methods.approve(this.dexAddress, 0))
      )
    }
  }

  public async token2ToToken1Swap(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage = (await this.getStorageOfContract(dexContract)) as any

    const tokenAddress = dexStorage['tokenAddress']
    const tokenId = dexStorage['tokenId']

    const deadline: string = this.getDeadline()

    console.log('tokenToCash', round(minimumReceived), round(tokenAmount))

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(await this.prepareAddTokenOperator(tokenAddress, this.dexAddress, tokenId))
        .withContractCall(dexContract.methods.tokenToCash(source, round(tokenAmount), round(minimumReceived), deadline))
        .withContractCall(await this.prepareRemoveTokenOperator(tokenAddress, this.dexAddress, tokenId))
    )
  }

  private getDeadline(): string {
    return new Date(new Date().getTime() + 15 * 60 * 1000).toISOString()
  }

  @cache()
  private async getMinReceivedTokenForCash(amount: BigNumber) {
    const poolInfo: CfmmStorage = await this.getLiquidityPoolInfo()

    return tokensBought(
      new BigNumber(poolInfo.cashPool),
      new BigNumber(poolInfo.tokenPool),
      amount,
      new BigNumber(poolInfo.cashMultiplier),
      new BigNumber(poolInfo.tokenMultiplier)
    ).times(this.fee)
  }

  @cache()
  private async getMinReceivedCashForToken(amount: BigNumber) {
    const poolInfo: CfmmStorage = await this.getLiquidityPoolInfo()

    return cashBought(
      new BigNumber(poolInfo.cashPool),
      new BigNumber(poolInfo.tokenPool),
      amount,
      new BigNumber(poolInfo.cashMultiplier),
      new BigNumber(poolInfo.tokenMultiplier)
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
  async getPriceImpactTokenIn(tokenIn: BigNumber) {
    const dexStorage: CfmmStorage = await this.getLiquidityPoolInfo()

    const exchangeRate = await this.getExchangeRate()

    const cashReceived = await this.getMinReceivedCashForToken(tokenIn)

    const newCashPool = new BigNumber(dexStorage.cashPool).minus(cashReceived)
    const newTokenPool = new BigNumber(dexStorage.tokenPool).plus(tokenIn)

    const res = marginalPrice(
      newCashPool,
      newTokenPool,
      new BigNumber(dexStorage.cashMultiplier),
      new BigNumber(dexStorage.tokenMultiplier)
    )
    const newExchangeRate = new BigNumber(1).div(res[0].div(res[1]))

    return exchangeRate.minus(newExchangeRate).div(exchangeRate).abs()
  }

  public async getExchangeUrl(): Promise<string> {
    return `https://youves.com/swap?from=${this.token1.symbol}&to=${this.token2.symbol}`
  }

  public async clearCache() {
    globalPromiseCache.clear()
  }
}
