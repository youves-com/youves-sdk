import BigNumber from 'bignumber.js'
import { TokenSymbol } from './tokens/token'

let service: PriceService | undefined
export function getPriceService(): PriceService {
  if (!service) {
    service = new PriceService()
  }
  return service
}

type TokenKey = string // `${TokenSymbol}-${TokenSymbol}`

class PriceService {
  public prices: Map<TokenKey, BigNumber> = new Map()

  constructor() {}

  async printPrice(fromToken: TokenSymbol, toToken: TokenSymbol) {
    console.log('1', fromToken, 'will give you', (await this.getTokenToTokenPrice(fromToken, toToken)).toString(), toToken)
    console.log('1', toToken, 'will give you', (await this.getTokenToTokenPrice(toToken, fromToken)).toString(), fromToken)
  }

  // async fetchPrice(fromToken: TokenSymbol, toToken: TokenSymbol): Promise<void> {

  //   this.prices.set(`${fromToken}-${toToken}`, price)
  //   this.prices.set(`${toToken}-${fromToken}`, new BigNumber(1).div(price))
  // }

  async addPrice(fromToken: TokenSymbol, toToken: TokenSymbol, price: BigNumber): Promise<void> {
    this.prices.set(`${fromToken}-${toToken}`, price)
    this.prices.set(`${toToken}-${fromToken}`, new BigNumber(1).div(price))
    this.printPrice(fromToken, toToken)
  }

  async getUSDPrice(fromToken: TokenSymbol): Promise<BigNumber> {
    return this.prices.get(`${fromToken}-uUSD`) ?? new BigNumber(0)
  }

  async getTokenToTokenPrice(fromToken: TokenSymbol, toToken: TokenSymbol, onlyExact: boolean = false): Promise<BigNumber> {
    // const from = this.prices.get(`${fromToken}-${toToken}`) ?? new BigNumber(1)
    // const to = this.prices.get(toToken) ?? new BigNumber(1)
    // return from.div(to)
    let price = this.prices.get(`${fromToken}-${toToken}`)
    if (price) {
      return price
    }

    if (onlyExact) {
      console.log('NOT FOUND', fromToken, toToken)
      return new BigNumber(-2)
    }

    if (fromToken !== 'tez' && toToken !== 'tez') {
      price = await this.findRoute(fromToken, toToken, 'tez')
      if (price) {
        return price
      }
    }

    if (fromToken !== 'uUSD' && toToken !== 'uUSD') {
      price = await this.findRoute(fromToken, toToken, 'uUSD')
      if (price) {
        return price
      }
    }

    return new BigNumber(-1)
  }

  async findRoute(fromToken: TokenSymbol, toToken: TokenSymbol, hopToken: TokenSymbol) {
    return (await this.getTokenToTokenPrice(fromToken, hopToken, true)).times(await this.getTokenToTokenPrice(hopToken, toToken, true))
  }
}
