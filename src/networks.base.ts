import { Token, TokenSymbol, TokenType } from './tokens/token'

export enum FarmType {
  NO_LOCK = 1,
  INCENTIVISED = 2
}

export interface Farm {
  type: FarmType
  token1: Token
  token2: Token
  lpToken: Token
  rewardToken: Token
  farmContract: string
  dexType: DexType
  expectedWeeklyRewards: number
  rewardStart?: Date
  active: boolean
}

export interface FlatYouvesExchangeInfo {
  token1: Token
  token2: Token
  dexType: DexType.FLAT_CURVE
  contractAddress: string
  liquidityToken: Token
}

export interface CheckerExchangeInfo {
  token1: Token
  token2: Token
  dexType: DexType.CHECKER
  contractAddress: string
  liquidityToken: Token
}

export interface QuipuswapExchangeInfo {
  token1: Token
  token2: Token
  dexType: DexType.QUIPUSWAP
  address: string
  liquidityToken: Token
}

export interface PlentyExchangeInfo {
  token1: Token
  token2: Token
  dexType: DexType.PLENTY
  address: string
  liquidityToken: Token
}

export type ExchangePair = FlatYouvesExchangeInfo | CheckerExchangeInfo | QuipuswapExchangeInfo | PlentyExchangeInfo

export interface TargetOracle {
  address: string
  decimals: number
  entrypoint: string
  isView?: boolean
}

export interface CollateralInfo {
  isLatest: boolean
  collateralTarget: number
  collateralWarning: number
  collateralEmergency: number
  token: Token
  targetOracle: TargetOracle
  ORACLE_SYMBOL: string
  ENGINE_ADDRESS: string
  ENGINE_TYPE: EngineType
  OPTIONS_LISTING_ADDRESS: string
  SUPPORTS_BAILOUT: boolean
  SUPPORTS_CONVERSION: boolean
  HAS_OBSERVED_PRICE: boolean
  migrationPeriodEndTimestamp?: number
  new?: boolean
}

export interface AssetMetadata {
  targetSymbol: string
  impliedPrice: number
  new: boolean
  doubleRewards: string
}

export type AssetDefinition = {
  id: AssetField
  symbol: AssetField
  metadata: AssetMetadata
  collateralOptions: CollateralInfo[]
  token: Token
  governanceToken: Token
  REWARD_POOL_ADDRESS: string
  SAVINGS_POOL_ADDRESS: string
  SAVINGS_V2_POOL_ADDRESS: string
  SAVINGS_V3_POOL_ADDRESS: string
  SAVINGS_V2_VESTING_ADDRESS: string
  GOVERNANCE_DEX: string
  DEX: ExchangePair[]
}

export interface NetworkConstants {
  fakeAddress: string
  natViewerCallback: string
  balanceOfViewerCallback: string
  addressViewerCallback: string
  tokens: Record<TokenSymbol, Token>
  farms: Farm[]
  dexes: ExchangePair[]
  unifiedStaking: string
}
export interface Assets {
  mainnet: AssetDefinition[]
  ithacanet: AssetDefinition[]
}

export type AssetField = 'uUSD' | 'uDEFI' | 'uBTC' | 'cCHF' | 'uXTZ'

export enum EngineType {
  TRACKER_V1 = 'tracker-v1',
  TRACKER_V2 = 'tracker-v2',
  TRACKER_V3 = 'tracker-v3',
  CHECKER_V1 = 'checker-v1'
}

export enum DexType {
  QUIPUSWAP = 'quipuswap',
  PLENTY = 'plenty',
  FLAT_CURVE = 'flat_curve',
  CHECKER = 'checker',
  _3ROUTE = '3route'
}

export const xtzToken: Omit<Token, 'contractAddress'> = {
  id: 'tez',
  type: TokenType.NATIVE,
  name: 'Tezos',
  shortName: 'tez',
  decimals: 6,
  symbol: 'tez',
  targetSymbol: 'tez',
  unit: 'tez',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 0
}

export const youToken: Omit<Token, 'contractAddress'> = {
  id: 'YOU',
  type: TokenType.FA2,
  name: 'Youves Governance YOU',
  shortName: 'YOU',
  decimals: 12,
  symbol: 'YOU',
  targetSymbol: 'YOU',
  unit: 'YOU',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 17
}

