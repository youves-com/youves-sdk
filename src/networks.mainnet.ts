import {
  AssetDefinition,
  DexType,
  EngineType,
  ExchangePair,
  Farm,
  FarmType,
  kusdToken,
  NetworkConstants,
  plentyToken,
  quipuToken,
  tzbtcLPToken,
  tzbtcToken,
  tzbtcwwbtcLP,
  ubtcToken,
  ubtctzbtcLP,
  udefiToken,
  usdtzToken,
  uusdkusdLP,
  uusdquipuLP,
  uusdToken,
  uusdubtcLP,
  uusdudefiLP,
  uusdusdtzLP,
  uusdwusdcLP,
  uusdxtzLP,
  uusdyouLP,
  wusdc,
  wwbtc,
  xtzToken,
  youToken
} from './networks.base'
import { Token } from './tokens/token'

export const mainnetTokens: Record<string, Token> = {
  xtzToken: { ...xtzToken, contractAddress: 'EMPTY' },
  youToken: { ...youToken, contractAddress: 'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL' },
  uusdToken: { ...uusdToken, contractAddress: 'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW' },
  udefiToken: { ...udefiToken, contractAddress: 'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW' },
  ubtcToken: { ...ubtcToken, contractAddress: 'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW' },
  tzbtcToken: { ...tzbtcToken, contractAddress: 'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn' },
  kusdToken: { ...kusdToken, contractAddress: 'KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV' },
  usdtzToken: { ...usdtzToken, contractAddress: 'KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9' },
  wusdcToken: { ...wusdc, contractAddress: 'KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ' },
  wwbtcToken: { ...wwbtc, contractAddress: 'KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ' },
  plentyToken: { ...plentyToken, contractAddress: 'KT1GRSvLoikDsXujKgZPsGLX8k8VvR2Tq95b' },
  quipuToken: { ...quipuToken, contractAddress: 'KT193D4vozYnhGJQVtw7CoxxqphqUEEwK6Vb' },
  tzbtcLP: { ...tzbtcLPToken, contractAddress: 'KT1AafHA1C1vk959wvHWBispY9Y2f3fxBUUo' },
  uusdwusdcLP: { ...uusdwusdcLP, contractAddress: 'KT1Exm6UTCNEbBHANZ7S53t7QN8NJFwAytxg' },
  tzbtcwwbtcLP: { ...tzbtcwwbtcLP, contractAddress: 'KT1CuqpjqPPvcZCrvzJunCvHvPaujASdmFJZ' },
  ubtctzbtcLP: { ...ubtctzbtcLP, contractAddress: 'KT1TzHdwC4KHbGxsXVVvaxdrjVPgUsrHEgJr' },
  uusdkusdLP: { ...uusdkusdLP, contractAddress: 'KT1NZt7NTYs7m3VhB8rrua7WwVQ9uhKgpgCN' },
  uusdusdtzLP: { ...uusdusdtzLP, contractAddress: 'KT1Toztq42271zT2wXDnu2hFVVdJJ8qWrETu' },
  uusdubtcLP: { ...uusdubtcLP, contractAddress: 'KT1VNEzpf631BLsdPJjt2ZhgUitR392x6cSi' },
  uusdyouLP: { ...uusdyouLP, contractAddress: 'KT1Tmncfgpp4ZSp6aEogL7uhBqHTiKsSPegK' },
  uusdudefiLP: { ...uusdudefiLP, contractAddress: 'KT1RQvdYD9yc763j8FiVLyXbKPVVbZqGRx5m' },
  uusdxtzLP: { ...uusdxtzLP, contractAddress: 'KT1EtjRRCBC2exyCRXz8UfV7jz7svnkqi7di' },
  uusdquipuLP: { ...uusdquipuLP, contractAddress: 'KT1VNEzpf631BLsdPJjt2ZhgUitR392x6cSi' }
}

