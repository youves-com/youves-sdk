export type TokenSymbol =
  | 'tez'
  | 'uUSD'
  | 'uDEFI'
  | 'uBTC'
  | 'YOU'
  | 'tzbtc'
  | 'kusd'
  | 'usdtz'
  | 'plenty'
  | 'xtztzbtc'
  | 'wusdc'
  | 'wwbtc'
  | 'uusdwusdcLP'
  | 'ubtctzbtcLP'
  | 'tzbtcwwbtcLP'
  | 'uusdkusdLP'
  | 'uusdusdtzLP'
  | 'uusdubtcLP'
  | 'uusdyouLP'
  | 'uusdudefiLP'

export enum TokenType {
  NATIVE = 0,
  FA1p2 = 1,
  FA2 = 2
}

export interface Token {
  id: TokenSymbol
  type: TokenType
  name: string // Human readable name, eg. "XTZ/tzBTC Liquidity Baking Pool Token"
  shortName: string // Human readable short name, eg. "tzBTC LB"
  decimals: number
  symbol: TokenSymbol
  targetSymbol: string
  unit: string
  impliedPrice: number
  contractAddress: string
  tokenId: number
  decimalPlaces: number
  inputDecimalPlaces: number
}
