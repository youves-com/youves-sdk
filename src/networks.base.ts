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
}

export interface FlatYouvesExchangeInfo {
  token1: Token
  token2: Token
  dexType: DexType.FLAT_CURVE
  contractAddress: string
  liquidityToken: Token
}

export type ExchangePair =
  | {
      token1: Token
      token2: Token
      dexType: DexType.QUIPUSWAP
      address: string
    }
  | {
      token1: Token
      token2: Token
      dexType: DexType.PLENTY
      address: string
    }
  | FlatYouvesExchangeInfo

export interface CollateralInfo {
  token: Token
  TARGET_ORACLE_ADDRESS: string
  TARGET_ORACLE_DECIMALS: number
  ORACLE_SYMBOL: string
  ENGINE_ADDRESS: string
  ENGINE_TYPE: EngineType
  OPTIONS_LISTING_ADDRESS: string
  SUPPORTS_BAILOUT: boolean
  HAS_OBSERVED_PRICE: boolean
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
}
export interface Assets {
  mainnet: AssetDefinition[]
  hangzhounet: AssetDefinition[]
}

export type AssetField = 'uUSD' | 'uDEFI' | 'uBTC'

export enum EngineType {
  TRACKER_V1 = 'tracker-v1',
  TRACKER_V2 = 'tracker-v2',
  CHECKER_V1 = 'checker'
}

export enum DexType {
  QUIPUSWAP = 'quipuswap',
  PLENTY = 'plenty',
  FLAT_CURVE = 'flat_curve'
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
  inputDecimalPlaces: 4
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
  inputDecimalPlaces: 4
}

export const tzbtcLPToken: Omit<Token, 'contractAddress'> = {
  id: 'xtztzbtc',
  type: TokenType.FA1p2,
  name: 'XTZ/tzBTC Liquidity Baking Token',
  shortName: 'tzBTC LB',
  decimals: 0,
  symbol: 'xtztzbtc',
  targetSymbol: 'XTZ/tzBTC LP',
  unit: 'XTZ/tzBTC LP',
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
  decimalPlaces: 6,
  inputDecimalPlaces: 8
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
  inputDecimalPlaces: 4
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
  inputDecimalPlaces: 4
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
  inputDecimalPlaces: 4
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
  inputDecimalPlaces: 4
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
  decimalPlaces: 6,
  inputDecimalPlaces: 8
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
  inputDecimalPlaces: 4
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
  inputDecimalPlaces: 4
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
  inputDecimalPlaces: 4
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
  decimalPlaces: 6,
  inputDecimalPlaces: 8
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
  decimalPlaces: 2,
  inputDecimalPlaces: 4
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
  decimalPlaces: 2,
  inputDecimalPlaces: 4
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
