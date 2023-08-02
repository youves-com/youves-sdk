import BigNumber from 'bignumber.js'
import { cacheFactory, getMillisFromDays } from '../utils'
import { FlatYouvesExchange } from './flat-youves-swap'
import { Token, TokenType } from '../tokens/token'

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
import { YouvesIndexer } from '../YouvesIndexer'
import { IndexerConfig } from '../types'
import { FlatYouvesExchangeInfo, NetworkConstants } from '../networks.base'
import { TezosToolkit } from '@taquito/taquito'

const promiseCache = new Map<string, Promise<unknown>>()

const cache = cacheFactory(promiseCache, (obj: FlatYouvesExchange): [string, string, string] => {
  return [obj.token1.symbol, obj.token2.symbol, obj.dexType]
})

export class FlatYouvesExchangeV2 extends FlatYouvesExchange {
  protected youvesIndexer: YouvesIndexer

  constructor(
    tezos: TezosToolkit,
    contractAddress: string,
    dexInfo: FlatYouvesExchangeInfo,
    networkConstants: NetworkConstants,
    protected readonly indexerConfig: IndexerConfig
  ) {
    super(tezos, contractAddress, dexInfo, networkConstants)
    this.youvesIndexer = new YouvesIndexer(this.indexerConfig)
  }

  @cache()
  public async getOwnLiquidityPoolTokens(): Promise<BigNumber> {
    const source = await this.getOwnAddress()

    const tokenContract = await this.tezos.wallet.at(this.liquidityToken.contractAddress)
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const enrty = await tokenStorage['ledger'].get(source)
    const tokenAmount = enrty[0]

    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  public async getLiquidityTokenPriceinCash() {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    // dexContract.methods
    //   .fetchLqtTokenPriceInCash('KT1XGta53KtvSGfnDNaTcNxXygSgxUL9yNN1')
    //   .send()
    //   .then((x) => {
    //     console.log('🌸', x)
    //   })

    return dexContract.contractViews.lqtPriceInCashLazyCalculated().executeView({ viewCaller: this.dexAddress })
  }

  public async getAccruedRewards() {
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
    const tezRewards = this.youvesIndexer.getTransferAggregateOverTime(
      this.dexAddress,
      nullToken,
      lastMonth,
      now,
      'tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU'
    )

    const uxtzRewards = this.youvesIndexer.getTransferAggregateOverTime(
      this.dexAddress,
      this.token2,
      lastMonth,
      now,
      'tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU'
    )

    console.log('🌸', (await tezRewards).toNumber(), (await uxtzRewards).toNumber())

    return Promise.all([tezRewards, uxtzRewards]).then((value) =>
      value.reduce((acc, val) => (val.isNaN() ? acc : acc.plus(val)), new BigNumber(0))
    )
  }

  public async clearCache() {
    promiseCache.clear()
  }
}
