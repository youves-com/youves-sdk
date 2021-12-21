export type TokenSymbol = 'tez' | 'uUSD' | 'uDEFI' | 'YOU' | 'plenty' | 'uUSD-tzbtcLP' | 'XTZ/tzBTC LP'

export enum TokenType {
  NATIVE = 0,
  FA1p2 = 1,
  FA2 = 2
}

export interface Token {
  id: TokenSymbol
  type: TokenType
  name: string
  decimals: number
  symbol: TokenSymbol
  targetSymbol: string
  unit: string
  impliedPrice: number
  contractAddress: string
  tokenId: number
}
