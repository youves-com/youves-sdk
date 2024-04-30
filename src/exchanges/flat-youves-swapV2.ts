import BigNumber from 'bignumber.js'
import { cacheFactory, getMillisFromDays } from '../utils'
import { FlatYouvesExchange } from './flat-youves-swap'
import { Token, TokenType } from '../tokens/token'
import { cashBought, marginalPrice, tokensBought } from './flat-cfmm-utils'
export interface YieldRewards {
  token1Rewards: BigNumber | undefined
  token2Rewards: BigNumber | undefined
}

import { YouvesIndexer } from '../YouvesIndexer'
import { IndexerConfig } from '../types'
import { FlatYouvesExchangeInfo, NetworkConstants } from '../networks.base'
import { TezosToolkit } from '@taquito/taquito'
import { SingleSideLiquidityInfo, getSingleSideTradeAmount } from './flat-youves-utils'
import { BehaviorSubject } from 'rxjs'

export const tooOldError$ = new BehaviorSubject<boolean>(false)

const promiseCache = new Map<string, Promise<unknown>>()

const cache = cacheFactory(promiseCache, (obj: FlatYouvesExchange): [string] => {
  return [obj.dexAddress]
})

export class FlatYouvesExchangeV2 extends FlatYouvesExchange {
  protected youvesIndexer: YouvesIndexer | undefined
  constructor(
    tezos: TezosToolkit,
    contractAddress: string,
    dexInfo: FlatYouvesExchangeInfo,
    networkConstants: NetworkConstants,
    protected readonly indexerConfig?: IndexerConfig
  ) {
    super(tezos, contractAddress, dexInfo, networkConstants)
    this.youvesIndexer = this.indexerConfig !== undefined ? new YouvesIndexer(this.indexerConfig) : undefined
  }

