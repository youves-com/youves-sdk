import {
  AssetDefinition,
  DexType,
  EngineType,
  ExchangePair,
  plentyToken,
  tzbtcLPToken,
  udefiToken,
  uusdToken,
  wusdc,
  wwbtc,
  xtzToken,
  youToken
} from './networks.base'

export const hangzhounetTokens = {
  xtzToken: { ...xtzToken, contractAddress: 'EMPTY' },
  youToken: { ...youToken, contractAddress: 'KT1C2sbavT9BuMnKEBCm9bot6HSUuCKDfK3s' },
  tzbtcLP: { ...tzbtcLPToken, decimals: 12, contractAddress: 'KT1DnNWZFWsLLFfXWJxfNnVMtaVqWBGgpzZt' },
  uusdToken: { ...uusdToken, contractAddress: 'KT1PiqMJSEsZkFruWMKMpoAmRVumKk9LavX3' },
  udefiToken: { ...udefiToken, contractAddress: 'KT1PiqMJSEsZkFruWMKMpoAmRVumKk9LavX3' },
  plentyToken: { ...plentyToken, contractAddress: 'EMPTY' },
  wusdcToken: { ...wusdc, contractAddress: 'KT19z4o3g8oWVvExK93TA2PwknvznbXXCWRu' },
  wwbtc: { ...wwbtc, contractAddress: 'KT19z4o3g8oWVvExK93TA2PwknvznbXXCWRu' }
}

export const hangzhounetDexes: ExchangePair[] = [
  {
    token1: hangzhounetTokens.uusdToken,
    token2: hangzhounetTokens.wusdcToken,
    dexType: DexType.FLAT_CURVE,
    contractAddress: 'KT1WZKYVpz9PA75cLoVV9iK5HhdMF6dL7NRz',
    liquidityTokenAddress: 'KT1HvsH8ag7wtMNrTXz9Py7rMaJgAwCZUjtE',
    liquidityTokenDecimals: 12
  },
  {
    token1: hangzhounetTokens.uusdToken,
    token2: hangzhounetTokens.udefiToken,
    dexType: DexType.FLAT_CURVE,
    contractAddress: 'KT1HDtYvo6qY7yfx5EeXtk9TBwsEARBfYkri',
    liquidityTokenAddress: 'KT1FtASTGyicrRTXji8L8QcXpVMwwK3An7d9',
    liquidityTokenDecimals: 12
  }
]

export const hangzhounetContracts: AssetDefinition[] = [
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
        token: hangzhounetTokens.xtzToken,
        TARGET_ORACLE_ADDRESS: 'KT1KDrE5XfWxrSTY1d9P8Z7iCxThxiWWZzRb',
        ORACLE_SYMBOL: 'XTZ',
        ENGINE_ADDRESS: 'KT1MBu8ZU2gRdkC4Ahg54Zc33Q8CrT2ZVmnB',
        ENGINE_TYPE: EngineType.TRACKER_V1,
        OPTIONS_LISTING_ADDRESS: 'KT1HAT9FSkzA3mDqg3MwX5Eyh7qMTDsxNVm9',
        SUPPORTS_BAILOUT: true,
        HAS_OBSERVED_PRICE: true
      },
      {
        token: hangzhounetTokens.tzbtcLP,
        TARGET_ORACLE_ADDRESS: 'KT1KDrE5XfWxrSTY1d9P8Z7iCxThxiWWZzRb',
        ORACLE_SYMBOL: 'BTC',
        ENGINE_ADDRESS: 'KT1LHhNhxa7sPXtUmie7p6VbLiCtyYbU5GF8',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1PB4pFRGLLdhgfLjfZ9TKc13Ev6Mznh5TQ',
        SUPPORTS_BAILOUT: false,
        HAS_OBSERVED_PRICE: false
      }
    ],
    token: hangzhounetTokens.uusdToken,
    governanceToken: hangzhounetTokens.youToken,
    REWARD_POOL_ADDRESS: 'KT1Dozui62izZxQn1XVeatkgMyqGSaykb1AC',
    SAVINGS_POOL_ADDRESS: '',
    SAVINGS_V2_POOL_ADDRESS: 'KT1Wc6yZMfoy2kkdZAf8mQJhBku2AdcY4Jhv',
    SAVINGS_V2_VESTING_ADDRESS: 'KT1GhDTCjpTbgZjav7CSfK2LY4ehUrYV4n1r',
    VIEWER_CALLBACK_ADDRESS: 'KT1E4MTnEKVv9dX5RovpfW2ND2NRHYHa4RVL%set_address',
    GOVERNANCE_DEX: 'KT1D6DLJgG4kJ7A5JgT4mENtcQh9Tp3BLMVQ',
    DEX: [
      {
        token1: hangzhounetTokens.xtzToken,
        token2: hangzhounetTokens.uusdToken,
        dexType: DexType.QUIPUSWAP,
        address: 'KT1DYx1uoEfKKYhJm4gAZBBHpuWVzwMzWdCV'
      },
      {
        token1: hangzhounetTokens.udefiToken,
        token2: hangzhounetTokens.uusdToken,
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
        token: hangzhounetTokens.uusdToken,
        TARGET_ORACLE_ADDRESS: 'KT1KDrE5XfWxrSTY1d9P8Z7iCxThxiWWZzRb',
        ORACLE_SYMBOL: 'DEFI',
        ENGINE_ADDRESS: 'KT1AzpPgkZ7QK1MTe14H8eKPPKzrBW3Npvy6',
        ENGINE_TYPE: EngineType.TRACKER_V2,
        OPTIONS_LISTING_ADDRESS: 'KT1FK1i7QYK7X7252nqCzf5pcicxC33FZ1v8',
        SUPPORTS_BAILOUT: true,
        HAS_OBSERVED_PRICE: true
      }
    ],
    token: hangzhounetTokens.udefiToken,
    governanceToken: hangzhounetTokens.youToken,
    REWARD_POOL_ADDRESS: 'KT1Cbx4bcPwnyZKVVPfu422mzvbydrJkv48f',
    SAVINGS_POOL_ADDRESS: '',
    SAVINGS_V2_POOL_ADDRESS: 'KT1NY67v4iyM2tHXkBLPed69GqyvMEF6sano',
    SAVINGS_V2_VESTING_ADDRESS: 'KT1GHhJPha7pVSsMhAsjGMxmn3YMvyFrKbsX',
    VIEWER_CALLBACK_ADDRESS: 'KT1E4MTnEKVv9dX5RovpfW2ND2NRHYHa4RVL%set_address',
    GOVERNANCE_DEX: 'KT1D6DLJgG4kJ7A5JgT4mENtcQh9Tp3BLMVQ',
    DEX: [
      {
        token1: hangzhounetTokens.xtzToken,
        token2: hangzhounetTokens.udefiToken,
        dexType: DexType.QUIPUSWAP,
        address: 'KT1RgmsYqUSDdsQUhEmf4sKiBKWAX6KsVwkn'
      },
      {
        token1: hangzhounetTokens.uusdToken,
        token2: hangzhounetTokens.udefiToken,
        dexType: DexType.PLENTY,
        address: ''
      }
    ]
  }
]
