export type TokenSymbol =
  | 'null'
  | 'tez'
  | 'uUSD'
  | 'uDEFI'
  | 'uBTC'
  | 'uXTZ'
  | 'cCHF'
  | 'uXAU'
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
  | 'uxtzusdtLP'
  | 'youxtzLP'
  | 'udefixtzLP'
  | 'uusdquipuLP'
  | 'uusdusdtLP'
  | 'uusdusdceLP'
  | 'ubtcwbtceLP'
  | 'ctezcchfLP'
  | 'ctezxtzLP'
  | 'youuxtzLP'
  | 'yyXTZ'
  | 'yyUSD'
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
  | 'wCRO'
  | 'wSUSHI'
  | 'wFTT'
  | 'SKULL'
  | 'STV'
  | 'RTQLA'
  | 'SHL'
  | 'WHEAT'
  | 'akaDAO'
  | 'IDZ'
  | 'GOT'
  | 'ELXR'
  | 'WEED'
  | 'EVIL'
  | 'BART'
  | 'RADIO'
  | 'GUTS'
  | 'BAN'
  | 'tDAO'
  | 'SHTz'
  | 'DRIP'
  | 'Bezos'
  | 'RCKT'
  | 'BDVXP'
  | 'bDAO'
  | 'hrDAO'
  | 'ECN'
  | 'PURPLE'
  | 'CLOVER'
  | 'oXTZ'
  | 'GONZ'
  | 'HERA'
  | 'PLAT'
  | 'fDAO'
  | 'TezDAO'
  | 'CVZA'
  | 'pxlDAO'
  | 'SEB'
  | 'AQRtz'
  | 'TZD'
  | 'EASY'
  | 'SOIL'
  | 'MYH'
  | 'HEH'
  | 'MAG'
  | 'SZO'
  | 'STKR'
  | 'wTEZ'
  | 'TKEY'
  | 'PEPE_KT_61a'
  | 'PEPE'
  | 'TROLL'
  | 'TOKENS'
  | 'LYZI'

export type AssetSymbol = 'USD' | 'BTC' | 'CHF' | 'XAU'

export const lpTokenList: string[] = [
  'uusdwusdcLP',
  'ubtctzbtcLP',
  'tzbtcwwbtcLP',
  'uusdkusdLP',
  'uusdusdtzLP',
  'uusdubtcLP',
  'uusdyouLP',
  'uusdudefiLP',
  'uusdxtzLP',
  'uxtzxtzLP',
  'uxtzusdtLP',
  'youxtzLP',
  'udefixtzLP',
  'uusdquipuLP',
  'uusdusdtLP',
  'uusdusdceLP',
  'ubtcwbtceLP',
  'ctezcchfLP',
  'ctezxtzLP',
  'youuxtzLP',
  'yyXTZ',
  'yyUSD'
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
