import { Token, TokenType } from './tokens/token'

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
  VIEWER_CALLBACK_ADDRESS: string
  GOVERNANCE_DEX: string
  DEX: ExchangePair[]
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
  decimalPlaces: 2
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
  decimalPlaces: 2
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
  decimalPlaces: 2
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
  decimalPlaces: 2
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
  decimalPlaces: 2
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
  decimalPlaces: 6
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
  decimalPlaces: 2
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
  decimalPlaces: 2
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
  decimalPlaces: 6
}

export const uusdwusdcLP: Omit<Token, 'contractAddress'> = {
  id: 'uusdwusdcLP',
  type: TokenType.FA2,
  name: 'uUSD/wUSDC LP',
  shortName: 'uUSD/wUSDC LP',
  decimals: 12,
  symbol: 'uusdwusdcLP',
  targetSymbol: 'uUSD/wUSDC LP',
  unit: 'uusdwusdcLP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2
}

export const ubtcwwbtcLP: Omit<Token, 'contractAddress'> = {
  id: 'ubtcwwbtcLP',
  type: TokenType.FA2,
  name: 'uBTC/wWBTC LP',
  shortName: 'uBTC/wWBTC LP',
  decimals: 12,
  symbol: 'ubtcwwbtcLP',
  targetSymbol: 'uBTC/wWBTC LP',
  unit: 'ubtcwwbtcLP',
  impliedPrice: 1,
  tokenId: 0,
  decimalPlaces: 2
}
