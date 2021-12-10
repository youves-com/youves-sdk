export type TokenSymbol = 'tez' | 'uUSD' | 'uDEFI' | 'YOU' | 'plenty' | 'uUSD-tzbtcLP' | 'XTZ/tzBTC LP'

export interface Token {
  id: TokenSymbol
  name: string
  decimals: number
  symbol: TokenSymbol
  targetSymbol: string
  unit: string
  impliedPrice: number
  contractAddress: string
  tokenId: number
}
