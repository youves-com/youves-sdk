import { TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { DexType, FlatYouvesExchangeInfo, NetworkConstants } from '../networks.base'
import { Token } from '../tokens/token'
import { cacheFactory, getMillisFromMinutes, round } from '../utils'
import { Exchange, LiquidityPoolInfo } from './exchange'
import { cashBought, marginalPrice, tokensBought } from './flat-cfmm-utils'
import {
  AddLiquidityInfo,
  getLiquidityAddCash,
  getLiquidityAddToken,
  getSingleSideTradeAmount,
  SingleSideLiquidityInfo
} from './flat-youves-utils'

export interface CfmmStorage {
  tokenPool: number
  cashPool: number
  lqtTotal: number
  pendingPoolUpdates: number
  tokenAddress: string
  tokenId: number
  tokenMultiplier: number
  cashAddress: string
  cashId: number
  cashMultiplier: number
  lqtAddress: string
}

const promiseCache = new Map<string, Promise<unknown>>()

const cache = cacheFactory(promiseCache, (obj: FlatYouvesExchange): [string, string] => {
  return [obj.token1.symbol, obj.token2.symbol]
})

export class FlatYouvesExchange extends Exchange {
  public exchangeUrl: string = 'https://youves.com/swap'
  public exchangeId: string = ``
  public name: string = 'FlatYouves'
  public logo: string = 'youves.svg'

  public readonly dexType: DexType = DexType.FLAT_CURVE

  public fee: number = 0.9985

  private liquidityToken: Token

  constructor(tezos: TezosToolkit, contractAddress: string, dexInfo: FlatYouvesExchangeInfo, networkConstants: NetworkConstants) {
    super(tezos, contractAddress, dexInfo.token1, dexInfo.token2, networkConstants)
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

    const dexStorage = await this.getLiquidityPoolState()

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

  public async addSingleSideLiquidity(
    swapAmount: BigNumber,
    swapMinReceived: BigNumber,
    minLiquidityMinted: BigNumber,
    maxTokenDeposit: BigNumber,
    cashDeposit: BigNumber,
    isReverse: boolean = false
  ) {
    const source = await this.getOwnAddress()

    const dexStorage = await this.getLiquidityPoolState()

    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const deadline = await this.getDeadline()

    if (isReverse) {
      const tokenAddress = dexStorage.tokenAddress
      const tokendId = dexStorage?.tokenId

      if (tokendId && dexStorage.cashId) {
        return this.sendAndAwait(
          this.tezos.wallet
            .batch()
            .withContractCall(await this.prepareAddTokenOperator(tokenAddress, this.dexAddress, tokendId))
            .withContractCall(dexContract.methods.tokenToCash(source, round(swapAmount), round(swapMinReceived), deadline))
            .withContractCall(await this.prepareRemoveTokenOperator(tokenAddress, this.dexAddress, tokendId))

            .withContractCall(await this.prepareAddTokenOperator(this.token1.contractAddress, this.dexAddress, this.token1.tokenId))
            .withContractCall(await this.prepareAddTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId))
            .withContractCall(
              dexContract.methods.addLiquidity(source, round(minLiquidityMinted), round(cashDeposit), round(maxTokenDeposit), deadline)
            )
            .withContractCall(await this.prepareRemoveTokenOperator(this.token1.contractAddress, this.dexAddress, this.token1.tokenId))
            .withContractCall(await this.prepareRemoveTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId))
        )
      } else {
        const cashContract = await this.getContractWalletAbstraction(dexStorage.cashAddress)
        return this.sendAndAwait(
          this.tezos.wallet
            .batch()
            .withContractCall(await this.prepareAddTokenOperator(tokenAddress, this.dexAddress, tokendId))
            .withContractCall(dexContract.methods.tokenToCash(source, round(swapAmount), round(swapMinReceived), deadline))
            .withContractCall(await this.prepareRemoveTokenOperator(tokenAddress, this.dexAddress, tokendId))

            .withContractCall(cashContract.methods.approve(this.dexAddress, round(maxTokenDeposit)))
            .withContractCall(await this.prepareAddTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId))
            .withContractCall(
              dexContract.methods.addLiquidity(source, round(minLiquidityMinted), round(cashDeposit), round(maxTokenDeposit), deadline)
            )
            .withContractCall(cashContract.methods.approve(this.dexAddress, 0))
            .withContractCall(await this.prepareRemoveTokenOperator(this.token2.contractAddress, this.dexAddress, this.token2.tokenId))
        )
      }
    }

    if (dexStorage.cashId) {
      const cashAddress = dexStorage.cashAddress
      const cashId = dexStorage.cashId

      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(await this.prepareAddTokenOperator(cashAddress, this.dexAddress, cashId))
          .withContractCall(dexContract.methods.cashToToken(source, round(swapMinReceived), round(swapAmount), deadline))
          .withContractCall(await this.prepareRemoveTokenOperator(cashAddress, this.dexAddress, cashId))

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
          .withContractCall(tokenContract.methods.approve(this.dexAddress, round(swapAmount)))
          .withContractCall(dexContract.methods.cashToToken(source, round(swapMinReceived), round(swapAmount), deadline))
          .withContractCall(tokenContract.methods.approve(this.dexAddress, 0))

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
    const storage: CfmmStorage = (await this.getStorageOfContract(dexContract)) as any

    const res = marginalPrice(
      new BigNumber(storage.cashPool),
      new BigNumber(storage.tokenPool),
      new BigNumber(storage.cashMultiplier),
      new BigNumber(storage.tokenMultiplier)
    )

    return new BigNumber(1).div(res[0].div(res[1]))
  }

  public async getToken1Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token1, await this.getOwnAddress())
  }

  public async getToken2Balance(): Promise<BigNumber> {
    return this.getTokenAmount(this.token2, await this.getOwnAddress())
  }

  public async getExpectedMinimumReceivedToken1ForToken2(tokenAmount: BigNumber): Promise<BigNumber> {
    return this.getMinReceivedCashForToken(tokenAmount)
  }

  public async getExpectedMinimumReceivedToken2ForToken1(cashAmount: BigNumber): Promise<BigNumber> {
    return this.getMinReceivedTokenForCash(cashAmount)
  }

  private async getExchangeMaximumTokenAmount(tokenNumber: 1 | 2): Promise<BigNumber> {
    const poolInfo: CfmmStorage = await this.getLiquidityPoolState()
    if (tokenNumber === 1) {
      return new BigNumber(poolInfo.cashPool)
    } else {
      return new BigNumber(poolInfo.tokenPool)
    }
  }

  public async token1ToToken2Swap(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage = await this.getLiquidityPoolState()

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

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(await this.prepareAddTokenOperator(tokenAddress, this.dexAddress, tokenId))
        .withContractCall(dexContract.methods.tokenToCash(source, round(tokenAmount), round(minimumReceived), deadline))
        .withContractCall(await this.prepareRemoveTokenOperator(tokenAddress, this.dexAddress, tokenId))
    )
  }

  private getDeadline(): string {
    return new Date(new Date().getTime() + getMillisFromMinutes(15)).toISOString()
  }

  @cache()
  private async getMinReceivedTokenForCash(amount: BigNumber) {
    const poolInfo: CfmmStorage = await this.getLiquidityPoolState()

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
    const poolInfo: CfmmStorage = await this.getLiquidityPoolState()

    return cashBought(
      new BigNumber(poolInfo.cashPool),
      new BigNumber(poolInfo.tokenPool),
      amount,
      new BigNumber(poolInfo.cashMultiplier),
      new BigNumber(poolInfo.tokenMultiplier)
    ).times(this.fee)
  }

  @cache()
  public async getLiquidityPoolState(): Promise<CfmmStorage> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage: CfmmStorage = (await this.getStorageOfContract(dexContract)) as any

    return dexStorage
  }
  @cache()
  public async getLiquidityPoolInfo(): Promise<LiquidityPoolInfo> {
    const storage = await this.getLiquidityPoolState()

    const poolInfo: LiquidityPoolInfo = {
      cashPool: new BigNumber(storage.cashPool),
      tokenPool: new BigNumber(storage.tokenPool),
      lqtTotal: new BigNumber(storage.lqtTotal)
    }

    return poolInfo
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
    const poolInfo: CfmmStorage = await this.getLiquidityPoolState()

    return getLiquidityAddCash(
      cash,
      new BigNumber(poolInfo.cashPool).shiftedBy(-1 * this.token1.decimals),
      new BigNumber(poolInfo.tokenPool).shiftedBy(-1 * this.token2.decimals),
      new BigNumber(poolInfo.lqtTotal).shiftedBy(-1 * this.token1.decimals)
    )
  }

  //old implementation
  @cache()
  public async getSingleSideLiquidityForCash(cash: BigNumber, isReverse: boolean = false): Promise<SingleSideLiquidityInfo> {
    const poolInfo: CfmmStorage = await this.getLiquidityPoolState()
    const exchangeRate = await this.getExchangeRate()
    const exchangeRateTo = isReverse ? exchangeRate : new BigNumber(1).div(exchangeRate)
    const cashPool = new BigNumber(poolInfo.cashPool).shiftedBy(-1 * this.token1.decimals)
    const tokenPool = new BigNumber(poolInfo.tokenPool).shiftedBy(-1 * this.token2.decimals)
    const ammRatio = isReverse ? tokenPool.div(cashPool) : cashPool.div(tokenPool)
    const swapRatio = new BigNumber(1).plus(ammRatio.div(exchangeRateTo))

    const swapAmount = cash.div(swapRatio)
    const minimumReceived = isReverse
      ? await this.getMinReceivedCashForToken(swapAmount)
      : await this.getMinReceivedTokenForCash(swapAmount)
    const singleSideCashAmount = cash.minus(swapAmount)
    const cashShare = singleSideCashAmount.div(isReverse ? tokenPool : cashPool)

    const lqtPool = new BigNumber(poolInfo.lqtTotal).shiftedBy(-1 * (isReverse ? this.token2.decimals : this.token1.decimals))

    return {
      amount: cash.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
      swapAmount: swapAmount.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
      swapMinReceived: minimumReceived.decimalPlaces(0, BigNumber.ROUND_HALF_DOWN),
      singleSideToken1Amount: singleSideCashAmount.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
      singleSideToken2Amount: minimumReceived.decimalPlaces(0, BigNumber.ROUND_HALF_DOWN),
      liqReceived: lqtPool.times(cashShare).decimalPlaces(0, BigNumber.ROUND_HALF_UP)
    }
  }

  //new implementation using wener single side liquidity calculations
  @cache()
  public async getSingleSideLiquidity(amount: BigNumber, isReverse: boolean = false): Promise<SingleSideLiquidityInfo | undefined> {
    const poolInfo: CfmmStorage = await this.getLiquidityPoolState()
    const cashPool = new BigNumber(poolInfo.cashPool).shiftedBy(-1 * this.token1.decimals)
    const tokenPool = new BigNumber(poolInfo.tokenPool).shiftedBy(-1 * this.token2.decimals)
    const shiftedAmount = isReverse ? amount.shiftedBy(-1 * this.token2.decimals) : amount.shiftedBy(-1 * this.token1.decimals)
    const singleSideTrade = getSingleSideTradeAmount(
      isReverse ? new BigNumber(0) : shiftedAmount,
      isReverse ? shiftedAmount : new BigNumber(0),
      cashPool,
      tokenPool,
      new BigNumber(1),
      new BigNumber(1)
    )

    const swapAmountShifted = singleSideTrade != undefined ? new BigNumber(singleSideTrade.sell_amt_gross) : undefined
    if (!swapAmountShifted) return undefined

    const swapAmount = isReverse
      ? swapAmountShifted.shiftedBy(1 * this.token2.decimals)
      : swapAmountShifted.shiftedBy(1 * this.token1.decimals)
    const minimumReceived = isReverse
      ? await this.getMinReceivedCashForToken(swapAmount)
      : await this.getMinReceivedTokenForCash(swapAmount)

    const singleSideCashAmount = isReverse ? minimumReceived : amount.minus(swapAmount)
    const singleSideTokenAmount = isReverse ? amount.minus(swapAmount) : minimumReceived

    const cashShare = isReverse ? singleSideTokenAmount.div(tokenPool) : singleSideCashAmount.div(cashPool)
    const lqtPool = new BigNumber(poolInfo.lqtTotal).shiftedBy(-1 * (isReverse ? this.token2.decimals : this.token1.decimals))
    return {
      amount: amount.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
      swapAmount: swapAmount.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
      swapMinReceived: minimumReceived.decimalPlaces(0, BigNumber.ROUND_HALF_DOWN),
      singleSideToken1Amount: isReverse
        ? singleSideTokenAmount.decimalPlaces(0, BigNumber.ROUND_HALF_DOWN)
        : singleSideCashAmount.decimalPlaces(0, BigNumber.ROUND_HALF_UP),
      singleSideToken2Amount: isReverse
        ? singleSideCashAmount.decimalPlaces(0, BigNumber.ROUND_HALF_UP)
        : singleSideTokenAmount.decimalPlaces(0, BigNumber.ROUND_HALF_DOWN),
      liqReceived: lqtPool.times(cashShare).decimalPlaces(0, BigNumber.ROUND_HALF_UP)
    }
  }

  @cache()
  public async getLiquidityForToken(token: BigNumber): Promise<AddLiquidityInfo> {
    const poolInfo: CfmmStorage = await this.getLiquidityPoolState()

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
    const dexStorage: CfmmStorage = await this.getLiquidityPoolState()

    const poolShare = ownPoolTokens.div(dexStorage.lqtTotal)

    const adjustedSlippage = 1 - slippage / 100

    const cashAmount = poolShare.times(dexStorage.cashPool).times(adjustedSlippage)
    const tokenAmount = poolShare.times(dexStorage.tokenPool).times(adjustedSlippage)

    return { cashAmount, tokenAmount }
  }

  public async getPriceImpact(amount: BigNumber, reverse: boolean): Promise<BigNumber> {
    const storage: CfmmStorage = await this.getLiquidityPoolState()

    const exchangeRate = await this.getExchangeRate()

    const tokenReceived = !reverse
      ? await this.getExpectedMinimumReceivedToken2ForToken1(amount)
      : await this.getExpectedMinimumReceivedToken1ForToken2(amount)

    const currentToken1Pool = new BigNumber(storage.cashPool)
    const currentToken2Pool = new BigNumber(storage.tokenPool)

    let newToken1Pool, newToken2Pool
    if (!reverse) {
      newToken1Pool = new BigNumber(currentToken1Pool).plus(amount)
      newToken2Pool = new BigNumber(currentToken2Pool).minus(tokenReceived)
    } else {
      newToken1Pool = new BigNumber(currentToken1Pool).minus(tokenReceived)
      newToken2Pool = new BigNumber(currentToken2Pool).plus(amount)
    }

    const res = marginalPrice(newToken1Pool, newToken2Pool, new BigNumber(storage.cashMultiplier), new BigNumber(storage.tokenMultiplier))
    const newExchangeRate = new BigNumber(1).div(res[0].div(res[1]))

    return exchangeRate.minus(newExchangeRate).div(exchangeRate).abs()
  }

  public async getExchangeUrl(): Promise<string> {
    return `https://youves.com/swap?from=${this.token1.symbol}&to=${this.token2.symbol}`
  }

  public async clearCache() {
    promiseCache.clear()
  }
}

// const tezos = new TezosToolkit('https://tezos-ghostnet-node.prod.gke.papers.tech')
// const exchange = new FlatYouvesExchange(
//   tezos,
//   'KT1HDtYvo6qY7yfx5EeXtk9TBwsEARBfYkri',
//   ghostnetTokens.uusdToken,
//   ghostnetTokens.udefiToken
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
