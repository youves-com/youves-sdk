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

export const xtzToken: Token = {
  id: 'tez',
  name: 'Tezos',
  decimals: 6,
  symbol: 'tez',
  targetSymbol: 'tez',
  unit: 'tez',
  impliedPrice: 1,
  contractAddress: 'INVALID',
  tokenId: 0
}

export const youToken: Token = {
  id: 'YOU',
  name: 'Youves Governance YOU',
  decimals: 12,
  symbol: 'YOU',
  targetSymbol: 'YOU',
  unit: 'YOU',
  impliedPrice: 1,
  contractAddress: 'KT1JbCE1p9A6fH5aDvmp7qhHEXbtRY6mRibH',
  tokenId: 0
}

export const uusdToken: Token = {
  id: 'uUSD',
  name: 'youves uUSD',
  decimals: 12,
  symbol: 'uUSD',
  targetSymbol: 'USD',
  unit: 'uUSD',
  impliedPrice: 1.25,
  contractAddress: 'KT1L9iniM6swtx95o5SHUiFdG3rWxq8pfpHb',
  tokenId: 0
}

export const udefiToken: Token = {
  id: 'uDEFI',
  name: 'youves uDEFI',
  decimals: 12,
  symbol: 'uDEFI',
  targetSymbol: 'DEFI',
  unit: 'uUSD',
  impliedPrice: 1.25,
  contractAddress: 'KT1L9iniM6swtx95o5SHUiFdG3rWxq8pfpHb',
  tokenId: 1
}

export const plentyToken: Token = {
  id: 'plenty',
  name: 'Plenty',
  decimals: 12, // TODO: ???
  symbol: 'plenty',
  targetSymbol: 'plenty',
  unit: 'plenty',
  impliedPrice: 1,
  contractAddress: 'test',
  tokenId: 0
}
