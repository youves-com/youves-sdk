import { Token, TokenType } from './tokens/token'

export interface ExchangePair {
  token1: Token
  token2: Token
  dexType: DexType
  address: string
}

export interface CollateralInfo {
  token: Token
  TARGET_ORACLE_ADDRESS: string
  ORACLE_SYMBOL: string
  ENGINE_ADDRESS: string
  ENGINE_TYPE: EngineType
  OPTIONS_LISTING_ADDRESS: string
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

interface Assets {
  mainnet: AssetDefinition[]
  granadanet: AssetDefinition[]
  hangzhounet: AssetDefinition[]
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
  type: TokenType.NATIVE,
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
  type: TokenType.FA2,
  name: 'Youves Governance YOU',
  decimals: 12,
  symbol: 'YOU',
  targetSymbol: 'YOU',
  unit: 'YOU',
  impliedPrice: 1,
  tokenId: 0
}

const tzbtcLPToken: Omit<Token, 'contractAddress'> = {
  id: 'xtztzbtc',
  type: TokenType.FA1p2,
  name: 'XTZ/tzBTC Liquidity Baking Token',
  decimals: 12,
  symbol: 'xtztzbtc',
  targetSymbol: 'XTZ/tzBTC LP',
  unit: 'XTZ/tzBTC LP',
  impliedPrice: 1,
  tokenId: 0
}

const uusdToken: Omit<Token, 'contractAddress'> = {
  id: 'uUSD',
  type: TokenType.FA2,
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
  type: TokenType.FA2,
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
  type: TokenType.FA1p2,
  name: 'Plenty',
  decimals: 18,
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
    udefiToken: { ...udefiToken, contractAddress: 'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW' },
    plentyToken: { ...plentyToken, contractAddress: 'KT1GRSvLoikDsXujKgZPsGLX8k8VvR2Tq95b' }
  },
  granadanet: {
    xtzToken: { ...xtzToken, contractAddress: 'EMPTY' },
    youToken: { ...youToken, contractAddress: 'KT1JbCE1p9A6fH5aDvmp7qhHEXbtRY6mRibH' },
    uusdToken: { ...uusdToken, contractAddress: 'KT1L9iniM6swtx95o5SHUiFdG3rWxq8pfpHb' },
    udefiToken: { ...udefiToken, contractAddress: 'KT1L9iniM6swtx95o5SHUiFdG3rWxq8pfpHb' },
    plentyToken: { ...plentyToken, contractAddress: 'EMPTY' }
  },
  hangzhounet: {
    xtzToken: { ...xtzToken, contractAddress: 'EMPTY' },
    youToken: { ...youToken, contractAddress: 'KT1C2sbavT9BuMnKEBCm9bot6HSUuCKDfK3s' },
    tzbtcLP: { ...tzbtcLPToken, contractAddress: 'KT1DnNWZFWsLLFfXWJxfNnVMtaVqWBGgpzZt' },
    uusdToken: { ...uusdToken, contractAddress: 'KT1PiqMJSEsZkFruWMKMpoAmRVumKk9LavX3' },
    udefiToken: { ...udefiToken, contractAddress: 'KT1PiqMJSEsZkFruWMKMpoAmRVumKk9LavX3' },
    plentyToken: { ...plentyToken, contractAddress: 'EMPTY' }
  }
}

export const youDEXs = [
  {
    token1: tokens.mainnet.xtzToken,
    token2: tokens.mainnet.youToken,
    dexType: DexType.QUIPUSWAP,
    address: 'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE'
  },
  {
    token1: tokens.mainnet.uusdToken,
    token2: tokens.mainnet.youToken,
    dexType: DexType.PLENTY,
    address: 'KT1TnrLFrdemNZ1AnnWNfi21rXg7eknS484C'
  }
]

