export type TokenSymbol = 'tez' | 'uUSD' | 'uDEFI' | 'YOU' | 'plenty'

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
