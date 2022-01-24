import {
  AssetDefinition,
  DexType,
  EngineType,
  ExchangePair,
  NetworkConstants,
  plentyToken,
  tzbtcLPToken,
  tzbtcToken,
  tzbtcwwbtcLP,
  ubtcToken,
  udefiToken,
  uusdToken,
  uusdwusdcLP,
  wusdc,
  wwbtc,
  xtzToken,
  youToken
} from './networks.base'

export const mainnetTokens = {
  xtzToken: { ...xtzToken, contractAddress: 'EMPTY' },
  youToken: { ...youToken, contractAddress: 'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL' },
  tzbtcToken: { ...tzbtcToken, contractAddress: 'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn' },
  uusdToken: { ...uusdToken, contractAddress: 'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW' },
  udefiToken: { ...udefiToken, contractAddress: 'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW' },
  ubtcToken: { ...ubtcToken, contractAddress: 'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW' },
  tzbtcLP: { ...tzbtcLPToken, contractAddress: 'KT1AafHA1C1vk959wvHWBispY9Y2f3fxBUUo' },
  plentyToken: { ...plentyToken, contractAddress: 'KT1GRSvLoikDsXujKgZPsGLX8k8VvR2Tq95b' },
  wusdcToken: { ...wusdc, contractAddress: 'KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ' },
  wwbtcToken: { ...wwbtc, contractAddress: 'KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ' },
  uusdwusdcLP: { ...uusdwusdcLP, contractAddress: '' },
  tzbtcwwbtcLP: { ...tzbtcwwbtcLP, contractAddress: '' }
}

export const mainnetNetworkConstants: NetworkConstants = {
  fakeAddress: 'tz1MJx9vhaNRSimcuXPK2rW4fLccQnDAnVKJ',
  natViewerCallback: 'KT1Lj4y492KN1zDyeeKR2HG74SR2j5tcenMV', // 'KT1UAuApZKc1UrbKL27xa5B6XWxUgahLZpnX%set_nat',
  addressViewerCallback: 'KT1UAuApZKc1UrbKL27xa5B6XWxUgahLZpnX%set_address'
}

export const mainnetDexes: ExchangePair[] = [
  {
    token1: mainnetTokens.uusdToken,
    token2: mainnetTokens.wusdcToken,
    dexType: DexType.FLAT_CURVE,
    contractAddress: '',
    liquidityToken: mainnetTokens.uusdwusdcLP
  },
  {
    token1: mainnetTokens.tzbtcToken,
    token2: mainnetTokens.wwbtcToken,
    dexType: DexType.FLAT_CURVE,
    contractAddress: '',
    liquidityToken: mainnetTokens.tzbtcwwbtcLP
  },
  {
    token1: mainnetTokens.xtzToken,
    token2: mainnetTokens.youToken,
    dexType: DexType.QUIPUSWAP,
    address: 'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE'
  },
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
      new: false,
      doubleRewards: ''
    },
    collateralOptions: [
      {
        token: mainnetTokens.xtzToken,
        TARGET_ORACLE_ADDRESS: 'KT1HjoLU8KAgQYszocVigHW8TxUb8ZsdGTog',
        ORACLE_SYMBOL: 'XTZ',
        ENGINE_ADDRESS: 'KT1FFE2LC5JpVakVjHm5mM36QVp2p3ZzH4hH',
        ENGINE_TYPE: EngineType.TRACKER_V1,
        OPTIONS_LISTING_ADDRESS: 'KT196gC9PWdv3bhrv3dUNeJ2w2UwY3xvbxMf',
        SUPPORTS_BAILOUT: true,
        HAS_OBSERVED_PRICE: true
      },
      {
        token: mainnetTokens.tzbtcLP,
        TARGET_ORACLE_ADDRESS: 'KT1STKjPTSejiDgJN89EGYnSRhU5zYABd6G3',
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
        TARGET_ORACLE_ADDRESS: 'KT1UuqJiGQgfNrTK5tuR1wdYi5jJ3hnxSA55',
        ORACLE_SYMBOL: 'DEFI',
        ENGINE_ADDRESS: 'KT1B2GSe47rcMCZTRk294havTpyJ36JbgdeB',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1N6dVHg5fPaJf4ZrFZsfdddjZ4qX9n1Fca',
        SUPPORTS_BAILOUT: true,
        HAS_OBSERVED_PRICE: true
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
      new: true,
      doubleRewards: ''
    },

    collateralOptions: [
      {
        token: mainnetTokens.xtzToken,
        TARGET_ORACLE_ADDRESS: 'KT1LpaWBCWSfQzNXpU6Qnz6twNmDm6cZvX99',
        ORACLE_SYMBOL: 'BTC',
        ENGINE_ADDRESS: 'KT1VjQoL5QvyZtm9m1voQKNTNcQLi5QiGsRZ',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1M9rKvjNGdyHnrbxjrLhW9HCsAwtfY13Fn',
        SUPPORTS_BAILOUT: true,
        HAS_OBSERVED_PRICE: false
      }
    ],

    token: mainnetTokens.ubtcToken,
    governanceToken: mainnetTokens.youToken,
    REWARD_POOL_ADDRESS: 'KT19bkpis4NSDnt6efuh65vYxMaMHBoKoLEw',
    SAVINGS_POOL_ADDRESS: '',
    SAVINGS_V2_POOL_ADDRESS: 'KT1KNbtEBKumoZoyp5uq6A4v3ETN7boJ9ArF',
    SAVINGS_V2_VESTING_ADDRESS: 'KT1Pcv7VbgSFFRU9ykc1dwGHM3VjfWmfZqfB',
    GOVERNANCE_DEX: 'KT1Pcv7VbgSFFRU9ykc1dwGHM3VjfWmfZqfB',
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
