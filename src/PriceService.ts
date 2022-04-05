import BigNumber from 'bignumber.js'
import { TokenSymbol } from './tokens/token'

let service: PriceService | undefined
export function getPriceService(): PriceService {
  if (!service) {
    service = new PriceService()
  }
  return service
}

class PriceService {
  private prices: Map<TokenSymbol, BigNumber> = new Map()

  constructor() {}

  async getUSDPrice(fromToken: TokenSymbol): Promise<BigNumber> {
    return this.prices.get(fromToken) ?? new BigNumber(0)
  }

  async getTokenToTokenPrice(fromToken: TokenSymbol, toToken: TokenSymbol): Promise<BigNumber> {
    const from = this.prices.get(fromToken) ?? new BigNumber(1)
    const to = this.prices.get(toToken) ?? new BigNumber(1)
    return from.div(to)
  }
}
