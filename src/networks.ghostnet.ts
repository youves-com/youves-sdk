import {
  AssetDefinition,
  // DexType,
  EngineType,
  ExchangePair,
  xtzToken,
  // plentyToken,
  // tzbtcLPToken,
  // ubtcToken,
  // udefiToken,
  // uusdToken,
  // uusdwusdcLP,
  // ubtctzbtcLP,
  // wusdc,
  // wwbtc,
  youToken,
  // tzbtcwwbtcLP,
  NetworkConstants,
  Farm,
  // FarmType,
  uusdToken,
  DexType,
  ctezToken,
  usdtToken,
  ctezxtzLP,
  uxauToken,
  uxauuusdLP,
  uxtzToken,
  tzbtcToken,
  usdttzbtcxtzLP,
  SwapVersion
} from './networks.base'
import { Token } from './tokens/token'

export const ithacanetTokens: Record<string, Token> = {
  xtzToken: { ...xtzToken, contractAddress: 'EMPTY' },
  youToken: { ...youToken, contractAddress: 'KT1J4CiyWPmtFPXAjpgBezM5hoVHXHNzWBHK' },
  // tzbtcLP: { ...tzbtcLPToken, decimals: 18, contractAddress: '' },
  uusdToken: { ...uusdToken, contractAddress: 'KT1CrNkK2jpdMycfBdPpvTLSLCokRBhZtMq7', tokenId: 0 },
  uxtzToken: { ...uxtzToken, contractAddress: 'KT1CrNkK2jpdMycfBdPpvTLSLCokRBhZtMq7', tokenId: 3 },
  tzbtcToken: { ...tzbtcToken, contractAddress: 'KT18jqS6maEXL8AWvc2x2bppHNRQNqPq8axP' },
  // udefiToken: { ...udefiToken, contractAddress: '' },
  // ubtcToken: { ...ubtcToken, contractAddress: '' },
  ctezToken: { ...ctezToken, contractAddress: 'KT1Q4qRd8mKS7eWUgTfJzCN8RC6h9CzzjVJb' },
  // plentyToken: { ...plentyToken, contractAddress: 'EMPTY' },
  // wusdcToken: { ...wusdc, contractAddress: '' },
  // wwbtcToken: { ...wwbtc, contractAddress: '' },
  // uusdwusdcLP: { ...uusdwusdcLP, contractAddress: '' },
  // ubtctzbtcLP: { ...ubtctzbtcLP, contractAddress: '' },
  // tzbtcuusdLP: { ...tzbtcwwbtcLP, decimals: 12, contractAddress: '' }
  ctezxtzLP: { ...ctezxtzLP, decimals: 6, contractAddress: 'KT1MX69KiYtZKNFeKfELyXJrWFhsQGgcuNgh', tokenId: 0 },
  usdtToken: { ...usdtToken, contractAddress: 'KT1J2iy42X6TkRMzX7TJiHh8vibg84fAerPc', tokenId: 0 },
  uxauToken: { ...uxauToken, contractAddress: 'KT1CrNkK2jpdMycfBdPpvTLSLCokRBhZtMq7', tokenId: 4 },
  uxauuusdLP: { ...uxauuusdLP, contractAddress: 'KT1S9YR9e89s2bn5qURZ5BnwDkQGFhQke94P' },
  usdttzbtcxtzLP: { ...usdttzbtcxtzLP, contractAddress: 'KT1FVimHCobgKHEcvrLyMKDPAxrpVjCoUxMf', tokenId: 0 }
}

export const ithacanetFarms: Farm[] = [
  // {
  //   token1: ithacanetTokens.tzbtcLP,
  //   token2: ithacanetTokens.uusdToken,
  //   lpToken: ithacanetTokens.tzbtcuusdLP,
  //   farmContract: ''
  // },
  // {
  //   type: FarmType.NO_LOCK,
  //   token1: ithacanetTokens.uusdToken,
  //   token2: ithacanetTokens.wusdcToken,
  //   lpToken: ithacanetTokens.uusdwusdcLP,
  //   rewardToken: ithacanetTokens.youToken,
  //   farmContract: '',
  //   expectedWeeklyRewards: 0,
  //   dexType: DexType.FLAT_CURVE
  // }
]

