import { Token } from './tokens/token'

export interface ExchangePair {
  token1: Token
  token2: Token
  dexType: DexType
  address: string
}

export type Contracts = {
  symbol: AssetField
  collateralToken: Token
  token: Token
  TARGET_ORACLE_ADDRESS: string
  TOKEN_ADDRESS: string
  TOKEN_ID: string
  ENGINE_ADDRESS: string
  ENGINE_TYPE: EngineType
  GOVERNANCE_TOKEN_ADDRESS: string
  OPTIONS_LISTING_ADDRESS: string
  REWARD_POOL_ADDRESS: string
  SAVINGS_POOL_ADDRESS: string
  SAVINGS_V2_POOL_ADDRESS: string
  SAVINGS_V2_VESTING_ADDRESS: string
  VIEWER_CALLBACK_ADDRESS: string
  GOVERNANCE_DEX: string
  DEX: ExchangePair[]
}

interface Assets {
  mainnet: Contracts[]
  granadanet: Contracts[]
}

export type AssetField = 'uUSD' | 'uDEFI'

export enum EngineType {
  TRACKER_V1 = 'tracker-v1',
  TRACKER_V2 = 'tracker-v2',
  CHECKER_V1 = 'checker'
}

export enum DexType {
  QUIPUSWAP = 'quipuswap',
  PLENTY = 'plenty'
}

const xtzToken: Omit<Token, 'contractAddress'> = {
  id: 'tez',
  name: 'Tezos',
  decimals: 6,
  symbol: 'tez',
  targetSymbol: 'tez',
  unit: 'tez',
  impliedPrice: 1,
  tokenId: 0
}

const youToken: Omit<Token, 'contractAddress'> = {
  id: 'YOU',
  name: 'Youves Governance YOU',
  decimals: 12,
  symbol: 'YOU',
  targetSymbol: 'YOU',
  unit: 'YOU',
  impliedPrice: 1,
  tokenId: 0
}

const uusdToken: Omit<Token, 'contractAddress'> = {
  id: 'uUSD',
  name: 'youves uUSD',
  decimals: 12,
  symbol: 'uUSD',
  targetSymbol: 'USD',
  unit: 'uUSD',
  impliedPrice: 1.25,
  tokenId: 0
}

const udefiToken: Omit<Token, 'contractAddress'> = {
  id: 'uDEFI',
  name: 'youves uDEFI',
  decimals: 12,
  symbol: 'uDEFI',
  targetSymbol: 'DEFI',
  unit: 'uDEFI',
  impliedPrice: 1.25,
  tokenId: 1
}

const plentyToken: Omit<Token, 'contractAddress'> = {
  id: 'plenty',
  name: 'Plenty',
  decimals: 18, // TODO: ???
  symbol: 'plenty',
  targetSymbol: 'plenty',
  unit: 'plenty',
  impliedPrice: 1,
  tokenId: 0
}

export const tokens = {
  mainnet: {
    xtzToken: { ...xtzToken, contractAddress: 'EMPTY' },
    youToken: { ...youToken, contractAddress: 'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL' },
    uusdToken: { ...uusdToken, contractAddress: 'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW' },
    plentyToken: { ...plentyToken, contractAddress: 'EMPTY' }
  },
  granadanet: {
    xtzToken: { ...xtzToken, contractAddress: 'EMPTY' },
    youToken: { ...youToken, contractAddress: 'KT1JbCE1p9A6fH5aDvmp7qhHEXbtRY6mRibH' },
    uusdToken: { ...uusdToken, contractAddress: 'KT1L9iniM6swtx95o5SHUiFdG3rWxq8pfpHb' },
    udefiToken: { ...udefiToken, contractAddress: 'KT1L9iniM6swtx95o5SHUiFdG3rWxq8pfpHb' },
    plentyToken: { ...plentyToken, contractAddress: 'EMPTY' }
  }
}

