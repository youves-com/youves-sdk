import { AssetDefinition, DexType, EngineType, plentyToken, udefiToken, uusdToken, xtzToken, youToken } from './networks.base'

export const granadanetTokens = {
  xtzToken: { ...xtzToken, contractAddress: 'EMPTY' },
  youToken: { ...youToken, contractAddress: 'KT1JbCE1p9A6fH5aDvmp7qhHEXbtRY6mRibH' },
  uusdToken: { ...uusdToken, contractAddress: 'KT1L9iniM6swtx95o5SHUiFdG3rWxq8pfpHb' },
  udefiToken: { ...udefiToken, contractAddress: 'KT1L9iniM6swtx95o5SHUiFdG3rWxq8pfpHb' },
  plentyToken: { ...plentyToken, contractAddress: 'EMPTY' }
}

export const granadanetContracts: AssetDefinition[] = [
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
        token: granadanetTokens.xtzToken,
        TARGET_ORACLE_ADDRESS: 'KT1A1s2FCyNG5qxhWFN9V4dhYSpYddwBDuj7',
        ORACLE_SYMBOL: 'XTZ',
        ENGINE_ADDRESS: 'KT1SgoxzCRKc3ZmsPK4DAxcqPwVhvSLgD9B6',
        ENGINE_TYPE: EngineType.TRACKER_V1,
        OPTIONS_LISTING_ADDRESS: 'KT1TT5kCb7QQXAYAhRoRqHgBR1DJyAK28cpg',
        SUPPORTS_BAILOUT: true,
        HAS_OBSERVED_PRICE: true
      }
    ],
    token: granadanetTokens.uusdToken,
    governanceToken: granadanetTokens.youToken,
    REWARD_POOL_ADDRESS: 'KT1FXftd9mDLbZnc1YxrsX5kePoCxgb7cYHT',
    SAVINGS_POOL_ADDRESS: 'KT1Npj6gJqLejJScFJRoJTsNCYSc4FxAxLZ2',
    SAVINGS_V2_POOL_ADDRESS: 'KT1RAKgwAkR3ezZEP8LQB6ApXhRUPegTPdjg',
    SAVINGS_V2_VESTING_ADDRESS: 'KT19yG5moJn9H3afV3MvaNdickHBfpG9CHx8',
    VIEWER_CALLBACK_ADDRESS: 'KT1BsxQutEW7tKd1X5KuNAKptMZca9gCdetb%set_address',
    GOVERNANCE_DEX: 'KT1Mw43GDjXPT6uJVP9zEjfnQxgWbK55EECe',
    DEX: [
      {
        token1: granadanetTokens.xtzToken,
        token2: granadanetTokens.uusdToken,
        dexType: DexType.QUIPUSWAP,
        address: 'KT1Kc7MrMeN4AgSpD25ZMgFmgMdo1Yqhp8wL'
      },
      {
        token1: granadanetTokens.udefiToken,
        token2: granadanetTokens.uusdToken,
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
        token: granadanetTokens.uusdToken,
        TARGET_ORACLE_ADDRESS: 'KT1KtARrJiHCAL9B1nZejByahz3zvCcCgDF8',
        ORACLE_SYMBOL: 'DEFI',
        ENGINE_ADDRESS: 'KT1DGZhLzff2Nw9scEuUEEe8TeDpEh8Evcph',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1WNXZHWHeaZkxDf5LxzPXSkePfCm3Z2sKJ',
        SUPPORTS_BAILOUT: true,
        HAS_OBSERVED_PRICE: true
      }
    ],
    token: granadanetTokens.udefiToken,
    governanceToken: granadanetTokens.youToken,
    REWARD_POOL_ADDRESS: 'KT1UcJ2kLCNfbFnfvpiaN8hVcFW2hCj8m9nC',
    SAVINGS_POOL_ADDRESS: '',
    SAVINGS_V2_POOL_ADDRESS: 'KT1Q2DL86QSgMYfGnCNxDxFyQ3xshvHfoBwg',
    SAVINGS_V2_VESTING_ADDRESS: 'KT1DZDAay31bs4iLJMf8WyFy4NAy5d4pDf4q',
    VIEWER_CALLBACK_ADDRESS: 'KT1BsxQutEW7tKd1X5KuNAKptMZca9gCdetb%set_address',
    GOVERNANCE_DEX: 'KT1Mw43GDjXPT6uJVP9zEjfnQxgWbK55EECe',
    DEX: [
      {
        token1: granadanetTokens.xtzToken,
        token2: granadanetTokens.udefiToken,
        dexType: DexType.QUIPUSWAP,
        address: 'KT1SxFN15bT4TtxdJQ5s9TLA9arYE3dk5ay7'
      },
      {
        token1: granadanetTokens.uusdToken,
        token2: granadanetTokens.udefiToken,
        dexType: DexType.PLENTY,
        address: 'KT1JaMo7uUpgysvi1Mr6Uaw5rrT7eqc6LHy5'
      }
    ]
  }
]
