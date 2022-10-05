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
  ubtcwbtceLP,
  udefiToken,
  usdce,
  usdtToken,
  usdtzToken,
  uusdkusdLP,
  uusdquipuLP,
  uusdToken,
  uusdubtcLP,
  uusdudefiLP,
  uusdusdceLP,
  uusdusdtLP,
  uusdusdtzLP,
  uusdwusdcLP,
  uusdxtzLP,
  uusdyouLP,
  wbtce,
  wusdc,
  wwbtc,
  xtzToken,
  youToken,
  youxtzLP
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
  usdtToken: { ...usdtToken, contractAddress: 'KT1XnTn74bUtxHfDtBmm2bGZAQfhPbvKWR8o' },
  usdtzToken: { ...usdtzToken, contractAddress: 'KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9' },
  wusdcToken: { ...wusdc, contractAddress: 'KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ' },
  wwbtcToken: { ...wwbtc, contractAddress: 'KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ' },
  usdceToken: { ...usdce, contractAddress: 'KT1UsSfaXyqcjSVPeiD7U1bWgKy3taYN7NWY' },
  wbtceToken: { ...wbtce, contractAddress: 'KT1UsSfaXyqcjSVPeiD7U1bWgKy3taYN7NWY' },
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
  youxtzLP: { ...youxtzLP, contractAddress: 'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE' },
  uusdquipuLP: { ...uusdquipuLP, contractAddress: 'KT1VNEzpf631BLsdPJjt2ZhgUitR392x6cSi' },
  uusdusdtLP: { ...uusdusdtLP, contractAddress: 'KT1H41VCk8FgskYy4RbLXH8Fwt83PJ5MNvno' },
  uusdusdceLP: { ...uusdusdceLP, contractAddress: 'KT1TQQZN7419ZFYdwgwLeZoW9ikeNfEewjKr' },
  ubtcwbtceLP: { ...ubtcwbtceLP, contractAddress: 'KT1Skvk2hzRm4LZQX56wG96gnFnYsLD4eEoG' }
}

export const mainnetFarms: Farm[] = [
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.usdtToken,
    lpToken: mainnetTokens.uusdusdtLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1USKq4gHFVs7WJSVsqKn8j8P4tmqZcgSbd',
    expectedWeeklyRewards: 1015,
    dexType: DexType.FLAT_CURVE,
    active: true
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.usdceToken,
    token2: mainnetTokens.uusdToken,
    lpToken: mainnetTokens.uusdusdceLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1CpXvNd293VvHkY7M9krjBvwEFuvura65Q',
    expectedWeeklyRewards: 350,
    dexType: DexType.FLAT_CURVE,
    active: true
  },
  {
    type: FarmType.NO_LOCK,
    token1: mainnetTokens.wusdcToken,
    token2: mainnetTokens.uusdToken,
    lpToken: mainnetTokens.uusdwusdcLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1TkNadQ9Cw5ZNRyS4t9SKmUbmAMkqY8bkV',
    expectedWeeklyRewards: 0,
    dexType: DexType.FLAT_CURVE,
    active: false
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.ubtcToken,
    lpToken: mainnetTokens.uusdubtcLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1KGfEyxBeCU873RfuwrU1gy8sjC1s82WZV',
    expectedWeeklyRewards: 490,
    dexType: DexType.QUIPUSWAP,
    active: true
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.kusdToken,
    lpToken: mainnetTokens.uusdkusdLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1HaWDWv7XPsZ54JbDquXV6YgyazQr9Jkp3',
    expectedWeeklyRewards: 350,
    dexType: DexType.FLAT_CURVE,
    active: true
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.usdtzToken,
    lpToken: mainnetTokens.uusdusdtzLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1JFsKh3Wcnd4tKzF6EwugwTVGj3XfGPfeZ',
    expectedWeeklyRewards: 70,
    dexType: DexType.FLAT_CURVE,
    active: true
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.wusdcToken,
    token2: mainnetTokens.uusdToken,
    lpToken: mainnetTokens.uusdwusdcLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1Ug9wWbRuUs1XXRuK11o6syWdTFZQsmvw3',
    expectedWeeklyRewards: 0,
    dexType: DexType.FLAT_CURVE,
    active: false
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.youToken,
    lpToken: mainnetTokens.uusdyouLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1Goz5Dsi8Hf7fqjx5nSEcjp6osD9ufECB2',
    expectedWeeklyRewards: 1015,
    dexType: DexType.PLENTY,
    active: true
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.udefiToken,
    lpToken: mainnetTokens.uusdudefiLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1W78rDHfwp3CKev7u7dWRJTBqLdwYVcPg9',
    expectedWeeklyRewards: 0,
    dexType: DexType.PLENTY,
    active: false
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.xtzToken,
    lpToken: mainnetTokens.uusdxtzLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1RLGwCgeq2ab92yznQnJinpqy9kG13dFh2',
    expectedWeeklyRewards: 490,
    dexType: DexType.QUIPUSWAP,
    active: true
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.youToken,
    token2: mainnetTokens.xtzToken,
    lpToken: mainnetTokens.youxtzLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT1M9T11hrSuDXWDqjTUC2iNPCyypA3BsMrm',
    expectedWeeklyRewards: 385,
    dexType: DexType.QUIPUSWAP,
    active: true
  },
  {
    type: FarmType.INCENTIVISED,
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.quipuToken,
    lpToken: mainnetTokens.uusdquipuLP,
    rewardToken: mainnetTokens.youToken,
    farmContract: 'KT18x3gGRMKyhzcBnKYSRrfqjnzu4fPE1Lzy',
    expectedWeeklyRewards: 70,
    dexType: DexType.QUIPUSWAP,
    active: true
  }
]