export const tzbtcLPToken: Omit<Token, 'contractAddress'> = {
  id: 'sirs',
  type: TokenType.FA1p2,
  name: 'Sirius',
  shortName: 'SIRS',
  decimals: 0,
  symbol: 'sirs',
  targetSymbol: 'SIRS',
  unit: 'SIRS',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const tzbtcToken: Omit<Token, 'contractAddress'> = {
  id: 'tzbtc',
  type: TokenType.FA1p2,
  name: 'tzBTC',
  shortName: 'tzBTC',
  decimals: 8,
  symbol: 'tzbtc',
  targetSymbol: 'tzBTC',
  unit: 'tzBTC',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 8,
  inputDecimalPlaces: 8,
  _3RouteId: 2
}

export const kusdToken: Omit<Token, 'contractAddress'> = {
  id: 'kusd',
  type: TokenType.FA1p2,
  name: 'Kolibri USD',
  shortName: 'kUSD',
  decimals: 18,
  symbol: 'kusd',
  targetSymbol: 'kUSD',
  unit: 'kUSD',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 1
}

export const usdtToken: Omit<Token, 'contractAddress'> = {
  id: 'usdt',
  type: TokenType.FA2,
  name: 'USDt',
  shortName: 'USDt',
  decimals: 6,
  symbol: 'usdt',
  targetSymbol: 'USDt',
  unit: 'USDt',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 48
}

export const usdtzToken: Omit<Token, 'contractAddress'> = {
  id: 'usdtz',
  type: TokenType.FA1p2,
  name: 'USDtz',
  shortName: 'USDtz',
  decimals: 6,
  symbol: 'usdtz',
  targetSymbol: 'USDtz',
  unit: 'USDtz',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 3
}

export const ctezToken: Omit<Token, 'contractAddress'> = {
  id: 'ctez',
  type: TokenType.FA1p2,
  name: 'ctez',
  shortName: 'ctez',
  decimals: 6,
  symbol: 'ctez',
  targetSymbol: 'ctez',
  unit: 'ctez',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 18
}

export const uusdToken: Omit<Token, 'contractAddress'> = {
  id: 'uUSD',
  type: TokenType.FA2,
  name: 'youves uUSD',
  shortName: 'uUSD',
  decimals: 12,
  symbol: 'uUSD',
  targetSymbol: 'USD',
  unit: 'uUSD',
  impliedPrice: 1.25,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 12
}

export const udefiToken: Omit<Token, 'contractAddress'> = {
  id: 'uDEFI',
  type: TokenType.FA2,
  name: 'youves uDEFI',
  shortName: 'uDEFI',
  decimals: 12,
  symbol: 'uDEFI',
  targetSymbol: 'DEFI',
  unit: 'uDEFI',
  impliedPrice: 1.25,
  tokenId: 1,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 19
}

export const ubtcToken: Omit<Token, 'contractAddress'> = {
  id: 'uBTC',
  type: TokenType.FA2,
  name: 'youves uBTC',
  shortName: 'uBTC',
  decimals: 12,
  symbol: 'uBTC',
  targetSymbol: 'BTC',
  unit: 'uBTC',
  impliedPrice: 1.25,
  tokenId: 2,
  decimalPlaces: 8,
  inputDecimalPlaces: 8,
  _3RouteId: 49
}

export const uxtzToken: Omit<Token, 'contractAddress'> = {
  id: 'uXTZ',
  type: TokenType.FA2,
  name: 'youves uXTZ',
  shortName: 'uXTZ',
  decimals: 12,
  symbol: 'uXTZ',
  targetSymbol: 'XTZ',
  unit: 'uXTZ',
  impliedPrice: 1.25,
  tokenId: 3,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
  // _3RouteId: TODO
}

export const cchfToken: Omit<Token, 'contractAddress'> = {
  id: 'cCHF',
  type: TokenType.FA2,
  name: 'youves cCHF',
  shortName: 'cCHF',
  decimals: 12,
  symbol: 'cCHF',
  targetSymbol: 'CHF',
  unit: 'cCHF',
  impliedPrice: 1.25,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const plentyToken: Omit<Token, 'contractAddress'> = {
  id: 'plenty',
  type: TokenType.FA1p2,
  name: 'Plenty',
  shortName: 'Plenty',
  decimals: 18,
  symbol: 'plenty',
  targetSymbol: 'plenty',
  unit: 'plenty',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 10
}

export const quipuToken: Omit<Token, 'contractAddress'> = {
  id: 'quipu',
  type: TokenType.FA2,
  name: 'Quipu',
  shortName: 'Quipu',
  decimals: 6,
  symbol: 'quipu',
  targetSymbol: 'quipu',
  unit: 'quipu',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 14
}

export const wusdc: Omit<Token, 'contractAddress'> = {
  id: 'wusdc',
  type: TokenType.FA2,
  name: 'wUSDC',
  shortName: 'wUSDC',
  decimals: 6,
  symbol: 'wusdc',
  targetSymbol: 'wUSDC',
  unit: 'wusdc',
  impliedPrice: 1,
  tokenId: 17,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 28
}

export const wwbtc: Omit<Token, 'contractAddress'> = {
  id: 'wwbtc',
  type: TokenType.FA2,
  name: 'wwBTC',
  shortName: 'wwBTC',
  decimals: 8,
  symbol: 'wwbtc',
  targetSymbol: 'wwBTC',
  unit: 'wwbtc',
  impliedPrice: 1,
  tokenId: 19,
  decimalPlaces: 8,
  inputDecimalPlaces: 8,
  _3RouteId: 34
}

export const usdce: Omit<Token, 'contractAddress'> = {
  id: 'usdce',
  type: TokenType.FA2,
  name: 'USDC.e',
  shortName: 'USDC.e',
  decimals: 6,
  symbol: 'usdce',
  targetSymbol: 'USDC.e',
  unit: 'usdce',
  impliedPrice: 1,
  tokenId: 2,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 42
}

export const wbtce: Omit<Token, 'contractAddress'> = {
  id: 'wbtce',
  type: TokenType.FA2,
  name: 'WBTC.e',
  shortName: 'WBTC.e',
  decimals: 8,
  symbol: 'wbtce',
  targetSymbol: 'WBTC.e',
  unit: 'wbtce',
  impliedPrice: 1,
  tokenId: 1,
  decimalPlaces: 8,
  inputDecimalPlaces: 8,
  _3RouteId: 41
}

export const uusdwusdcLP: Omit<Token, 'contractAddress'> = {
  id: 'uusdwusdcLP',
  type: TokenType.FA1p2,
  name: 'uUSD/wUSDC LP',
  shortName: 'uUSD/wUSDC LP',
  decimals: 12,
  symbol: 'uusdwusdcLP',
  targetSymbol: 'uUSD/wUSDC LP',
  unit: 'uusdwusdcLP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const ubtctzbtcLP: Omit<Token, 'contractAddress'> = {
  id: 'ubtctzbtcLP',
  type: TokenType.FA1p2,
  name: 'uBTC/tzBTC LP',
  shortName: 'uBTC/tzBTC LP',
  decimals: 12,
  symbol: 'ubtctzbtcLP',
  targetSymbol: 'uBTC/tzBTC LP',
  unit: 'ubtctzbtcLP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 8,
  inputDecimalPlaces: 12
}

export const tzbtcwwbtcLP: Omit<Token, 'contractAddress'> = {
  id: 'tzbtcwwbtcLP',
  type: TokenType.FA1p2,
  name: 'tzBTC/wWBTC LP',
  shortName: 'tzBTC/wWBTC LP',
  decimals: 8,
  symbol: 'tzbtcwwbtcLP',
  targetSymbol: 'tzBTC/wWBTC LP',
  unit: 'tzbtcwwbtcLP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 8,
  inputDecimalPlaces: 8
}

export const uusdyouLP: Omit<Token, 'contractAddress'> = {
  id: 'uusdyouLP',
  type: TokenType.FA1p2,
  name: 'uUSD/YOU LP',
  shortName: 'uUSD/YOU LP',
  decimals: 12,
  symbol: 'uusdyouLP',
  targetSymbol: 'uUSD/YOU LP',
  unit: 'uusdyouLP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const uusdudefiLP: Omit<Token, 'contractAddress'> = {
  id: 'uusdudefiLP',
  type: TokenType.FA1p2,
  name: 'uUSD/uDEFI LP',
  shortName: 'uUSD/uDEFI LP',
  decimals: 12,
  symbol: 'uusdudefiLP',
  targetSymbol: 'uUSD/uDEFI LP',
  unit: 'uusdudefiLP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const uusdkusdLP: Omit<Token, 'contractAddress'> = {
  id: 'uusdkusdLP',
  type: TokenType.FA1p2,
  name: 'uUSD/kUSD LP',
  shortName: 'uUSD/kUSD LP',
  decimals: 18,
  symbol: 'uusdkusdLP',
  targetSymbol: 'uUSD/kUSD LP',
  unit: 'uusdkusdLP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const uusdusdtzLP: Omit<Token, 'contractAddress'> = {
  id: 'uusdusdtzLP',
  type: TokenType.FA1p2,
  name: 'uUSD/USDtz LP',
  shortName: 'uUSD/USDtz LP',
  decimals: 12,
  symbol: 'uusdusdtzLP',
  targetSymbol: 'uUSD/USDtz LP',
  unit: 'uusdusdtzLP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const uusdubtcLP: Omit<Token, 'contractAddress'> = {
  id: 'uusdubtcLP',
  type: TokenType.FA2,
  name: 'uUSD/uBTC LP',
  shortName: 'uUSD/uBTC LP',
  decimals: 6,
  symbol: 'uusdubtcLP',
  targetSymbol: 'uUSD/uBTC LP',
  unit: 'uusdubtcLP',
  impliedPrice: 1,
  tokenId: 21,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const uusdxtzLP: Omit<Token, 'contractAddress'> = {
  id: 'uusdxtzLP',
  type: TokenType.FA2,
  name: 'uUSD/XTZ LP',
  shortName: 'uUSD/XTZ LP',
  decimals: 6,
  symbol: 'uusdxtzLP',
  targetSymbol: 'uUSD/XTZ LP',
  unit: 'uusdxtzLP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const uxtzxtzLP: Omit<Token, 'contractAddress'> = {
  id: 'uxtzxtzLP',
  type: TokenType.FA2,
  name: 'uXTZ/XTZ LP',
  shortName: 'uXTZ/XTZ LP',
  decimals: 12, //TODO UXTZ
  symbol: 'uxtzxtzLP',
  targetSymbol: 'uXTZ/XTZ LP',
  unit: 'uxtzxtzLP',
  impliedPrice: 1,
  tokenId: 0, //TODO UXTZ
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}
export const uxtzusdtLP: Omit<Token, 'contractAddress'> = {
  id: 'uxtzusdtLP',
  type: TokenType.FA2,
  name: 'uXTZ/USDt LP',
  shortName: 'uXTZ/USDt LP',
  decimals: 12, //TODO UXTZ
  symbol: 'uxtzusdtLP',
  targetSymbol: 'uXTZ/USDt LP',
  unit: 'uxtzusdtLP',
  impliedPrice: 1,
  tokenId: 0, //TODO UXTZ
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const youxtzLP: Omit<Token, 'contractAddress'> = {
  id: 'youxtzLP',
  type: TokenType.FA2,
  name: 'YOU/XTZ LP',
  shortName: 'YOU/XTZ LP',
  decimals: 6,
  symbol: 'youxtzLP',
  targetSymbol: 'YOU/XTZ LP',
  unit: 'youxtzLP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const udefixtzLP: Omit<Token, 'contractAddress'> = {
  id: 'udefixtzLP',
  type: TokenType.FA2,
  name: 'uDEFI/XTZ LP',
  shortName: 'uDEFI/XTZ LP',
  decimals: 6,
  symbol: 'udefixtzLP',
  targetSymbol: 'uDEFI/XTZ LP',
  unit: 'udefixtzLP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const uusdquipuLP: Omit<Token, 'contractAddress'> = {
  id: 'uusdquipuLP',
  type: TokenType.FA2,
  name: 'uUSD/QUIPU LP',
  shortName: 'uUSD/QUIPU LP',
  decimals: 6,
  symbol: 'uusdquipuLP',
  targetSymbol: 'uUSD/QUIPU LP',
  unit: 'uusdquipuLP',
  impliedPrice: 1,
  tokenId: 7,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const uusdusdtLP: Omit<Token, 'contractAddress'> = {
  id: 'uusdusdtLP',
  type: TokenType.FA1p2,
  name: 'uUSD/USDt LP',
  shortName: 'uUSD/USDt LP',
  decimals: 12,
  symbol: 'uusdusdtLP',
  targetSymbol: 'uUSD/USDt LP',
  unit: 'uusdusdtLP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const uusdusdceLP: Omit<Token, 'contractAddress'> = {
  id: 'uusdusdceLP',
  type: TokenType.FA1p2,
  name: 'uUSD/USDC.e LP',
  shortName: 'uUSD/USDC.e LP',
  decimals: 12,
  symbol: 'uusdusdceLP',
  targetSymbol: 'uUSD/USDC.e LP',
  unit: 'uusdusdceLP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const ubtcwbtceLP: Omit<Token, 'contractAddress'> = {
  id: 'ubtcwbtceLP',
  type: TokenType.FA1p2,
  name: 'uBTC/WBTC.e LP',
  shortName: 'uBTC/WBTC.e LP',
  decimals: 12,
  symbol: 'ubtcwbtceLP',
  targetSymbol: 'uBTC/WBTC.e LP',
  unit: 'ubtcwbtceLP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 8,
  inputDecimalPlaces: 12
}

export const ctezcchfLP: Omit<Token, 'contractAddress'> = {
  id: 'ctezcchfLP',
  type: TokenType.FA2,
  name: 'ctez/cCHF LP',
  shortName: 'ctez/cCHF LP',
  decimals: 6,
  symbol: 'ctezcchfLP',
  targetSymbol: 'ctez/cCHF LP',
  unit: 'ctezcchfLP',
  impliedPrice: 1,
  tokenId: 1,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

export const ctezxtzLP: Omit<Token, 'contractAddress'> = {
  id: 'ctezxtzLP',
  type: TokenType.FA2,
  name: 'ctez/XTZ LP',
  shortName: 'ctez/XTZ LP',
  decimals: 6,
  symbol: 'ctezxtzLP',
  targetSymbol: 'ctez/XTZ LP',
  unit: 'ctezxtzLP',
  impliedPrice: 1,
  tokenId: 1,
  decimalPlaces: 2,
  inputDecimalPlaces: 4
}

//3route tokens

//example
// export const kussdToken: Omit<Token, 'contractAddress'> = {
//   id: 'kusd',
//   type: TokenType.FA1p2,
//   name: 'Kolibri USD',
//   shortName: 'kUSD',
//   decimals: 18,
//   symbol: 'kusd',
//   targetSymbol: 'kUSD',
//   unit: 'kUSD',
//   impliedPrice: 1,
//   tokenId: 0,
//   decimalPlaces: 2,
//   inputDecimalPlaces: 4
// }

export const ethtzToken: Omit<Token, 'contractAddress'> = {
  id: 'ETHtz',
  type: TokenType.FA1p2,
  name: 'ETHtez',
  shortName: 'ETHtz',
  decimals: 18,
  symbol: 'ETHtz',
  targetSymbol: 'ETHtz',
  unit: 'ETHtz',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 4
}

export const wxtzToken: Omit<Token, 'contractAddress'> = {
  id: 'wXTZ',
  type: TokenType.FA1p2,
  name: 'Wrapped Tezos',
  shortName: 'wXTZ',
  decimals: 6,
  symbol: 'wXTZ',
  targetSymbol: 'wXTZ',
  unit: 'wXTZ',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 5
}

export const kdaoToken: Omit<Token, 'contractAddress'> = {
  id: 'kDAO',
  type: TokenType.FA1p2,
  name: 'Kolibri DAO',
  shortName: 'kDAO',
  decimals: 18,
  symbol: 'kDAO',
  targetSymbol: 'kDAO',
  unit: 'kDAO',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 6
}

export const smakToken: Omit<Token, 'contractAddress'> = {
  id: 'SMAK',
  type: TokenType.FA1p2,
  name: 'Smartlink',
  shortName: 'SMAK',
  decimals: 18,
  symbol: 'SMAK',
  targetSymbol: 'SMAK',
  unit: 'SMAK',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 7
}

export const paulToken: Omit<Token, 'contractAddress'> = {
  id: 'PAUL',
  type: TokenType.FA1p2,
  name: 'Aliens Farm PAUL',
  shortName: 'PAUL',
  decimals: 8,
  symbol: 'PAUL',
  targetSymbol: 'PAUL',
  unit: 'PAUL',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 8
}

export const dogaToken: Omit<Token, 'contractAddress'> = {
  id: 'DOGA',
  type: TokenType.FA1p2,
  name: 'DOGAMÍ',
  shortName: 'DOGA',
  decimals: 5,
  symbol: 'DOGA',
  targetSymbol: 'DOGA',
  unit: 'DOGA',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 9
}

export const usdsToken: Omit<Token, 'contractAddress'> = {
  id: 'USDS',
  type: TokenType.FA2,
  name: 'Stably USD',
  shortName: 'USDS',
  decimals: 6,
  symbol: 'USDS',
  targetSymbol: 'USDS',
  unit: 'USDS',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 11
}

export const wrapToken: Omit<Token, 'contractAddress'> = {
  id: 'WRAP',
  type: TokenType.FA2,
  name: 'WRAP',
  shortName: 'WRAP',
  decimals: 6,
  symbol: 'WRAP',
  targetSymbol: 'WRAP',
  unit: 'WRAP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 13
}

export const unoToken: Omit<Token, 'contractAddress'> = {
  id: 'UNO',
  type: TokenType.FA2,
  name: 'Tezotopia Unobtanium',
  shortName: 'UNO',
  decimals: 9,
  symbol: 'UNO',
  targetSymbol: 'UNO',
  unit: 'UNO',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 15
}

export const hdaoToken: Omit<Token, 'contractAddress'> = {
  id: 'hDAO',
  type: TokenType.FA2,
  name: 'Hic et nunc DAO',
  shortName: 'hDAO',
  decimals: 6,
  symbol: 'hDAO',
  targetSymbol: 'hDAO',
  unit: 'hDAO',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 16
}

export const instaToken: Omit<Token, 'contractAddress'> = {
  id: 'INSTA',
  type: TokenType.FA2,
  name: 'Instaraise',
  shortName: 'INSTA',
  decimals: 9,
  symbol: 'INSTA',
  targetSymbol: 'INSTA',
  unit: 'INSTA',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 20
}

export const crunchToken: Omit<Token, 'contractAddress'> = {
  id: 'CRUNCH',
  type: TokenType.FA2,
  name: 'CRUNCH',
  shortName: 'CRUNCH',
  decimals: 8,
  symbol: 'CRUNCH',
  targetSymbol: 'CRUNCH',
  unit: 'CRUNCH',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 21
}

export const flameToken: Omit<Token, 'contractAddress'> = {
  id: 'FLAME',
  type: TokenType.FA2,
  name: 'FLAME',
  shortName: 'FLAME',
  decimals: 6,
  symbol: 'FLAME',
  targetSymbol: 'FLAME',
  unit: 'FLAME',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 22
}

export const gifToken: Omit<Token, 'contractAddress'> = {
  id: 'GIF',
  type: TokenType.FA2,
  name: 'GIF DAO',
  shortName: 'GIF',
  decimals: 9,
  symbol: 'GIF',
  targetSymbol: 'GIF',
  unit: 'GIF',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 23
}

export const kalamToken: Omit<Token, 'contractAddress'> = {
  id: 'KALAM',
  type: TokenType.FA2,
  name: 'Kalamint',
  shortName: 'KALAM',
  decimals: 10,
  symbol: 'KALAM',
  targetSymbol: 'KALAM',
  unit: 'KALAM',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 24
}

export const pxlToken: Omit<Token, 'contractAddress'> = {
  id: 'PXL',
  type: TokenType.FA2,
  name: 'Pixel Token',
  shortName: 'PXL',
  decimals: 6,
  symbol: 'PXL',
  targetSymbol: 'PXL',
  unit: 'PXL',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 25
}

export const crdaoToken: Omit<Token, 'contractAddress'> = {
  id: 'crDAO',
  type: TokenType.FA2,
  name: 'Crunchy DAO',
  shortName: 'crDAO',
  decimals: 8,
  symbol: 'crDAO',
  targetSymbol: 'crDAO',
  unit: 'crDAO',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 26
}

export const wtzToken: Omit<Token, 'contractAddress'> = {
  id: 'WTZ',
  type: TokenType.FA2,
  name: 'Wrapped Tezos',
  shortName: 'WTZ',
  decimals: 6,
  symbol: 'WTZ',
  targetSymbol: 'WTZ',
  unit: 'WTZ',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 27
}

export const wusdtToken: Omit<Token, 'contractAddress'> = {
  id: 'wUSDT',
  type: TokenType.FA2,
  name: 'Wrapped USDT',
  shortName: 'wUSDT',
  decimals: 6,
  symbol: 'wUSDT',
  targetSymbol: 'wUSDT',
  unit: 'wUSDT',
  impliedPrice: 1,
  tokenId: 18,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 29
}

export const wbusdToken: Omit<Token, 'contractAddress'> = {
  id: 'wBUSD',
  type: TokenType.FA2,
  name: 'Wrapped BUSD',
  shortName: 'wBUSD',
  decimals: 6,
  symbol: 'wBUSD',
  targetSymbol: 'wBUSD',
  unit: 'wBUSD',
  impliedPrice: 1,
  tokenId: 1,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 30
}

export const wpaxToken: Omit<Token, 'contractAddress'> = {
  id: 'wPAX',
  type: TokenType.FA2,
  name: 'Wrapped PAX',
  shortName: 'wPAX',
  decimals: 18,
  symbol: 'wPAX',
  targetSymbol: 'wPAX',
  unit: 'wPAX',
  impliedPrice: 1,
  tokenId: 14,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 31
}

export const wdaiToken: Omit<Token, 'contractAddress'> = {
  id: 'wDAI',
  type: TokenType.FA2,
  name: 'Wrapped DAI',
  shortName: 'wDAI',
  decimals: 18,
  symbol: 'wDAI',
  targetSymbol: 'wDAI',
  unit: 'wDAI',
  impliedPrice: 1,
  tokenId: 5,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 32
}

export const wwethToken: Omit<Token, 'contractAddress'> = {
  id: 'wWETH',
  type: TokenType.FA2,
  name: 'Wrapped WETH',
  shortName: 'wWETH',
  decimals: 18,
  symbol: 'wWETH',
  targetSymbol: 'wWETH',
  unit: 'wWETH',
  impliedPrice: 1,
  tokenId: 20,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 33
}

export const wmaticToken: Omit<Token, 'contractAddress'> = {
  id: 'wMATIC',
  type: TokenType.FA2,
  name: 'Wrapped MATIC',
  shortName: 'wMATIC',
  decimals: 18,
  symbol: 'wMATIC',
  targetSymbol: 'wMATIC',
  unit: 'wMATIC',
  impliedPrice: 1,
  tokenId: 11,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 35
}

export const wlinkToken: Omit<Token, 'contractAddress'> = {
  id: 'wLINK',
  type: TokenType.FA2,
  name: 'Wrapped LINK',
  shortName: 'wLINK',
  decimals: 18,
  symbol: 'wLINK',
  targetSymbol: 'wLINK',
  unit: 'wLINK',
  impliedPrice: 1,
  tokenId: 10,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 36
}

export const wuniToken: Omit<Token, 'contractAddress'> = {
  id: 'wUNI',
  type: TokenType.FA2,
  name: 'Wrapped UNI',
  shortName: 'wUNI',
  decimals: 18,
  symbol: 'wUNI',
  targetSymbol: 'wUNI',
  unit: 'wUNI',
  impliedPrice: 1,
  tokenId: 16,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 37
}

export const waaveToken: Omit<Token, 'contractAddress'> = {
  id: 'wAAVE',
  type: TokenType.FA2,
  name: 'Wrapped AAVE',
  shortName: 'wAAVE',
  decimals: 18,
  symbol: 'wAAVE',
  targetSymbol: 'wAAVE',
  unit: 'wAAVE',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 38
}

export const whusdToken: Omit<Token, 'contractAddress'> = {
  id: 'wHUSD',
  type: TokenType.FA2,
  name: 'Wrapped HUSD',
  shortName: 'wHUSD',
  decimals: 8,
  symbol: 'wHUSD',
  targetSymbol: 'wHUSD',
  unit: 'wHUSD',
  impliedPrice: 1,
  tokenId: 8,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 39
}

export const wetheToken: Omit<Token, 'contractAddress'> = {
  id: 'WETH.e',
  type: TokenType.FA2,
  name: 'Plenty Bridge WETH',
  shortName: 'WETH.e',
  decimals: 18,
  symbol: 'WETH.e',
  targetSymbol: 'WETH.e',
  unit: 'WETH.e',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 40
}

export const usdteToken: Omit<Token, 'contractAddress'> = {
  id: 'USDT.e',
  type: TokenType.FA2,
  name: 'Plenty Bridge USDT',
  shortName: 'USDT.e',
  decimals: 6,
  symbol: 'USDT.e',
  targetSymbol: 'USDT.e',
  unit: 'USDT.e',
  impliedPrice: 1,
  tokenId: 3,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 43
}

export const maticeToken: Omit<Token, 'contractAddress'> = {
  id: 'MATIC.e',
  type: TokenType.FA2,
  name: 'Plenty Bridge MATIC',
  shortName: 'MATIC.e',
  decimals: 18,
  symbol: 'MATIC.e',
  targetSymbol: 'MATIC.e',
  unit: 'MATIC.e',
  impliedPrice: 1,
  tokenId: 4,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 44
}

export const linkeToken: Omit<Token, 'contractAddress'> = {
  id: 'LINK.e',
  type: TokenType.FA2,
  name: 'Plenty Bridge LINK',
  shortName: 'LINK.e',
  decimals: 18,
  symbol: 'LINK.e',
  targetSymbol: 'LINK.e',
  unit: 'LINK.e',
  impliedPrice: 1,
  tokenId: 5,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 45
}

export const daieToken: Omit<Token, 'contractAddress'> = {
  id: 'DAI.e',
  type: TokenType.FA2,
  name: 'Plenty Bridge DAI',
  shortName: 'DAI.e',
  decimals: 18,
  symbol: 'DAI.e',
  targetSymbol: 'DAI.e',
  unit: 'DAI.e',
  impliedPrice: 1,
  tokenId: 6,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 46
}

export const busdeToken: Omit<Token, 'contractAddress'> = {
  id: 'BUSD.e',
  type: TokenType.FA2,
  name: 'Plenty Bridge BUSD',
  shortName: 'BUSD.e',
  decimals: 18,
  symbol: 'BUSD.e',
  targetSymbol: 'BUSD.e',
  unit: 'BUSD.e',
  impliedPrice: 1,
  tokenId: 7,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 47
}

export const eurlToken: Omit<Token, 'contractAddress'> = {
  id: 'EURL',
  type: TokenType.FA2,
  name: 'EURL',
  shortName: 'EURL',
  decimals: 6,
  symbol: 'EURL',
  targetSymbol: 'EURL',
  unit: 'EURL',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 50
}

export const ageureToken: Omit<Token, 'contractAddress'> = {
  id: 'AGEUR.e',
  type: TokenType.FA2,
  name: 'Plenty Bridge AGEUR',
  shortName: 'AGEUR.e',
  decimals: 18,
  symbol: 'AGEUR.e',
  targetSymbol: 'AGEUR.e',
  unit: 'AGEUR.e',
  impliedPrice: 1,
  tokenId: 8,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 51
}

export const wrcToken: Omit<Token, 'contractAddress'> = {
  id: 'WRC',
  type: TokenType.FA2,
  name: 'Werecoin',
  shortName: 'WRC',
  decimals: 18,
  symbol: 'WRC',
  targetSymbol: 'WRC',
  unit: 'WRC',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 52
}

export const mttrToken: Omit<Token, 'contractAddress'> = {
  id: 'MTTR',
  type: TokenType.FA2,
  name: 'Matter',
  shortName: 'MTTR',
  decimals: 12,
  symbol: 'MTTR',
  targetSymbol: 'MTTR',
  unit: 'MTTR',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 53
}

export const spiToken: Omit<Token, 'contractAddress'> = {
  id: 'SPI',
  type: TokenType.FA2,
  name: 'Spice Token',
  shortName: 'SPI',
  decimals: 6,
  symbol: 'SPI',
  targetSymbol: 'SPI',
  unit: 'SPI',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 54
}

export const rsalToken: Omit<Token, 'contractAddress'> = {
  id: 'RSAL',
  type: TokenType.FA2,
  name: 'Red Salsa',
  shortName: 'RSAL',
  decimals: 0,
  symbol: 'RSAL',
  targetSymbol: 'RSAL',
  unit: 'RSAL',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 55
}

export const sdaoToken: Omit<Token, 'contractAddress'> = {
  id: 'sDAO',
  type: TokenType.FA2,
  name: 'Salsa DAO',
  shortName: 'sDAO',
  decimals: 0,
  symbol: 'sDAO',
  targetSymbol: 'sDAO',
  unit: 'sDAO',
  impliedPrice: 1,
  tokenId: 1,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 56
}

export const btctzToken: Omit<Token, 'contractAddress'> = {
  id: 'BTCtz',
  type: TokenType.FA2,
  name: 'BTCtez',
  shortName: 'BTCtz',
  decimals: 8,
  symbol: 'BTCtz',
  targetSymbol: 'BTCtz',
  unit: 'BTCtz',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 57
}

export const mtriaToken: Omit<Token, 'contractAddress'> = {
  id: 'MTRIA',
  type: TokenType.FA2,
  name: 'Materia',
  shortName: 'MTRIA',
  decimals: 6,
  symbol: 'MTRIA',
  targetSymbol: 'MTRIA',
  unit: 'MTRIA',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 58
}

export const demnToken: Omit<Token, 'contractAddress'> = {
  id: 'DeMN',
  type: TokenType.FA2,
  name: 'DeMN',
  shortName: 'DeMN',
  decimals: 8,
  symbol: 'DeMN',
  targetSymbol: 'DeMN',
  unit: 'DeMN',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 59
}

export const minToken: Omit<Token, 'contractAddress'> = {
  id: 'MIN',
  type: TokenType.FA2,
  name: 'Tezotopia Minerals',
  shortName: 'MIN',
  decimals: 9,
  symbol: 'MIN',
  targetSymbol: 'MIN',
  unit: 'MIN',
  impliedPrice: 1,
  tokenId: 1,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 60
}

export const enrToken: Omit<Token, 'contractAddress'> = {
  id: 'ENR',
  type: TokenType.FA2,
  name: 'Tezotopia Energy',
  shortName: 'ENR',
  decimals: 9,
  symbol: 'ENR',
  targetSymbol: 'ENR',
  unit: 'ENR',
  impliedPrice: 1,
  tokenId: 2,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 61
}

export const mchToken: Omit<Token, 'contractAddress'> = {
  id: 'MCH',
  type: TokenType.FA2,
  name: 'Tezotopia Machinery',
  shortName: 'MCH',
  decimals: 9,
  symbol: 'MCH',
  targetSymbol: 'MCH',
  unit: 'MCH',
  impliedPrice: 1,
  tokenId: 3,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 62
}

export const upToken: Omit<Token, 'contractAddress'> = {
  id: 'UP',
  type: TokenType.FA1p2,
  name: 'Upsorber',
  shortName: 'UP',
  decimals: 0,
  symbol: 'UP',
  targetSymbol: 'UP',
  unit: 'UP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 63
}

export const abrToken: Omit<Token, 'contractAddress'> = {
  id: 'ABR',
  type: TokenType.FA2,
  name: 'Allbridge',
  shortName: 'ABR',
  decimals: 6,
  symbol: 'ABR',
  targetSymbol: 'ABR',
  unit: 'ABR',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 64
}

export const abbusdToken: Omit<Token, 'contractAddress'> = {
  id: 'abBUSD',
  type: TokenType.FA2,
  name: 'Allbridge Wrapped BUSD',
  shortName: 'abBUSD',
  decimals: 6,
  symbol: 'abBUSD',
  targetSymbol: 'abBUSD',
  unit: 'abBUSD',
  impliedPrice: 1,
  tokenId: 1,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 65
}

export const apusdcToken: Omit<Token, 'contractAddress'> = {
  id: 'apUSDC',
  type: TokenType.FA2,
  name: 'Allbridge Wrapped Polygon USDC',
  shortName: 'apUSDC',
  decimals: 6,
  symbol: 'apUSDC',
  targetSymbol: 'apUSDC',
  unit: 'apUSDC',
  impliedPrice: 1,
  tokenId: 2,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 66
}

export const wethpToken: Omit<Token, 'contractAddress'> = {
  id: 'WETH.p',
  type: TokenType.FA2,
  name: 'Polygon WETH',
  shortName: 'WETH.p',
  decimals: 18,
  symbol: 'WETH.p',
  targetSymbol: 'WETH.p',
  unit: 'WETH.p',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 67
}

export const wmaticpToken: Omit<Token, 'contractAddress'> = {
  id: 'WMATIC.p',
  type: TokenType.FA2,
  name: 'Polygon WMATIC',
  shortName: 'WMATIC.p',
  decimals: 18,
  symbol: 'WMATIC.p',
  targetSymbol: 'WMATIC.p',
  unit: 'WMATIC.p',
  impliedPrice: 1,
  tokenId: 1,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 68
}

export const tchickenToken: Omit<Token, 'contractAddress'> = {
  id: 'tChicken',
  type: TokenType.FA2,
  name: 'tChicken',
  shortName: 'tChicken',
  decimals: 6,
  symbol: 'tChicken',
  targetSymbol: 'tChicken',
  unit: 'tChicken',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 69
}

export const natasToken: Omit<Token, 'contractAddress'> = {
  id: 'NATAS',
  type: TokenType.FA2,
  name: 'NATAS',
  shortName: 'NATAS',
  decimals: 0,
  symbol: 'NATAS',
  targetSymbol: 'NATAS',
  unit: 'NATAS',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 70
}

export const wtacoToken: Omit<Token, 'contractAddress'> = {
  id: 'wTaco',
  type: TokenType.FA2,
  name: 'Wrapped Taco',
  shortName: 'wTaco',
  decimals: 0,
  symbol: 'wTaco',
  targetSymbol: 'wTaco',
  unit: 'wTaco',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 71
}

export const _3PToken: Omit<Token, 'contractAddress'> = {
  id: '3P',
  type: TokenType.FA2,
  name: '3P',
  shortName: '3P',
  decimals: 6,
  symbol: '3P',
  targetSymbol: '3P',
  unit: '3P',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 72
}

export const tcoinToken: Omit<Token, 'contractAddress'> = {
  id: 'TCOIN',
  type: TokenType.FA1p2,
  name: 'Trooperz Game TCOIN',
  shortName: 'TCOIN',
  decimals: 8,
  symbol: 'TCOIN',
  targetSymbol: 'TCOIN',
  unit: 'TCOIN',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 73
}

export const gsalToken: Omit<Token, 'contractAddress'> = {
  id: 'GSAL',
  type: TokenType.FA2,
  name: 'Green Salsa',
  shortName: 'GSAL',
  decimals: 8,
  symbol: 'GSAL',
  targetSymbol: 'GSAL',
  unit: 'GSAL',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 74
}

export const scasToken: Omit<Token, 'contractAddress'> = {
  id: 'sCAS',
  type: TokenType.FA2,
  name: 'sCasino Shares',
  shortName: 'sCAS',
  decimals: 0,
  symbol: 'sCAS',
  targetSymbol: 'sCAS',
  unit: 'sCAS',
  impliedPrice: 1,
  tokenId: 1,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 75
}

export const crnchyToken: Omit<Token, 'contractAddress'> = {
  id: 'CRNCHY',
  type: TokenType.FA2,
  name: 'CRNCHY (Crunchy.Network DAO Token)',
  shortName: 'CRNCHY',
  decimals: 8,
  symbol: 'CRNCHY',
  targetSymbol: 'CRNCHY',
  unit: 'CRNCHY',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 76
}

export const plyToken: Omit<Token, 'contractAddress'> = {
  id: 'PLY',
  type: TokenType.FA1p2,
  name: 'PLY',
  shortName: 'PLY',
  decimals: 18,
  symbol: 'PLY',
  targetSymbol: 'PLY',
  unit: 'PLY',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2,
  inputDecimalPlaces: 4,
  _3RouteId: 77
}