export const ithacanetDexes: ExchangePair[] = [
  {
    token1: ithacanetTokens.xtzToken,
    token2: ithacanetTokens.usdtToken,
    token3: ithacanetTokens.tzbtcToken,
    dexType: DexType.MULTISWAP,
    contractAddress: 'KT1G2iYvNkLhfKdWASUwj6kf2wP4iw9PHHZ4',
    liquidityToken: ithacanetTokens.usdttzbtcxtzLP,
    version: SwapVersion.MULTI
  },
  {
    token1: ithacanetTokens.xtzToken,
    token2: ithacanetTokens.tzbtcToken,
    token3: ithacanetTokens.usdtToken,
    dexType: DexType.MULTISWAP,
    contractAddress: 'KT1G2iYvNkLhfKdWASUwj6kf2wP4iw9PHHZ4',
    liquidityToken: ithacanetTokens.usdttzbtcxtzLP,
    version: SwapVersion.MULTI
  },
  {
    token1: ithacanetTokens.usdtToken,
    token2: ithacanetTokens.tzbtcToken,
    token3: ithacanetTokens.xtzToken,
    dexType: DexType.MULTISWAP,
    contractAddress: 'KT1G2iYvNkLhfKdWASUwj6kf2wP4iw9PHHZ4',
    liquidityToken: ithacanetTokens.usdttzbtcxtzLP,
    version: SwapVersion.MULTI
  },
  // {
  //   token1: ithacanetTokens.xtzToken,
  //   token2: ithacanetTokens.usdtToken,
  //   token3: ithacanetTokens.tzbtcToken,
  //   dexType: DexType.MULTISWAP,
  //   contractAddress: 'KT1Td3eEAtPj4ccFwiBKzFA4hajYnaz3z48Z',
  //   liquidityToken: ithacanetTokens.usdttzbtcxtzLP,
  //   version: SwapVersion.MULTI
  // },
  // {
  //   token1: ithacanetTokens.xtzToken,
  //   token2: ithacanetTokens.tzbtcToken,
  //   token3: ithacanetTokens.usdtToken,
  //   dexType: DexType.MULTISWAP,
  //   contractAddress: 'KT1Td3eEAtPj4ccFwiBKzFA4hajYnaz3z48Z',
  //   liquidityToken: ithacanetTokens.usdttzbtcxtzLP,
  //   version: SwapVersion.MULTI
  // },
  // {
  //   token1: ithacanetTokens.usdtToken,
  //   token2: ithacanetTokens.tzbtcToken,
  //   token3: ithacanetTokens.xtzToken,
  //   dexType: DexType.MULTISWAP,
  //   contractAddress: 'KT1Td3eEAtPj4ccFwiBKzFA4hajYnaz3z48Z',
  //   liquidityToken: ithacanetTokens.usdttzbtcxtzLP,
  //   version: SwapVersion.MULTI
  // },

  //tzbtc-uusd-uxtz
  // {
  //   token1: ithacanetTokens.uxtzToken,
  //   token2: ithacanetTokens.uusdToken,
  //   token3: ithacanetTokens.tzbtcToken,
  //   dexType: DexType.MULTISWAP,
  //   contractAddress: 'KT1FHc49Tgap4QZUpANTL8mPKCBKuB7t3jK6',
  //   liquidityToken: ithacanetTokens.usdttzbtcxtzLP,
  //   version: SwapVersion.MULTI
  // },
  // {
  //   token1: ithacanetTokens.uxtzToken,
  //   token2: ithacanetTokens.tzbtcToken,
  //   token3: ithacanetTokens.uusdToken,
  //   dexType: DexType.MULTISWAP,
  //   contractAddress: 'KT1FHc49Tgap4QZUpANTL8mPKCBKuB7t3jK6',
  //   liquidityToken: ithacanetTokens.usdttzbtcxtzLP,
  //   version: SwapVersion.MULTI
  // },
  // {
  //   token1: ithacanetTokens.uusdToken,
  //   token2: ithacanetTokens.tzbtcToken,
  //   token3: ithacanetTokens.uxtzToken,
  //   dexType: DexType.MULTISWAP,
  //   contractAddress: 'KT1FHc49Tgap4QZUpANTL8mPKCBKuB7t3jK6',
  //   liquidityToken: ithacanetTokens.usdttzbtcxtzLP,
  //   version: SwapVersion.MULTI
  // },
  // {
  //   token1: ithacanetTokens.uxtzToken,
  //   token2: ithacanetTokens.uusdToken,
  //   dexType: DexType.FLAT_CURVE_V2,
  //   contractAddress: 'KT1FHc49Tgap4QZUpANTL8mPKCBKuB7t3jKX',
  //   liquidityToken: ithacanetTokens.usdttzbtcxtzLP,
  //   version: SwapVersion.LEGACY
  // },
  // {
  //   token1: ithacanetTokens.xtzToken,
  //   token2: ithacanetTokens.tzbtcToken,
  //   dexType: DexType.FLAT_CURVE_V2,
  //   contractAddress: 'KT1FHc49Tgap4QZUpANTL8mPKCBKuB7t3jKX',
  //   liquidityToken: ithacanetTokens.usdttzbtcxtzLP,
  //   version: SwapVersion.LEGACY
  // },
  // {
  //   token1: ithacanetTokens.usdtToken,
  //   token2: ithacanetTokens.tzbtcToken,
  //   dexType: DexType.FLAT_CURVE_V2,
  //   contractAddress: 'KT1FHc49Tgap4QZUpANTL8mPKCBKuB7t3jKX',
  //   liquidityToken: ithacanetTokens.usdttzbtcxtzLP,
  //   version: SwapVersion.LEGACY
  // },
  {
    token1: ithacanetTokens.uusdToken,
    token2: ithacanetTokens.uxauToken,
    dexType: DexType.FLAT_CURVE,
    contractAddress: 'KT1DRoTPmuC5dkNwi15bb3jCA3K1LPixgEdq',
    liquidityToken: ithacanetTokens.uxauuusdLP,
    isMarket: true
  }
  // {
  //   token1: ithacanetTokens.uusdToken,
  //   token2: ithacanetTokens.wusdcToken,
  //   dexType: DexType.FLAT_CURVE,
  //   contractAddress: '',
  //   liquidityToken: ithacanetTokens.uusdwusdcLP
  // },
  // {
  //   token1: ithacanetTokens.xtzToken,
  //   token2: ithacanetTokens.uusdToken,
  //   dexType: DexType.QUIPUSWAP,
  //   address: ''
  // },
  // {
  //   token1: ithacanetTokens.udefiToken,
  //   token2: ithacanetTokens.uusdToken,
  //   dexType: DexType.PLENTY,
  //   address: ''
  // },
  // {
  //   token1: ithacanetTokens.xtzToken,
  //   token2: ithacanetTokens.udefiToken,
  //   dexType: DexType.QUIPUSWAP,
  //   address: ''
  // },
  // {
  //   token1: ithacanetTokens.uusdToken,
  //   token2: ithacanetTokens.udefiToken,
  //   dexType: DexType.PLENTY,
  //   address: ''
  // }
]