export const mainnetDexes: ExchangePair[] = [
  {
    token1: mainnetTokens.usdtToken,
    token2: mainnetTokens.uusdToken,
    dexType: DexType.FLAT_CURVE,
    contractAddress: 'KT1UJBvm4hv11Uvu6r4c8zE5K2EfmwiRVgsm',
    liquidityToken: mainnetTokens.uusdusdtLP
  },
  {
    token1: mainnetTokens.usdceToken,
    token2: mainnetTokens.uusdToken,
    dexType: DexType.FLAT_CURVE,
    contractAddress: 'KT1NgbaaYhtXh3MwJoYYxrrKUwG3RX5LYVL6',
    liquidityToken: mainnetTokens.uusdusdceLP
  },
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
    token1: mainnetTokens.wbtceToken,
    token2: mainnetTokens.ubtcToken,
    dexType: DexType.FLAT_CURVE,
    contractAddress: 'KT1CkpDuwCFrnoqTam6upYiPBiFNsSEVbBei',
    liquidityToken: mainnetTokens.ubtcwbtceLP
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

export const mainnetUnifiedStakingContractAddress: string = 'KT1UZcNDxTdkn33Xx5HRkqQoZedc3mEs11yV'

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
        targetOracle: {
          address: 'KT1F6Amndd62P8yySM5NkyF4b1Kz27Ft4QeT',
          decimals: 6,
          entrypoint: 'get_price',
          isView: true
        },
        ORACLE_SYMBOL: 'XTZ',
        ENGINE_ADDRESS: 'KT1DHndgk8ah1MLfciDnCV2zPJrVbnnAH9fd',
        ENGINE_TYPE: EngineType.TRACKER_V3,
        OPTIONS_LISTING_ADDRESS: 'KT1DP7rtzCGotqwgmZP8vViTVGz22mBwGGTT',
        SUPPORTS_BAILOUT: false,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: true,
        collateralTarget: 2,
        collateralWarning: 1.7,
        collateralEmergency: 1.6,
        isLatest: true,
        migrationPeriodEndTimestamp: 1665748800000
      },
      {
        token: mainnetTokens.xtzToken,
        targetOracle: {
          address: 'KT1SkFsTn2BZszPNiXoE99bU8BQEb4BNdqEV',
          decimals: 6,
          entrypoint: 'get_price'
        },
        ORACLE_SYMBOL: 'XTZ',
        ENGINE_ADDRESS: 'KT1FFE2LC5JpVakVjHm5mM36QVp2p3ZzH4hH',
        ENGINE_TYPE: EngineType.TRACKER_V1,
        OPTIONS_LISTING_ADDRESS: 'KT1AY8xaXU3M3XnaUxa6teLENU5Ku6z3YDbW',
        SUPPORTS_BAILOUT: true,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: true,
        collateralTarget: 3,
        collateralWarning: 2.5,
        collateralEmergency: 2,
        isLatest: false
      },
      {
        token: mainnetTokens.usdtToken,
        targetOracle: {
          address: 'KT1XM1vtYnMkDFxUqy4uHCbXMw9h2qJZojWq',
          decimals: 6,
          entrypoint: 'get_price',
          isView: true
        },
        ORACLE_SYMBOL: 'XTZ',
        ENGINE_ADDRESS: 'KT1JmfujyCYTw5krfu9bSn7YbLYuz2VbNaje',
        ENGINE_TYPE: EngineType.TRACKER_V3,
        OPTIONS_LISTING_ADDRESS: 'KT1V4UcdgjuirVxeZcTrFXvDRCyhMqnqBeLX',
        SUPPORTS_BAILOUT: false,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: true,
        collateralTarget: 1.15,
        collateralWarning: 1.12,
        collateralEmergency: 1.1,
        isLatest: true
      },
      {
        token: mainnetTokens.tzbtcToken,
        targetOracle: {
          address: 'KT1R6XgLEtpWt4bUqG5aJzd8Pe2o1a4kHfKz',
          decimals: 12,
          entrypoint: 'get_price',
          isView: true
        },
        ORACLE_SYMBOL: 'BTC',
        ENGINE_ADDRESS: 'KT1V9Rsc4ES3eeQTr4gEfJmNhVbeHrAZmMgC',
        ENGINE_TYPE: EngineType.TRACKER_V3,
        OPTIONS_LISTING_ADDRESS: 'KT1TCLpFRB6xiRmeupUCz9yFf7JiEvbLe1aS',
        SUPPORTS_BAILOUT: false,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: false,
        collateralTarget: 2,
        collateralWarning: 1.5,
        collateralEmergency: 1.35,
        isLatest: true,
        migrationPeriodEndTimestamp: 1665489600000
      },
      {
        token: mainnetTokens.tzbtcToken,
        targetOracle: {
          address: 'KT1BoAGMvTce8urukLPHcHdunYjFPkTo9Ldd',
          decimals: 12,
          entrypoint: 'get_price'
        },
        ORACLE_SYMBOL: 'BTC',
        ENGINE_ADDRESS: 'KT1HxgqnVjGy7KsSUTEsQ6LgpD5iKSGu7QpA',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1MPUDs1CSo5QzxtittccisyR32S4EZ7NiV',
        SUPPORTS_BAILOUT: false,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: false,
        collateralTarget: 3,
        collateralWarning: 2.5,
        collateralEmergency: 2,
        isLatest: false
      },
      {
        token: mainnetTokens.tzbtcLP,
        targetOracle: {
          address: 'KT1CeZvxMXqEjf2tQ7a5Ex7S9wVRLJWYaSUu',
          decimals: 6,
          entrypoint: 'get_price',
          isView: true
        },
        ORACLE_SYMBOL: 'BTC',
        ENGINE_ADDRESS: 'KT1F1JMgh6SfqBCK6T6o7ggRTdeTLw91KKks',
        ENGINE_TYPE: EngineType.TRACKER_V3,
        OPTIONS_LISTING_ADDRESS: 'KT1X7NYegSr27zrCfHEWHBfzv2QJXtiyD2a2',
        SUPPORTS_BAILOUT: false,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: false,
        collateralTarget: 2,
        collateralWarning: 1.5,
        collateralEmergency: 1.35,
        isLatest: true,
        migrationPeriodEndTimestamp: 1666785600000
      },
      {
        token: mainnetTokens.tzbtcLP,
        targetOracle: {
          address: 'KT1VCFYwXiFhmzjd6VRpkPJBF6DvRSf3sF2X',
          decimals: 6,
          entrypoint: 'get_price'
        },
        ORACLE_SYMBOL: 'BTC',
        ENGINE_ADDRESS: 'KT1FzcHaNhmpdYPNTgfb8frYXx7B5pvVyowu',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1LwikDGBoBmrwCZbk2LrfV7ZBj26hNLGy6',
        SUPPORTS_BAILOUT: false,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: false,
        collateralTarget: 3,
        collateralWarning: 2.5,
        collateralEmergency: 2,
        isLatest: false
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
        targetOracle: {
          address: 'KT1FJNdDbg7KmY9i7NcxSABpZmkbDWbdp7cR',
          decimals: 6,
          entrypoint: 'get_price'
        },
        ORACLE_SYMBOL: 'DEFI',
        ENGINE_ADDRESS: 'KT1B2GSe47rcMCZTRk294havTpyJ36JbgdeB',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1Wqc19pqbYfzM3pVMZ35YdSxUvECwFfpVo',
        SUPPORTS_BAILOUT: true,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: true,
        collateralTarget: 3,
        collateralWarning: 2.5,
        collateralEmergency: 2,
        isLatest: true
      },
      {
        token: mainnetTokens.xtzToken,
        targetOracle: {
          address: 'KT1E57j4ypKdPSBYrYxhQPfA43MEtxEN7Ro3',
          decimals: 6,
          entrypoint: 'get_price'
        },
        ORACLE_SYMBOL: 'DEFI',
        ENGINE_ADDRESS: 'KT1LQcsXGpmLXnwrfftuQdCLNvLRLUAuNPCV',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1BjNkpfeb5gWQqMTB8Px1z3EXE4F3Tpkat',
        SUPPORTS_BAILOUT: false,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: false,
        collateralTarget: 3,
        collateralWarning: 2.5,
        collateralEmergency: 2,
        isLatest: true
      },
      {
        token: mainnetTokens.tzbtcLP,
        targetOracle: {
          address: 'KT1ErdrsxBUQZhNUjw3u2STuKYwdFNtMwHjM',
          decimals: 6,
          entrypoint: 'get_price'
        },
        ORACLE_SYMBOL: 'DEFI',
        ENGINE_ADDRESS: 'KT1E45AvpSr7Basw2bee3g8ri2LK2C2SV2XG',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1UyfqcrxAmBqTbaVGbVUDSy6yLUxCUYmEw',
        SUPPORTS_BAILOUT: false,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: false,
        collateralTarget: 3,
        collateralWarning: 2.5,
        collateralEmergency: 2,
        isLatest: true
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
        targetOracle: {
          address: 'KT1QDWxfzptWPooyqmf1pjsjGkGcfu8dM32z',
          decimals: 6,
          entrypoint: 'get_price',
          isView: true
        },
        ORACLE_SYMBOL: 'BTC',
        ENGINE_ADDRESS: 'KT1CP1C8afHqdNfBsSE3ggQhzM2iMHd4cRyt',
        ENGINE_TYPE: EngineType.TRACKER_V3,
        OPTIONS_LISTING_ADDRESS: 'KT1H4h1VunWkVE9Cuq1QDVy9xRNLBSbqXsr9',
        SUPPORTS_BAILOUT: false,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: false,
        collateralTarget: 2,
        collateralWarning: 1.7,
        collateralEmergency: 1.6,
        isLatest: true,
        migrationPeriodEndTimestamp: 1665489600000
      },
      {
        token: mainnetTokens.xtzToken,
        targetOracle: {
          address: 'KT1CdMTeztkZJhVUYRDBBW7gaGQQq87jtjzk',
          decimals: 6,
          entrypoint: 'get_price'
        },
        ORACLE_SYMBOL: 'BTC',
        ENGINE_ADDRESS: 'KT1VjQoL5QvyZtm9m1voQKNTNcQLi5QiGsRZ',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1WZY3DEBy6yTeXBe5BmMxMSV7RhDKDeS81',
        SUPPORTS_BAILOUT: true,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: false,
        collateralTarget: 3,
        collateralWarning: 2.5,
        collateralEmergency: 2,
        isLatest: false
      },
      {
        token: mainnetTokens.tzbtcLP,
        targetOracle: {
          address: 'KT1KpFkAKgrAJNXZxhahFaTduTAoEc8jFpmQ',
          decimals: 6,
          entrypoint: 'get_price',
          isView: true
        },
        ORACLE_SYMBOL: 'BTC',
        ENGINE_ADDRESS: 'KT1G6RzVX25YnoU55Xb7Vve3zvuZKmouf24a',
        ENGINE_TYPE: EngineType.TRACKER_V3,
        OPTIONS_LISTING_ADDRESS: 'KT1J217QyWoPSE8EtAySMyJjr8ptTsakBszP',
        SUPPORTS_BAILOUT: false,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: false,
        collateralTarget: 2,
        collateralWarning: 1.5,
        collateralEmergency: 1.35,
        isLatest: true,
        migrationPeriodEndTimestamp: 1666785600000
      },
      {
        token: mainnetTokens.tzbtcLP,
        targetOracle: {
          address: 'KT1GqQqgLji2T5QMfzoAXgDt9T7ur1LhqfpD',
          decimals: 6,
          entrypoint: 'get_price'
        },
        ORACLE_SYMBOL: 'BTC',
        ENGINE_ADDRESS: 'KT1NFWUqr9xNvVsz2LXCPef1eRcexJz5Q2MH',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1CHzk4vojAF1gakAjB1mXa2nVrtyoe57v6',
        SUPPORTS_BAILOUT: false,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: false,
        collateralTarget: 3,
        collateralWarning: 2.5,
        collateralEmergency: 2,
        isLatest: false
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
  dexes: mainnetDexes,
  unifiedStaking: mainnetUnifiedStakingContractAddress
}
