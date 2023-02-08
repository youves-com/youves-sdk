export type TokenSymbol =
  | 'tez'
  | 'uUSD'
  | 'uDEFI'
  | 'uBTC'
  | 'uXTZ'
  | 'cCHF'
  | 'YOU'
  | 'tzbtc'
  | 'kusd'
  | 'usdt'
  | 'usdtz'
  | 'ctez'
  | 'plenty'
  | 'quipu'
  | 'sirs'
  | 'wusdc'
  | 'wwbtc'
  | 'usdce'
  | 'wbtce'
  | 'uusdwusdcLP'
  | 'ubtctzbtcLP'
  | 'tzbtcwwbtcLP'
  | 'uusdkusdLP'
  | 'uusdusdtzLP'
  | 'uusdubtcLP'
  | 'uusdyouLP'
  | 'uusdudefiLP'
  | 'uusdxtzLP'
  | 'uxtzxtzLP'
  | 'youxtzLP'
  | 'udefixtzLP'
  | 'uusdquipuLP'
  | 'uusdusdtLP'
  | 'uusdusdceLP'
  | 'ubtcwbtceLP'
  | 'ctezcchfLP'
  | 'ctezxtzLP'
  | 'ETHtz'
  | 'wXTZ'
  | 'kDAO'
  | 'SMAK'
  | 'PAUL'
  | 'DOGA'
  | 'USDS'
  | 'WRAP'
  | 'UNO'
  | 'hDAO'
  | 'INSTA'
  | 'CRUNCH'
  | 'FLAME'
  | 'GIF'
  | 'KALAM'
  | 'PXL'
  | 'crDAO'
  | 'WTZ'
  | 'wUSDT'
  | 'wBUSD'
  | 'wPAX'
  | 'wDAI'
  | 'wWETH'
  | 'wMATIC'
  | 'wLINK'
  | 'wUNI'
  | 'wAAVE'
  | 'wHUSD'
  | 'WETH.e'
  | 'USDT.e'
  | 'MATIC.e'
  | 'LINK.e'
  | 'DAI.e'
  | 'BUSD.e'
  | 'EURL'
  | 'AGEUR.e'
  | 'WRC'
  | 'MTTR'
  | 'SPI'
  | 'RSAL'
  | 'sDAO'
  | 'BTCtz'
  | 'MTRIA'
  | 'DeMN'
  | 'MIN'
  | 'MCH'
  | 'ENR'
  | 'UP'
  | 'ABR'
  | 'abBUSD'
  | 'apUSDC'
  | 'WETH.p'
  | 'WMATIC.p'
  | 'tChicken'
  | 'NATAS'
  | 'wTaco'
  | '3P'
  | 'TCOIN'
  | 'GSAL'
  | 'sCAS'
  | 'CRNCHY'
  | 'PLY'

export const lpTokenList: TokenSymbol[] = [
  'uusdwusdcLP',
  'ubtctzbtcLP',
  'tzbtcwwbtcLP',
  'uusdkusdLP',
  'uusdusdtzLP',
  'uusdubtcLP',
  'uusdyouLP',
  'uusdudefiLP',
  'uusdxtzLP',
  'youxtzLP',
  'udefixtzLP',
  'uusdquipuLP',
  'uusdusdtLP',
  'uusdusdceLP',
  'ubtcwbtceLP',
  'ctezcchfLP',
  'ctezxtzLP'
]

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
  _3RouteId?: number
}