export const mainnetFarms: Farm[] = [
  {
    type: FarmType.NO_LOCK,
    token1: mainnetTokens.wusdcToken,
    token2: mainnetTokens.uusdToken,
    lpToken: mainnetTokens.uusdwusdcLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1TkNadQ9Cw5ZNRyS4t9SKmUbmAMkqY8bkV',
    expectedWeeklyRewards: 1250,
    dexType: DexType.FLAT_CURVE
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.ubtcToken,
    lpToken: mainnetTokens.uusdubtcLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1KGfEyxBeCU873RfuwrU1gy8sjC1s82WZV',
    expectedWeeklyRewards: 1000,
    dexType: DexType.QUIPUSWAP
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.kusdToken,
    lpToken: mainnetTokens.uusdkusdLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1HaWDWv7XPsZ54JbDquXV6YgyazQr9Jkp3',
    expectedWeeklyRewards: 1000,
    dexType: DexType.FLAT_CURVE
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.usdtzToken,
    lpToken: mainnetTokens.uusdusdtzLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1JFsKh3Wcnd4tKzF6EwugwTVGj3XfGPfeZ',
    expectedWeeklyRewards: 1000,
    dexType: DexType.FLAT_CURVE
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.wusdcToken,
    token2: mainnetTokens.uusdToken,
    lpToken: mainnetTokens.uusdwusdcLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1Ug9wWbRuUs1XXRuK11o6syWdTFZQsmvw3',
    expectedWeeklyRewards: 1250,
    dexType: DexType.FLAT_CURVE
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.youToken,
    lpToken: mainnetTokens.uusdyouLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1Goz5Dsi8Hf7fqjx5nSEcjp6osD9ufECB2',
    expectedWeeklyRewards: 2000,
    dexType: DexType.PLENTY
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.udefiToken,
    lpToken: mainnetTokens.uusdudefiLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1W78rDHfwp3CKev7u7dWRJTBqLdwYVcPg9',
    expectedWeeklyRewards: 500,
    dexType: DexType.PLENTY
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.xtzToken,
    lpToken: mainnetTokens.uusdxtzLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1EhhuNuFDsnDh33uzSRZrxrZ2axC2FyHmG',
    expectedWeeklyRewards: 1000,
    dexType: DexType.QUIPUSWAP
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.quipuToken,
    lpToken: mainnetTokens.uusdquipuLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1P8LTMzQSe7G6xcGv5m1seizi6ccm43ktM',
    expectedWeeklyRewards: 500,
    dexType: DexType.QUIPUSWAP
  }
]

export const mainnetDexes: ExchangePair[] = [
  {
    token1: mainnetTokens.wusdcToken,
    token2: mainnetTokens.uusdToken,
    dexType: DexType.FLAT_CURVE,
    contractAddress: 'KT1JeWiS8j1kic4PHx7aTnEr9p4xVtJNzk5b',
    liquidityToken: mainnetTokens.uusdwusdcLP
  },
  {
    token1: mainnetTokens.tzbtcToken,
    token2: mainnetTokens.wwbtcToken,
    dexType: DexType.FLAT_CURVE,
    contractAddress: 'KT1T974a8qau4xP3RAAWPYCZM9xtwU9FLjPS',
    liquidityToken: mainnetTokens.tzbtcwwbtcLP
  },
  {
    token1: mainnetTokens.tzbtcToken,
    token2: mainnetTokens.ubtcToken,
    dexType: DexType.FLAT_CURVE,
    contractAddress: 'KT1XvH5f2ja2jzdDbv6rxPmecZFU7s3obquN',
    liquidityToken: mainnetTokens.ubtctzbtcLP
  },
  {
    token1: mainnetTokens.kusdToken,
    token2: mainnetTokens.uusdToken,
    dexType: DexType.FLAT_CURVE,
    contractAddress: 'KT1AVbWyM8E7DptyBCu4B5J5B7Nswkq7Skc6',
    liquidityToken: mainnetTokens.uusdkusdLP
  },
  {
    token1: mainnetTokens.usdtzToken,
    token2: mainnetTokens.uusdToken,
    dexType: DexType.FLAT_CURVE,
    contractAddress: 'KT1Xbx9pykNd38zag4yZvnmdSNBknmCETvQV',
    liquidityToken: mainnetTokens.uusdusdtzLP
  },
  // {
  //   token1: mainnetTokens.xtzToken,
  //   token2: mainnetTokens.youToken,
  //   dexType: DexType.QUIPUSWAP,
  //   address: 'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE'
  // },
  {
    token1: mainnetTokens.xtzToken,
    token2: mainnetTokens.uusdToken,
    dexType: DexType.QUIPUSWAP,
    address: 'KT1EtjRRCBC2exyCRXz8UfV7jz7svnkqi7di'
  },
  {
    token1: mainnetTokens.xtzToken,
    token2: mainnetTokens.udefiToken,
    dexType: DexType.QUIPUSWAP,
    address: 'KT1H8sJY2VzrbiX4pYeUVsoMUd4iGw2DV7XH'
  },
  {
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.youToken,
    dexType: DexType.PLENTY,
    address: 'KT1TnrLFrdemNZ1AnnWNfi21rXg7eknS484C'
  },
  {
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.udefiToken,
    dexType: DexType.PLENTY,
    address: 'KT1EAw8hL5zseB3SLpJhBqPQfP9aWrWh8iMW'
  }
]

