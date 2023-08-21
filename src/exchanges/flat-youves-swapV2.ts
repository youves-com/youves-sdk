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

const promiseCache = new Map<string, Promise<unknown>>()

const cache = cacheFactory(promiseCache, (obj: FlatYouvesExchange): [string, string, string] => {
  return [obj.token1.symbol, obj.token2.symbol, obj.dexType]
})

export class FlatYouvesExchangeV2 extends FlatYouvesExchange {
  protected youvesIndexer: YouvesIndexer | undefined

  public fee: number = 0.9965 //0.35% exchange fee

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
    return tokenPriceInCash.shiftedBy(-this.token1.decimals)
  }

  @cache()
  public async getExchangeRate(): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any

    const tokenPriceInCash: BigNumber = await this.getTokenPriceInCash()
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

    return tokensBought(
      new BigNumber(storage.cashPool),
      new BigNumber(storage.tokenPool),
      amount,
      new BigNumber(storage.cashMultiplier),
      new BigNumber(tokenMultiplier)
    ).times(this.fee)
  }

  @cache()
  protected async getMinReceivedCashForToken(amount: BigNumber) {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any

    const tokenPriceInCash: BigNumber = await this.getTokenPriceInCash()
    const tokenMultiplier = storage.tokenMultiplier.times(tokenPriceInCash)

    return cashBought(
      new BigNumber(storage.cashPool),
      new BigNumber(storage.tokenPool),
      amount,
      new BigNumber(storage.cashMultiplier),
      new BigNumber(tokenMultiplier)
    ).times(this.fee)
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
    const lastMonth = new Date(now.getMilliseconds() - getMillisFromDays(30))

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
      lastMonth,
      now,
      'tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU'
    )
    token1Rewards = token1Rewards === undefined || token1Rewards.isNaN() ? undefined : token1Rewards

    let token2Rewards: BigNumber | undefined = await this.youvesIndexer?.getTransferAggregateOverTime(
      this.dexAddress,
      this.token2,
      lastMonth,
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

  public async clearCache() {
    promiseCache.clear()
  }
}