export const contracts: Assets = {
  mainnet: [
    {
      symbol: 'uUSD',
      collateralToken: tokens.mainnet.xtzToken,
      token: tokens.mainnet.uusdToken,
      TARGET_ORACLE_ADDRESS: 'KT1HjoLU8KAgQYszocVigHW8TxUb8ZsdGTog',
      TOKEN_ADDRESS: 'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
      TOKEN_ID: '0',
      ENGINE_ADDRESS: 'KT1FFE2LC5JpVakVjHm5mM36QVp2p3ZzH4hH',
      ENGINE_TYPE: EngineType.TRACKER_V1,
      GOVERNANCE_TOKEN_ADDRESS: 'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
      OPTIONS_LISTING_ADDRESS: 'KT1RkQaK5X84deBAT6sXJ2VLs7zN4pM7Y3si',
      REWARD_POOL_ADDRESS: 'KT1Lz5S39TMHEA7izhQn8Z1mQoddm6v1jTwH',
      SAVINGS_POOL_ADDRESS: 'KT1M8asPmVQhFG6yujzttGonznkghocEkbFk',
      SAVINGS_V2_POOL_ADDRESS: 'KT1TMfRfmJ5mkJEXZGRCsqLHn2rgnV1SdUzb',
      SAVINGS_V2_VESTING_ADDRESS: 'KT1A1VNTvyqJYZN2FypF2kiTBPdoRvG9sCA7',
      VIEWER_CALLBACK_ADDRESS: 'KT1UAuApZKc1UrbKL27xa5B6XWxUgahLZpnX%set_address',
      GOVERNANCE_DEX: 'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
      DEX: [
        {
          token1: tokens.mainnet.xtzToken,
          token2: tokens.mainnet.uusdToken,
          dexType: DexType.QUIPUSWAP,
          address: 'KT1EtjRRCBC2exyCRXz8UfV7jz7svnkqi7di'
        }
      ]
    }
    // {
    //   symbol: 'uDEFI',
    //   token: udefiToken,
    //   TARGET_ORACLE_ADDRESS: 'KT1HjoLU8KAgQYszocVigHW8TxUb8ZsdGTog',
    //   TOKEN_ADDRESS: 'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
    //   TOKEN_ID: '1',
    //   ENGINE_ADDRESS: 'KT1FFE2LC5JpVakVjHm5mM36QVp2p3ZzH4hH',
    //   ENGINE_TYPE: EngineType.TRACKER_V2,
    //   GOVERNANCE_TOKEN_ADDRESS: 'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
    //   OPTIONS_LISTING_ADDRESS: 'KT1RkQaK5X84deBAT6sXJ2VLs7zN4pM7Y3si',
    //   REWARD_POOL_ADDRESS: 'KT1Lz5S39TMHEA7izhQn8Z1mQoddm6v1jTwH',
    //   SAVINGS_POOL_ADDRESS: 'KT1M8asPmVQhFG6yujzttGonznkghocEkbFk',
    //   VIEWER_CALLBACK_ADDRESS: 'KT1UAuApZKc1UrbKL27xa5B6XWxUgahLZpnX%set_address',
    //   GOVERNANCE_DEX: 'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
    //   DEX: [
    //     {
    //       token1: xtzToken,
    //       token2: udefiToken,
    //       dexType: DexType.QUIPUSWAP,
    //       address: 'KT1EtjRRCBC2exyCRXz8UfV7jz7svnkqi7di'
    //     }
    //   ]
    // }
  ],
  granadanet: [
    {
      symbol: 'uUSD',
      collateralToken: tokens.granadanet.xtzToken,
      token: tokens.granadanet.uusdToken,
      TARGET_ORACLE_ADDRESS: 'KT1A1s2FCyNG5qxhWFN9V4dhYSpYddwBDuj7',
      TOKEN_ADDRESS: 'KT1L9iniM6swtx95o5SHUiFdG3rWxq8pfpHb',
      TOKEN_ID: '0',
      ENGINE_ADDRESS: 'KT1SgoxzCRKc3ZmsPK4DAxcqPwVhvSLgD9B6',
      ENGINE_TYPE: EngineType.TRACKER_V1,
      GOVERNANCE_TOKEN_ADDRESS: 'KT1JbCE1p9A6fH5aDvmp7qhHEXbtRY6mRibH',
      OPTIONS_LISTING_ADDRESS: 'KT1TT5kCb7QQXAYAhRoRqHgBR1DJyAK28cpg',
      REWARD_POOL_ADDRESS: 'KT1FXftd9mDLbZnc1YxrsX5kePoCxgb7cYHT',
      SAVINGS_POOL_ADDRESS: 'KT1Npj6gJqLejJScFJRoJTsNCYSc4FxAxLZ2',
      SAVINGS_V2_POOL_ADDRESS: 'KT1RAKgwAkR3ezZEP8LQB6ApXhRUPegTPdjg',
      SAVINGS_V2_VESTING_ADDRESS: 'KT19yG5moJn9H3afV3MvaNdickHBfpG9CHx8',
      VIEWER_CALLBACK_ADDRESS: 'KT1BsxQutEW7tKd1X5KuNAKptMZca9gCdetb%set_address',
      GOVERNANCE_DEX: 'KT1Mw43GDjXPT6uJVP9zEjfnQxgWbK55EECe',
      DEX: [
        {
          token1: tokens.granadanet.xtzToken,
          token2: tokens.granadanet.uusdToken,
          dexType: DexType.QUIPUSWAP,
          address: 'KT1Kc7MrMeN4AgSpD25ZMgFmgMdo1Yqhp8wL'
        },
        {
          token1: tokens.granadanet.udefiToken,
          token2: tokens.granadanet.uusdToken,
          dexType: DexType.PLENTY,
          address: 'KT1JaMo7uUpgysvi1Mr6Uaw5rrT7eqc6LHy5'
        }
      ]
    },
    {
      symbol: 'uDEFI',
      collateralToken: tokens.granadanet.uusdToken,
      token: tokens.granadanet.udefiToken,
      TARGET_ORACLE_ADDRESS: 'KT1Ngc9Zd2L7Nttap8yrYELJ7TZwSPS5Xynh',
      TOKEN_ADDRESS: 'KT1L9iniM6swtx95o5SHUiFdG3rWxq8pfpHb',
      TOKEN_ID: '1',
      ENGINE_ADDRESS: 'KT1TgrwiZawrf3zcWm2WnjVyNnpydoKVgrU1',
      ENGINE_TYPE: EngineType.TRACKER_V2,
      GOVERNANCE_TOKEN_ADDRESS: 'KT1JbCE1p9A6fH5aDvmp7qhHEXbtRY6mRibH',
      OPTIONS_LISTING_ADDRESS: 'KT1MAKF7YF1Xsmcmq9tNvGmJivAbPHrDe58j',
      REWARD_POOL_ADDRESS: 'KT1ViUQD7bMLYFvXSmPFvP2X11g6wMspwb7C',
      SAVINGS_POOL_ADDRESS: '',
      SAVINGS_V2_POOL_ADDRESS: 'KT1UpWBcEXDaiRREJ53t4rho9deoKQjNvbob',
      SAVINGS_V2_VESTING_ADDRESS: 'KT19yG5moJn9H3afV3MvaNdickHBfpG9CHx8',
      VIEWER_CALLBACK_ADDRESS: 'KT1BsxQutEW7tKd1X5KuNAKptMZca9gCdetb%set_address',
      GOVERNANCE_DEX: 'KT1Mw43GDjXPT6uJVP9zEjfnQxgWbK55EECe',
      DEX: [
        {
          token1: tokens.granadanet.xtzToken,
          token2: tokens.granadanet.udefiToken,
          dexType: DexType.QUIPUSWAP,
          address: 'KT1SxFN15bT4TtxdJQ5s9TLA9arYE3dk5ay7'
        },
        {
          token1: tokens.granadanet.uusdToken,
          token2: tokens.granadanet.udefiToken,
          dexType: DexType.PLENTY,
          address: 'KT1JaMo7uUpgysvi1Mr6Uaw5rrT7eqc6LHy5'
        }
      ]
    }
  ]
}
