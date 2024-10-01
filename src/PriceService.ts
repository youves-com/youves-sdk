import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { FlatYouvesExchange } from './exchanges/flat-youves-swap'
import { AssetDefinition, FlatYouvesExchangeInfo, NetworkConstants, TargetOracle } from './networks.base'
import { getMillisFromMinutes, getPriceFromOracle } from './utils'
import { FlatYouvesExchangeV2 } from './exchanges/flat-youves-swapV2'

const CACHE_MAX_AGE = 1 //max age of cache in minutes

export class PriceService {
  private priceCache: { [key: string]: { price: BigNumber; timestamp: number } } = {}

  constructor(
    public tezos: TezosToolkit,
    public readonly networkConstants: NetworkConstants,
    public readonly contracts: AssetDefinition[]
  ) {}
  
  public async getUxtzXtzPrice() {
    //caching
    const cacheKey = 'uxtzXtzPrice'
    const cachedPrice = this.getCachedPrice(cacheKey)
    if (cachedPrice) {
      return cachedPrice
    }

    const uxtzTezDex = this.networkConstants.dexes.find(
      (dex) => dex.token1.symbol === 'tez' && dex.token2.symbol === 'uXTZ'
    ) as FlatYouvesExchangeInfo
    if (!uxtzTezDex) return
    const uxtzTezPrice = await new FlatYouvesExchange(
      this.tezos,
      uxtzTezDex.contractAddress,
      uxtzTezDex,
      this.networkConstants
    ).getExchangeRate()

    this.cachePrice(cacheKey, uxtzTezPrice)
    return uxtzTezPrice
  }

  public async getUxtzUsdtPrice() {
    //caching
    const cacheKey = 'uxtzUsdtPrice'
    const cachedPrice = this.getCachedPrice(cacheKey)
    if (cachedPrice) {
      return cachedPrice
    }

    const uxtzTezPrice = await this.getUxtzXtzPrice()
    if (!uxtzTezPrice) return

    const uxtzContract = this.contracts.find((contract) => contract.symbol === 'uXTZ')
    if (!uxtzContract) return
    const usdtCollateral = uxtzContract.collateralOptions.find((x) => x.token.symbol === 'usdt')
    if (!usdtCollateral) return
    const tezUsdtOracle: TargetOracle = usdtCollateral.targetOracle
    const tezUsdtPrice = new BigNumber(1)
      .div(
        new BigNumber(
          await getPriceFromOracle(tezUsdtOracle, this.tezos, this.networkConstants.fakeAddress, this.networkConstants.natViewerCallback)
        )
      )
      .shiftedBy(tezUsdtOracle.decimals)

    const uxtzUsdtPrice = uxtzTezPrice.times(tezUsdtPrice)
    this.cachePrice(cacheKey, uxtzUsdtPrice)
    return uxtzUsdtPrice
  }

  public async getUxauUusdPrice() {
    //caching
    const cacheKey = 'uxauUusdPrice'
    const cachedPrice = this.getCachedPrice(cacheKey)
    if (cachedPrice) {
      return cachedPrice
    }

    const uxauUusdDex = this.networkConstants.dexes.find(
      (dex) => dex.token1.symbol === 'uUSD' && dex.token2.symbol === 'uXAU'
    ) as FlatYouvesExchangeInfo
    if (!uxauUusdDex) return
    const uxauUusdPrice = await new FlatYouvesExchangeV2(
      this.tezos,
      uxauUusdDex.contractAddress,
      uxauUusdDex,
      this.networkConstants
    ).getExchangeRate()

    this.cachePrice(cacheKey, uxauUusdPrice)
    return uxauUusdPrice
  }

  public async getUusdUsdtPrice() {
    //caching
    const cacheKey = 'uusdUsdtPrice'
    const cachedPrice = this.getCachedPrice(cacheKey)
    if (cachedPrice) {
      return cachedPrice
    }

    const uusdUsdtDex = this.networkConstants.dexes.find(
      (dex) => dex.token1.symbol === 'usdt' && dex.token2.symbol === 'uUSD'
    ) as FlatYouvesExchangeInfo
    if (!uusdUsdtDex) return
    const uusdUsdtPrice = await new FlatYouvesExchange(
      this.tezos,
      uusdUsdtDex.contractAddress,
      uusdUsdtDex,
      this.networkConstants
    ).getExchangeRate()

    this.cachePrice(cacheKey, uusdUsdtPrice)
    return uusdUsdtPrice
  }

  //TODO: remove, used for ghostnet testing
  getCashPriceInToken = async (oracle: TargetOracle, tezos: TezosToolkit) => {
    const contract = await tezos.wallet.at(oracle.address)
    const price = await contract.contractViews.get_cash_price_in_token().executeView({ viewCaller: oracle.address })

    return price
  }

  public async getUxauUsdtPrice() {
    //caching
    const cacheKey = 'uxauUsdtPrice'
    const cachedPrice = this.getCachedPrice(cacheKey)
    if (cachedPrice) {
      return cachedPrice
    }

    // //TODO: remove, used for ghostnet testing
    // const uxauUsdtOracle: TargetOracle = {
    //   address: 'KT1Kr6MxsdE3ZDyNYMTywhR8kJZkjxV49frA',
    //   decimals: 6,
    //   entrypoint: 'get_cash_price_in_token',
    //   isView: true,
    //   isMarket: true
    // }
    // const uxauUsdtPrice = new BigNumber(1)
    //   .div(new BigNumber(await this.getCashPriceInToken(uxauUsdtOracle, this.tezos)))
    //   .shiftedBy(uxauUsdtOracle.decimals)

    // console.log('uxauUsdtPrice ', uxauUsdtPrice.toNumber())
    // return uxauUsdtPrice

    const uxauUusdPrice = await this.getUxauUusdPrice()
    if (!uxauUusdPrice) return

    const uusdUsdtPrice = await this.getUusdUsdtPrice()
    if (!uusdUsdtPrice) return

    const uxauUsdtPrice = uxauUusdPrice.times(uusdUsdtPrice)
    this.cachePrice(cacheKey, uxauUsdtPrice)
    return uxauUsdtPrice
  }

  protected async getContractWalletAbstraction(address: string): Promise<ContractAbstraction<Wallet>> {
    return this.tezos.wallet.at(address)
  }

  protected async getStorageOfContract(contract: ContractAbstraction<Wallet>) {
    return contract.storage()
  }

  private getCachedPrice(cacheKey: string) {
    const cachedValue = this.priceCache[cacheKey]
    if (cachedValue && Date.now() - cachedValue.timestamp < getMillisFromMinutes(CACHE_MAX_AGE)) {
      return cachedValue.price
    }
    return null
  }

  private cachePrice(cacheKey: string, price: BigNumber) {
    this.priceCache[cacheKey] = { price: price, timestamp: Date.now() }
  }
}
