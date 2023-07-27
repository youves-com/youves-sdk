import BigNumber from 'bignumber.js'
import { cacheFactory } from '../utils'
import { FlatYouvesExchange } from './flat-youves-swap'

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

const cache = cacheFactory(promiseCache, (obj: FlatYouvesExchange): [string, string, string] => {
  return [obj.token1.symbol, obj.token2.symbol, obj.dexType]
})

export class FlatYouvesExchangeV2 extends FlatYouvesExchange {
  @cache()
  public async getOwnLiquidityPoolTokens(): Promise<BigNumber> {
    const source = await this.getOwnAddress()

    const tokenContract = await this.tezos.wallet.at(this.liquidityToken.contractAddress)
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const enrty = await tokenStorage['ledger'].get(source)
    const tokenAmount = enrty[0]

    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  public async clearCache() {
    promiseCache.clear()
  }
}
