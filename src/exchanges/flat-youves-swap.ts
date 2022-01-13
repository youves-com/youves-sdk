import { TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { FlatYouvesExchangeInfo } from '../networks.base'
import { Exchange } from './exchange'
import { cashBought, marginalPrice, tokensBought } from './flat-cfmm-utils'

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

export class FlatYouvesExchange extends Exchange {
  public exchangeUrl: string = 'https://youves.com/swap'
  public exchangeId: string = ``
  public name: string = 'FlatYouves'
  public logo: string = 'youves.svg'

  public FEE: number = 0.9985

  private liquidityTokenContract: string
  private liquidityTokenDecimals: number

  constructor(tezos: TezosToolkit, contractAddress: string, dexInfo: FlatYouvesExchangeInfo) {
    super(tezos, contractAddress, dexInfo.token1, dexInfo.token2)
    this.liquidityTokenContract = dexInfo.liquidityTokenAddress
    this.liquidityTokenDecimals = dexInfo.liquidityTokenDecimals
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
        .withContractCall(dexContract.methods.addLiquidity(source, minLiquidityMinted, maxTokenDeposit, cashDeposit, deadline))
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
        .withContractCall(dexContract.methods.removeLiquidity(source, liquidityToBurn, minCashWithdrawn, minTokensWithdrawn, deadline))
    )
  }

  public async getExchangeRate(): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage: CfmmStorage = (await this.getStorageOfContract(dexContract)) as any

    const res = marginalPrice(new BigNumber(storage.cashPool), new BigNumber(storage.tokenPool))

    return new BigNumber(res[0].toString()).div(res[1].toString())
  }

  public async getToken1Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token1.contractAddress, await this.getOwnAddress(), Number(this.token1.tokenId))
  }

  public async getToken2Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token2.contractAddress, await this.getOwnAddress(), Number(this.token2.tokenId))
  }

  public async getExpectedMinimumReceivedToken1(amountInMutez: number): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage: CfmmStorage = (await this.getStorageOfContract(dexContract)) as any

    return new BigNumber(
      cashBought(new BigNumber(storage.cashPool), new BigNumber(storage.tokenPool), new BigNumber(amountInMutez)).toString()
    )
  }

  public async getExpectedMinimumReceivedToken2(tokenAmount: number): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage: CfmmStorage = (await this.getStorageOfContract(dexContract)) as any

    return new BigNumber(
      tokensBought(new BigNumber(storage.cashPool), new BigNumber(storage.tokenPool), new BigNumber(tokenAmount)).toString()
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

  public async getLiquidityPoolInfo(): Promise<CfmmStorage> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage: CfmmStorage = (await this.getStorageOfContract(dexContract)) as any

    return dexStorage
  }

  public async getOwnLiquidityPoolTokens(): Promise<BigNumber> {
    const source = await this.getOwnAddress()

    const tokenContract = await this.tezos.wallet.at(this.liquidityTokenContract)
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const tokenAmount = await tokenStorage['tokens'].get(source)
    this.liquidityTokenDecimals

    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  public async getLiquidityPoolReturn(
    ownPoolTokens: BigNumber,
    slippage: number
  ): Promise<{ cashAmount: BigNumber; tokenAmount: BigNumber }> {
    const dexStorage: CfmmStorage = await this.getLiquidityPoolInfo()

    const poolShare = new BigNumber(dexStorage.lqtTotal).div(ownPoolTokens)

    const adjustedSlippage = 1 - slippage / 100

    const cashAmount = poolShare.times(dexStorage.cashPool).times(adjustedSlippage)
    const tokenAmount = poolShare.times(dexStorage.tokenPool).times(adjustedSlippage)

    return { cashAmount, tokenAmount }
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