  @cache()
  public async getExchangeFee(): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    return storage.feeRatio.numerator.div(storage.feeRatio.denominator)
  }

  @cache()
  public async getOwnLiquidityPoolTokens(): Promise<BigNumber> {
    const source = await this.getOwnAddress()

    const tokenContract = await this.tezos.wallet.at(this.liquidityToken.contractAddress)
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const entry = await tokenStorage['ledger'].get(source)
    const tokenAmount = entry !== undefined ? entry[0] : undefined
    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  public async getLiquidityTokenPriceinCash(): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    return dexContract.contractViews.lazyLqtPriceInCash().executeView({ viewCaller: this.dexAddress })
  }

  @cache()
  public async getTokenPriceInCash(): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const targetPriceOracle = await this.getContractWalletAbstraction(storage.targetPriceOracle)
    const tokenPriceInCash: BigNumber = await targetPriceOracle.contractViews
      .get_token_price_in_cash()
      .executeView({ viewCaller: this.dexAddress })
      .then((res) => {
        //TODO this is a quick hack to have the price old notice working in a short time
        if (res !== undefined && this.dexAddress === 'KT1PkygK9CqgNLyuJ9iMFcgx1651BrTjN1Q9') {
          tooOldError$.next(false)
        }
        return res
      })
      .catch((e: any) => {
        console.error(e)
        if (e.message.includes('OldPrice') && this.dexAddress === 'KT1PkygK9CqgNLyuJ9iMFcgx1651BrTjN1Q9') {
          tooOldError$.next(true)
        }
      })

    return tokenPriceInCash.shiftedBy(-this.token1.decimals)
  }

  @cache()
  public async getExchangeRate(): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any

    const tokenPriceInCash = await this.getTokenPriceInCash()
    const tokenMultiplier = storage.tokenMultiplier.times(tokenPriceInCash)

    const marginal = marginalPrice(
      new BigNumber(storage.cashPool),
      new BigNumber(storage.tokenPool),
      new BigNumber(storage.cashMultiplier),
      new BigNumber(tokenMultiplier)
    )

    const res = new BigNumber(1).div(marginal[0].div(marginal[1]))
    return res.div(tokenMultiplier)
  }

  @cache()
  protected async getMinReceivedTokenForCash(amount: BigNumber) {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any

    const tokenPriceInCash: BigNumber = await this.getTokenPriceInCash()
    const tokenMultiplier = storage.tokenMultiplier.times(tokenPriceInCash)

    const fee = await this.getExchangeFee()

    return tokensBought(
      new BigNumber(storage.cashPool),
      new BigNumber(storage.tokenPool),
      amount,
      new BigNumber(storage.cashMultiplier),
      new BigNumber(tokenMultiplier)
    ).times(fee)
  }

  @cache()
  protected async getMinReceivedCashForToken(amount: BigNumber) {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any

    const tokenPriceInCash: BigNumber = await this.getTokenPriceInCash()
    const tokenMultiplier = storage.tokenMultiplier.times(tokenPriceInCash)

    const fee = await this.getExchangeFee()

    return cashBought(
      new BigNumber(storage.cashPool),
      new BigNumber(storage.tokenPool),
      amount,
      new BigNumber(storage.cashMultiplier),
      new BigNumber(tokenMultiplier)
    ).times(fee)
  }

  //new implementation using wener single side liquidity calculations
  @cache()
  public async getSingleSideLiquidity(amount: BigNumber, isReverse: boolean = false): Promise<SingleSideLiquidityInfo | undefined> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const poolInfo = (await this.getStorageOfContract(dexContract)) as any

    const tokenPriceInCash: BigNumber = await this.getTokenPriceInCash()
    const tokenMultiplier: BigNumber = poolInfo.tokenMultiplier.times(tokenPriceInCash)

    const cashPool = new BigNumber(poolInfo.cashPool).shiftedBy(-1 * this.token1.decimals)
    const tokenPool = new BigNumber(poolInfo.tokenPool).shiftedBy(-1 * this.token2.decimals)
    const shiftedAmount = isReverse ? amount.shiftedBy(-1 * this.token2.decimals) : amount.shiftedBy(-1 * this.token1.decimals)
    const singleSideTrade = getSingleSideTradeAmount(
      isReverse ? new BigNumber(0) : shiftedAmount,
      isReverse ? shiftedAmount : new BigNumber(0),
      cashPool,
      tokenPool,
      new BigNumber(1),
      tokenMultiplier
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

  public async getPriceImpact(amount: BigNumber, reverse: boolean): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
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

    const tokenPriceInCash: BigNumber = await this.getTokenPriceInCash()
    const tokenMultiplier = storage.tokenMultiplier.times(tokenPriceInCash)

    const res = marginalPrice(newToken1Pool, newToken2Pool, new BigNumber(storage.cashMultiplier), new BigNumber(tokenMultiplier))
    const newExchangeRate = new BigNumber(1).div(res[0].div(res[1])).div(tokenMultiplier)

    return exchangeRate.minus(newExchangeRate).div(exchangeRate).abs()
  }

  public async getAccruedRewards(): Promise<YieldRewards> {
    const now = new Date()
    const lastWeek = new Date(now.valueOf() - getMillisFromDays(7))

    const nullToken: Token = {
      id: 'null',
      type: TokenType.FA2,
      name: 'null',
      shortName: 'null',
      decimals: 0,
      symbol: 'null',
      targetSymbol: 'null',
      unit: 'null',
      impliedPrice: 0,
      contractAddress: 'tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU',
      tokenId: 0,
      decimalPlaces: 0,
      inputDecimalPlaces: 0
    }
    let token1Rewards: BigNumber | undefined = await this.youvesIndexer?.getTransferAggregateOverTime(
      this.dexAddress,
      nullToken,
      lastWeek,
      now,
      'tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU'
    )
    token1Rewards = token1Rewards === undefined || token1Rewards.isNaN() ? undefined : token1Rewards

    let token2Rewards: BigNumber | undefined = await this.youvesIndexer?.getTransferAggregateOverTime(
      this.dexAddress,
      this.token2,
      lastWeek,
      now,
      'tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU'
    )
    token2Rewards = token2Rewards === undefined || token2Rewards.isNaN() ? undefined : token2Rewards

    //console.log('🍋 rewards', token1Rewards?.toNumber(), this.token1.symbol, token2Rewards?.toNumber(), this.token2.symbol)
    return {
      token1Rewards: token1Rewards,
      token2Rewards: token2Rewards
    }
  }
}