export const ithacanetContracts: AssetDefinition[] = [
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
        token: ithacanetTokens.xtzToken,
        targetOracle: {
          address: 'KT1Ky6b52o2PhrYVm2e6HDUhLUE6rqCcvov8',
          decimals: 6,
          entrypoint: 'get_price',
          isView: true
        },
        ORACLE_SYMBOL: 'XTZ',
        ENGINE_ADDRESS: 'KT1T7Rx3uzj5wwvFVrCnHxo64RvFtS8awJK7',
        ENGINE_TYPE: EngineType.TRACKER_V1,
        OPTIONS_LISTING_ADDRESS: 'KT1JsCFDiQpFPRwgRkKRPfyxyEE4M7b1tTyq',
        SUPPORTS_BAILOUT: true,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: true,
        collateralTarget: 3,
        collateralWarning: 2.5,
        collateralEmergency: 2,
        isLatest: true
      },
      {
        token: ithacanetTokens.usdtToken,
        targetOracle: {
          address: 'KT1X2vwAmK15Nb31UdZY33ZecGqScVZmtsW7',
          decimals: 6,
          entrypoint: 'get_price',
          isView: true
        },
        ORACLE_SYMBOL: 'XTZ',
        ENGINE_ADDRESS: 'KT1VquHzcmFuxdzGqetqZx6Rqky7sTcECxqz',
        ENGINE_TYPE: EngineType.TRACKER_V3,
        OPTIONS_LISTING_ADDRESS: 'KT1JgzfzNvajT9Eqzh5tXhESjiegJiovoqwn',
        SUPPORTS_BAILOUT: false,
        SUPPORTS_CONVERSION: true,
        HAS_OBSERVED_PRICE: true,
        collateralTarget: 1.15,
        collateralWarning: 1.12,
        collateralEmergency: 1.1,
        isLatest: true
      }
    ],
    token: ithacanetTokens.uusdToken,
    governanceToken: ithacanetTokens.youToken,
    REWARD_POOL_ADDRESS: 'KT1C9dmcZLs3QLnDZ8oXEHHgbXqfme3JMAh4',
    SAVINGS_POOL_ADDRESS: '',
    SAVINGS_V2_POOL_ADDRESS: 'KT19uLXFNyvGuiKUwkoh4a5Rz3xP5dDYQf5i',
    SAVINGS_V3_POOL_ADDRESS: 'KT1VxRvELtwFcr6WmYpdhDX2JnoMuhjN4cEE',
    SAVINGS_V2_VESTING_ADDRESS: 'KT1VsjbfCo3PUm4ePzG59Zy7Rxwk6wecCMQy',
    GOVERNANCE_DEX: '',
    DEX: [
      // TODO: Remove this array
      // {
      //   token1: ithacanetTokens.xtzToken,
      //   token2: ithacanetTokens.uusdToken,
      //   dexType: DexType.QUIPUSWAP,
      //   address: ''
      // },
      // {
      //   token1: ithacanetTokens.udefiToken,
      //   token2: ithacanetTokens.uusdToken,
      //   dexType: DexType.PLENTY,
      //   address: ''
      // }
    ]
  },
  // {
  //   id: 'uDEFI',
  //   symbol: 'uDEFI',
  //   metadata: {
  //     targetSymbol: 'DEFI',
  //     impliedPrice: 1.25,
  //     new: false,
  //     doubleRewards: ''
  //   },

  //   collateralOptions: [
  //     {
  //       token: ithacanetTokens.uusdToken,
  //       TARGET_ORACLE_ADDRESS: '',
  //       TARGET_ORACLE_DECIMALS: 6,
  //       ORACLE_SYMBOL: 'DEFI',
  //       ENGINE_ADDRESS: '',
  //       ENGINE_TYPE: EngineType.TRACKER_V2,
  //       OPTIONS_LISTING_ADDRESS: '',
  //       SUPPORTS_BAILOUT: true,
  //       HAS_OBSERVED_PRICE: true
  //     }
  //   ],
  //   token: ithacanetTokens.udefiToken,
  //   governanceToken: ithacanetTokens.youToken,
  //   REWARD_POOL_ADDRESS: '',
  //   SAVINGS_POOL_ADDRESS: '',
  //   SAVINGS_V2_POOL_ADDRESS: '',
  //   SAVINGS_V2_VESTING_ADDRESS: '',
  //   GOVERNANCE_DEX: '',
  //   DEX: [
  //     // TODO: Remove this array
  //     {
  //       token1: ithacanetTokens.xtzToken,
  //       token2: ithacanetTokens.udefiToken,
  //       dexType: DexType.QUIPUSWAP,
  //       address: ''
  //     },
  //     {
  //       token1: ithacanetTokens.uusdToken,
  //       token2: ithacanetTokens.udefiToken,
  //       dexType: DexType.PLENTY,
  //       address: ''
  //     }
  //   ]
  // },
  // {
  //   id: 'uBTC',
  //   symbol: 'uBTC',
  //   metadata: {
  //     targetSymbol: 'BTC',
  //     impliedPrice: 1.25,
  //     new: true,
  //     doubleRewards: ''
  //   },

  //   collateralOptions: [
  //     {
  //       token: ithacanetTokens.xtzToken,
  //       TARGET_ORACLE_ADDRESS: '',
  //       TARGET_ORACLE_DECIMALS: 6,
  //       ORACLE_SYMBOL: 'BTC',
  //       ENGINE_ADDRESS: '',
  //       ENGINE_TYPE: EngineType.TRACKER_V2,
  //       OPTIONS_LISTING_ADDRESS: '',
  //       SUPPORTS_BAILOUT: true,
  //       HAS_OBSERVED_PRICE: true
  //     }
  //   ],
  //   token: ithacanetTokens.ubtcToken,
  //   governanceToken: ithacanetTokens.youToken,
  //   REWARD_POOL_ADDRESS: '',
  //   SAVINGS_POOL_ADDRESS: '',
  //   SAVINGS_V2_POOL_ADDRESS: '',
  //   SAVINGS_V2_VESTING_ADDRESS: '',
  //   GOVERNANCE_DEX: '',
  //   DEX: [
  //     // TODO: Remove this array
  //     {
  //       token1: ithacanetTokens.xtzToken,
  //       token2: ithacanetTokens.udefiToken,
  //       dexType: DexType.QUIPUSWAP,
  //       address: ''
  //     },
  //     {
  //       token1: ithacanetTokens.uusdToken,
  //       token2: ithacanetTokens.udefiToken,
  //       dexType: DexType.PLENTY,
  //       address: ''
  //     }
  //   ]
  // },
  {
    id: 'uXAU', // uXAU
    symbol: 'uXAU', // uXAU
    metadata: {
      targetSymbol: 'XAU',
      impliedPrice: 1.25,
      new: true,
      doubleRewards: '',
      isMarket: true
    },
    collateralOptions: [
      {
        token: ithacanetTokens.usdtToken,
        targetOracle: {
          address: 'KT193w5bMZTzUaVqi8UXmNaaUK2CsMK6DP7T',
          decimals: 6,
          entrypoint: 'get_price',
          isView: true,
          isMarket: true
        },
        ORACLE_SYMBOL: 'XAU',
        ENGINE_ADDRESS: 'KT1SYK5UnacFrVmoAcWoat69HtjAnRwt9tyc',
        ENGINE_TYPE: EngineType.TRACKER_V3,
        OPTIONS_LISTING_ADDRESS: 'KT1BaRwoNk62jDyQeGnMso7x5nC5ZoytN7ot',
        SUPPORTS_BAILOUT: false,
        SUPPORTS_CONVERSION: false,
        HAS_OBSERVED_PRICE: true,
        collateralTarget: 1.15,
        collateralWarning: 1.12,
        collateralEmergency: 1.1,
        isLatest: true,
        new: true
      }
    ],
    token: ithacanetTokens.uxauToken,
    governanceToken: ithacanetTokens.youToken,
    REWARD_POOL_ADDRESS: 'KT1C9dmcZLs3QLnDZ8oXEHHgbXqfme3JMAh4', //tz1YY1LvD6TFH4z74pvxPQXBjAKHE5tB5Q8f
    SAVINGS_POOL_ADDRESS: '',
    SAVINGS_V2_POOL_ADDRESS: '',
    SAVINGS_V3_POOL_ADDRESS: 'KT1DRoTPmuC5dkNwi15bb3jCA3K1LPixgEdq',
    SAVINGS_V2_VESTING_ADDRESS: '',
    GOVERNANCE_DEX: '',
    DEX: []
  }
]

export const ithacanetNetworkConstants: NetworkConstants = {
  fakeAddress: 'tz1Mj7RzPmMAqDUNFBn5t5VbXmWW4cSUAdtT',
  natViewerCallback: 'KT1HDUeKqTvmvFXTyz9Hei3HMhjdmETiQNmx%set_nat',
  balanceOfViewerCallback: 'KT1VAnNhBs3p8CLS6da5fWLLQXw6t4LbBu9e',
  addressViewerCallback: 'KT1HDUeKqTvmvFXTyz9Hei3HMhjdmETiQNmx%set_address',
  tokens: ithacanetTokens,
  farms: ithacanetFarms,
  dexes: ithacanetDexes,
  unifiedStaking: 'KT1C9dmcZLs3QLnDZ8oXEHHgbXqfme3JMAh4',
  bailoutPool: 'KT1Fgt53nb9vjwNQx4vnpRjyafDVUnqxLjcR',
  ctezTezDex: 'KT1H5b7LxEExkFd2Tng77TfuWbM5aPvHstPr',
  dao: 'KT1RqqBxTQZ1VqjUfRgQLAsf7rJaTG8dznvN',
  legacyDaos: ['KT1S8e8M55cXMfXuoD6bkSoXRTsfwMF9eNdy']
}