export const mainnetContracts: AssetDefinition[] = [
  {
    id: 'uUSD',
    symbol: 'uUSD',
    metadata: {
      targetSymbol: 'USD',
      impliedPrice: 1.25,
      new: true,
      doubleRewards: ''
    },
    collateralOptions: [
      {
        token: mainnetTokens.xtzToken,
        TARGET_ORACLE_ADDRESS: 'KT1QvMWU7erjgpaxHsSfooHAhMNPcstRyU8q',
        TARGET_ORACLE_DECIMALS: 6,
        ORACLE_SYMBOL: 'XTZ',
        ENGINE_ADDRESS: 'KT1FFE2LC5JpVakVjHm5mM36QVp2p3ZzH4hH',
        ENGINE_TYPE: EngineType.TRACKER_V1,
        OPTIONS_LISTING_ADDRESS: 'KT1UDZNYC4twtgeN2WatoEjzjjANnRgsK3hD',
        SUPPORTS_BAILOUT: true,
        HAS_OBSERVED_PRICE: true
      },
      {
        token: mainnetTokens.tzbtcToken,
        TARGET_ORACLE_ADDRESS: 'KT1UC3H6DwGgNqMsKTfSJQzXmetCnFRK9zhG',
        TARGET_ORACLE_DECIMALS: 12,
        ORACLE_SYMBOL: 'BTC',
        ENGINE_ADDRESS: 'KT1VwywA1XM7PL3UVLXA8vmDPvLsGHwgS7wS',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1R9N7JBvbtDfLFj8T6tQhCsuHrSFuQJasd',
        SUPPORTS_BAILOUT: false,
        HAS_OBSERVED_PRICE: false
      },
      {
        token: mainnetTokens.tzbtcLP,
        TARGET_ORACLE_ADDRESS: 'KT1STKjPTSejiDgJN89EGYnSRhU5zYABd6G3',
        TARGET_ORACLE_DECIMALS: 6,
        ORACLE_SYMBOL: 'BTC',
        ENGINE_ADDRESS: 'KT1FzcHaNhmpdYPNTgfb8frYXx7B5pvVyowu',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1ESueqJziqKEgoePd1FMemk5XDiKhjczd6',
        SUPPORTS_BAILOUT: false,
        HAS_OBSERVED_PRICE: false
      }
    ],
    token: mainnetTokens.uusdToken,
    governanceToken: mainnetTokens.youToken,
    REWARD_POOL_ADDRESS: 'KT1Lz5S39TMHEA7izhQn8Z1mQoddm6v1jTwH',
    SAVINGS_POOL_ADDRESS: 'KT1M8asPmVQhFG6yujzttGonznkghocEkbFk',
    SAVINGS_V2_POOL_ADDRESS: 'KT1TMfRfmJ5mkJEXZGRCsqLHn2rgnV1SdUzb',
    SAVINGS_V2_VESTING_ADDRESS: 'KT1A1VNTvyqJYZN2FypF2kiTBPdoRvG9sCA7',
    GOVERNANCE_DEX: 'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
    DEX: [
      // TODO: Remove this array
      {
        token1: mainnetTokens.xtzToken,
        token2: mainnetTokens.uusdToken,
        dexType: DexType.QUIPUSWAP,
        address: 'KT1EtjRRCBC2exyCRXz8UfV7jz7svnkqi7di'
      },
      {
        token1: mainnetTokens.youToken,
        token2: mainnetTokens.uusdToken,
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
        token: mainnetTokens.uusdToken,
        TARGET_ORACLE_ADDRESS: 'KT1FJNdDbg7KmY9i7NcxSABpZmkbDWbdp7cR',
        TARGET_ORACLE_DECIMALS: 6,
        ORACLE_SYMBOL: 'DEFI',
        ENGINE_ADDRESS: 'KT1B2GSe47rcMCZTRk294havTpyJ36JbgdeB',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1Wqc19pqbYfzM3pVMZ35YdSxUvECwFfpVo',
        SUPPORTS_BAILOUT: true,
        HAS_OBSERVED_PRICE: true
      },
      {
        token: mainnetTokens.xtzToken,
        TARGET_ORACLE_ADDRESS: 'KT1E57j4ypKdPSBYrYxhQPfA43MEtxEN7Ro3',
        TARGET_ORACLE_DECIMALS: 6,
        ORACLE_SYMBOL: 'DEFI',
        ENGINE_ADDRESS: 'KT1ALVxK1YPsf1JfyqfivZT3rGCPwvebFZjs',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1JDRPrYDntayNTCuhLztk8FbE4Vroe5UPe',
        SUPPORTS_BAILOUT: false,
        HAS_OBSERVED_PRICE: false
      },
      {
        token: mainnetTokens.tzbtcLP,
        TARGET_ORACLE_ADDRESS: 'KT1ErdrsxBUQZhNUjw3u2STuKYwdFNtMwHjM',
        TARGET_ORACLE_DECIMALS: 6,
        ORACLE_SYMBOL: 'DEFI',
        ENGINE_ADDRESS: 'KT1U3RkwL3r7wi7tdjFxkjfDGfPrKrYFYGFh',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1CqxjZVvqQZtRhciL24o84zMKbdG9e62vc',
        SUPPORTS_BAILOUT: false,
        HAS_OBSERVED_PRICE: false
      }
    ],

    token: mainnetTokens.udefiToken,
    governanceToken: mainnetTokens.youToken,
    REWARD_POOL_ADDRESS: 'KT1TFPn4ZTzmXDzikScBrWnHkoqTA7MBt9Gi',
    SAVINGS_POOL_ADDRESS: '',
    SAVINGS_V2_POOL_ADDRESS: 'KT1Kvg5eJVuYfTC1bU1bwWyn4e1PRGKAf6sy',
    SAVINGS_V2_VESTING_ADDRESS: 'KT1BLLj2GZN6VuiM1Vg8LNsPWzoZTUa3mYqq',
    GOVERNANCE_DEX: 'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
    DEX: [
      // TODO: Remove this array
      {
        token1: mainnetTokens.xtzToken,
        token2: mainnetTokens.udefiToken,
        dexType: DexType.QUIPUSWAP,
        address: 'KT1H8sJY2VzrbiX4pYeUVsoMUd4iGw2DV7XH'
      },
      {
        token1: mainnetTokens.uusdToken,
        token2: mainnetTokens.udefiToken,
        dexType: DexType.PLENTY,
        address: 'KT1EAw8hL5zseB3SLpJhBqPQfP9aWrWh8iMW'
      }
    ]
  },
  {
    id: 'uBTC',
    symbol: 'uBTC',
    metadata: {
      targetSymbol: 'BTC',
      impliedPrice: 1.25,
      new: false,
      doubleRewards: ''
    },

    collateralOptions: [
      {
        token: mainnetTokens.xtzToken,
        TARGET_ORACLE_ADDRESS: 'KT1LpaWBCWSfQzNXpU6Qnz6twNmDm6cZvX99',
        TARGET_ORACLE_DECIMALS: 6,
        ORACLE_SYMBOL: 'BTC',
        ENGINE_ADDRESS: 'KT1VjQoL5QvyZtm9m1voQKNTNcQLi5QiGsRZ',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1M9rKvjNGdyHnrbxjrLhW9HCsAwtfY13Fn',
        SUPPORTS_BAILOUT: true,
        HAS_OBSERVED_PRICE: false
      },
      {
        token: mainnetTokens.tzbtcLP,
        TARGET_ORACLE_ADDRESS: 'KT1Mn4iDSiCRbmDLxqce8rvkjvYgQJnbiFuG',
        TARGET_ORACLE_DECIMALS: 6,
        ORACLE_SYMBOL: 'BTC',
        ENGINE_ADDRESS: 'KT1NFWUqr9xNvVsz2LXCPef1eRcexJz5Q2MH',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT18ePgHFBVBSLJD7uJoX2w5aZY3SvtV9xGP',
        SUPPORTS_BAILOUT: false,
        HAS_OBSERVED_PRICE: false
      }
    ],

    token: mainnetTokens.ubtcToken,
    governanceToken: mainnetTokens.youToken,
    REWARD_POOL_ADDRESS: 'KT19bkpis4NSDnt6efuh65vYxMaMHBoKoLEw',
    SAVINGS_POOL_ADDRESS: '',
    SAVINGS_V2_POOL_ADDRESS: 'KT1KNbtEBKumoZoyp5uq6A4v3ETN7boJ9ArF',
    SAVINGS_V2_VESTING_ADDRESS: 'KT1Pcv7VbgSFFRU9ykc1dwGHM3VjfWmfZqfB',
    GOVERNANCE_DEX: 'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
    DEX: [
      // TODO: Remove this array
      {
        token1: mainnetTokens.xtzToken,
        token2: mainnetTokens.ubtcToken,
        dexType: DexType.QUIPUSWAP,
        address: ''
      }
    ]
  }
]

export const mainnetNetworkConstants: NetworkConstants = {
  fakeAddress: 'tz1MJx9vhaNRSimcuXPK2rW4fLccQnDAnVKJ',
  natViewerCallback: 'KT1Lj4y492KN1zDyeeKR2HG74SR2j5tcenMV', // 'KT1UAuApZKc1UrbKL27xa5B6XWxUgahLZpnX%set_nat',
  balanceOfViewerCallback: 'KT1CcizgAUXomE1dqvGb3KdEsxFHCWsvuyuz',
  addressViewerCallback: 'KT1UAuApZKc1UrbKL27xa5B6XWxUgahLZpnX%set_address',
  tokens: mainnetTokens,
  farms: mainnetFarms,
  dexes: mainnetDexes
}