export const contracts: Assets = {
  mainnet: [
    {
      id: 'uUSD',
      symbol: 'uUSD',
      metadata: {
        targetSymbol: 'USD',
        impliedPrice: 1.25,
        new: false,
        doubleRewards: ''
      },
      collateralOptions: [
        {
          token: tokens.mainnet.xtzToken,
          TARGET_ORACLE_ADDRESS: 'KT1HjoLU8KAgQYszocVigHW8TxUb8ZsdGTog',
          ORACLE_SYMBOL: 'XTZ',
          ENGINE_ADDRESS: 'KT1FFE2LC5JpVakVjHm5mM36QVp2p3ZzH4hH',
          ENGINE_TYPE: EngineType.TRACKER_V1,
          OPTIONS_LISTING_ADDRESS: 'KT196gC9PWdv3bhrv3dUNeJ2w2UwY3xvbxMf'
        }
      ],
      token: tokens.mainnet.uusdToken,
      governanceToken: tokens.mainnet.youToken,
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
        },
        {
          token1: tokens.mainnet.youToken,
          token2: tokens.mainnet.uusdToken,
          dexType: DexType.PLENTY,
          address: 'KT1TnrLFrdemNZ1AnnWNfi21rXg7eknS484C'
        }
      ]
    },
    {
      id: 'uDEFI',
      symbol: 'uDEFI',
      metadata: {
        targetSymbol: 'DEFI',
        impliedPrice: 1.25,
        new: false,
        doubleRewards: ''
      },

      collateralOptions: [
        {
          token: tokens.mainnet.uusdToken,
          TARGET_ORACLE_ADDRESS: 'KT1UuqJiGQgfNrTK5tuR1wdYi5jJ3hnxSA55',
          ORACLE_SYMBOL: 'DEFI',
          ENGINE_ADDRESS: 'KT1B2GSe47rcMCZTRk294havTpyJ36JbgdeB',
          ENGINE_TYPE: EngineType.TRACKER_V2,
          OPTIONS_LISTING_ADDRESS: 'KT1N6dVHg5fPaJf4ZrFZsfdddjZ4qX9n1Fca'
        }
      ],

      token: tokens.mainnet.udefiToken,
      governanceToken: tokens.mainnet.youToken,
      REWARD_POOL_ADDRESS: 'KT1TFPn4ZTzmXDzikScBrWnHkoqTA7MBt9Gi',
      SAVINGS_POOL_ADDRESS: '',
      SAVINGS_V2_POOL_ADDRESS: 'KT1Kvg5eJVuYfTC1bU1bwWyn4e1PRGKAf6sy',
      SAVINGS_V2_VESTING_ADDRESS: 'KT1BLLj2GZN6VuiM1Vg8LNsPWzoZTUa3mYqq',
      VIEWER_CALLBACK_ADDRESS: 'KT1UAuApZKc1UrbKL27xa5B6XWxUgahLZpnX%set_address',
      GOVERNANCE_DEX: 'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
      DEX: [
        {
          token1: tokens.mainnet.xtzToken,
          token2: tokens.mainnet.udefiToken,
          dexType: DexType.QUIPUSWAP,
          address: 'KT1H8sJY2VzrbiX4pYeUVsoMUd4iGw2DV7XH'
        },
        {
          token1: tokens.mainnet.uusdToken,
          token2: tokens.mainnet.udefiToken,
          dexType: DexType.PLENTY,
          address: 'KT1EAw8hL5zseB3SLpJhBqPQfP9aWrWh8iMW'
        }
      ]
    }
  ],
  granadanet: [
    {
      id: 'uUSD',
      symbol: 'uUSD',
      metadata: {
        targetSymbol: 'USD',
        impliedPrice: 1.25,
        new: false,
        doubleRewards: ''
      },
      collateralOptions: [
        {
          token: tokens.granadanet.xtzToken,
          TARGET_ORACLE_ADDRESS: 'KT1A1s2FCyNG5qxhWFN9V4dhYSpYddwBDuj7',
          ORACLE_SYMBOL: 'XTZ',
          ENGINE_ADDRESS: 'KT1SgoxzCRKc3ZmsPK4DAxcqPwVhvSLgD9B6',
          ENGINE_TYPE: EngineType.TRACKER_V1,
          OPTIONS_LISTING_ADDRESS: 'KT1TT5kCb7QQXAYAhRoRqHgBR1DJyAK28cpg'
        }
      ],
      token: tokens.granadanet.uusdToken,
      governanceToken: tokens.granadanet.youToken,
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
      id: 'uDEFI',
      symbol: 'uDEFI',
      metadata: {
        targetSymbol: 'DEFI',
        impliedPrice: 1.25,
        new: false,
        doubleRewards: ''
      },

      collateralOptions: [
        {
          token: tokens.granadanet.uusdToken,
          TARGET_ORACLE_ADDRESS: 'KT1KtARrJiHCAL9B1nZejByahz3zvCcCgDF8',
          ORACLE_SYMBOL: 'DEFI',
          ENGINE_ADDRESS: 'KT1DGZhLzff2Nw9scEuUEEe8TeDpEh8Evcph',
          ENGINE_TYPE: EngineType.TRACKER_V2,
          OPTIONS_LISTING_ADDRESS: 'KT1WNXZHWHeaZkxDf5LxzPXSkePfCm3Z2sKJ'
        }
      ],
      token: tokens.granadanet.udefiToken,
      governanceToken: tokens.granadanet.youToken,
      REWARD_POOL_ADDRESS: 'KT1UcJ2kLCNfbFnfvpiaN8hVcFW2hCj8m9nC',
      SAVINGS_POOL_ADDRESS: '',
      SAVINGS_V2_POOL_ADDRESS: 'KT1Q2DL86QSgMYfGnCNxDxFyQ3xshvHfoBwg',
      SAVINGS_V2_VESTING_ADDRESS: 'KT1DZDAay31bs4iLJMf8WyFy4NAy5d4pDf4q',
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
  ],
  hangzhounet: [
    {
      id: 'uUSD',
      symbol: 'uUSD',
      metadata: {
        targetSymbol: 'USD',
        impliedPrice: 1.25,
        new: false,
        doubleRewards: ''
      },
      collateralOptions: [
        {
          token: tokens.hangzhounet.xtzToken,
          TARGET_ORACLE_ADDRESS: 'KT1KDrE5XfWxrSTY1d9P8Z7iCxThxiWWZzRb',
          ORACLE_SYMBOL: 'XTZ',
          ENGINE_ADDRESS: 'KT1MBu8ZU2gRdkC4Ahg54Zc33Q8CrT2ZVmnB',
          ENGINE_TYPE: EngineType.TRACKER_V1,
          OPTIONS_LISTING_ADDRESS: 'KT1HAT9FSkzA3mDqg3MwX5Eyh7qMTDsxNVm9'
        },
        {
          token: tokens.hangzhounet.tzbtcLP,
          TARGET_ORACLE_ADDRESS: 'KT1KDrE5XfWxrSTY1d9P8Z7iCxThxiWWZzRb',
          ORACLE_SYMBOL: 'BTC',
          ENGINE_ADDRESS: 'KT1LHhNhxa7sPXtUmie7p6VbLiCtyYbU5GF8',
          ENGINE_TYPE: EngineType.TRACKER_V2,
          OPTIONS_LISTING_ADDRESS: 'KT1PB4pFRGLLdhgfLjfZ9TKc13Ev6Mznh5TQ'
        }
      ],
      token: tokens.hangzhounet.uusdToken,
      governanceToken: tokens.hangzhounet.youToken,
      REWARD_POOL_ADDRESS: 'KT1Dozui62izZxQn1XVeatkgMyqGSaykb1AC',
      SAVINGS_POOL_ADDRESS: '',
      SAVINGS_V2_POOL_ADDRESS: 'KT1Wc6yZMfoy2kkdZAf8mQJhBku2AdcY4Jhv',
      SAVINGS_V2_VESTING_ADDRESS: 'KT1GhDTCjpTbgZjav7CSfK2LY4ehUrYV4n1r',
      VIEWER_CALLBACK_ADDRESS: 'KT1E4MTnEKVv9dX5RovpfW2ND2NRHYHa4RVL%set_address',
      GOVERNANCE_DEX: 'KT1D6DLJgG4kJ7A5JgT4mENtcQh9Tp3BLMVQ',
      DEX: [
        {
          token1: tokens.hangzhounet.xtzToken,
          token2: tokens.hangzhounet.uusdToken,
          dexType: DexType.QUIPUSWAP,
          address: 'KT1DYx1uoEfKKYhJm4gAZBBHpuWVzwMzWdCV'
        },
        {
          token1: tokens.hangzhounet.udefiToken,
          token2: tokens.hangzhounet.uusdToken,
          dexType: DexType.PLENTY,
          address: ''
        }
      ]
    },
    {
      id: 'uDEFI',
      symbol: 'uDEFI',
      metadata: {
        targetSymbol: 'DEFI',
        impliedPrice: 1.25,
        new: false,
        doubleRewards: ''
      },

      collateralOptions: [
        {
          token: tokens.hangzhounet.uusdToken,
          TARGET_ORACLE_ADDRESS: 'KT1KDrE5XfWxrSTY1d9P8Z7iCxThxiWWZzRb',
          ORACLE_SYMBOL: 'DEFI',
          ENGINE_ADDRESS: 'KT1AzpPgkZ7QK1MTe14H8eKPPKzrBW3Npvy6',
          ENGINE_TYPE: EngineType.TRACKER_V2,
          OPTIONS_LISTING_ADDRESS: 'KT1FK1i7QYK7X7252nqCzf5pcicxC33FZ1v8'
        }
      ],
      token: tokens.hangzhounet.udefiToken,
      governanceToken: tokens.hangzhounet.youToken,
      REWARD_POOL_ADDRESS: 'KT1Cbx4bcPwnyZKVVPfu422mzvbydrJkv48f',
      SAVINGS_POOL_ADDRESS: '',
      SAVINGS_V2_POOL_ADDRESS: 'KT1NY67v4iyM2tHXkBLPed69GqyvMEF6sano',
      SAVINGS_V2_VESTING_ADDRESS: 'KT1GHhJPha7pVSsMhAsjGMxmn3YMvyFrKbsX',
      VIEWER_CALLBACK_ADDRESS: 'KT1E4MTnEKVv9dX5RovpfW2ND2NRHYHa4RVL%set_address',
      GOVERNANCE_DEX: 'KT1D6DLJgG4kJ7A5JgT4mENtcQh9Tp3BLMVQ',
      DEX: [
        {
          token1: tokens.hangzhounet.xtzToken,
          token2: tokens.hangzhounet.udefiToken,
          dexType: DexType.QUIPUSWAP,
          address: 'KT1RgmsYqUSDdsQUhEmf4sKiBKWAX6KsVwkn'
        },
        {
          token1: tokens.hangzhounet.uusdToken,
          token2: tokens.hangzhounet.udefiToken,
          dexType: DexType.PLENTY,
          address: ''
        }
      ]
    }
  ]
}
