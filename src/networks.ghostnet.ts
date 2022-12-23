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
  // cchfToken,
  uusdToken,
  cchfToken,
  DexType,
  ctezToken,
  ctezcchfLP,
  usdtToken
} from './networks.base'
import { Token } from './tokens/token'

export const ithacanetTokens: Record<string, Token> = {
  xtzToken: { ...xtzToken, contractAddress: 'EMPTY' },
  youToken: { ...youToken, contractAddress: 'KT1J4CiyWPmtFPXAjpgBezM5hoVHXHNzWBHK' },
  // tzbtcLP: { ...tzbtcLPToken, decimals: 18, contractAddress: '' },
  uusdToken: { ...uusdToken, contractAddress: 'KT1CrNkK2jpdMycfBdPpvTLSLCokRBhZtMq7', tokenId: 0 },
  // udefiToken: { ...udefiToken, contractAddress: '' },
  // ubtcToken: { ...ubtcToken, contractAddress: '' },
  cchfToken: { ...cchfToken, contractAddress: 'KT1DGaUvD35ni8BF2QH8FkrE1ACPEJfrxn7z', tokenId: 0 },
  ctezToken: { ...ctezToken, contractAddress: 'KT1Q4qRd8mKS7eWUgTfJzCN8RC6h9CzzjVJb' },
  // plentyToken: { ...plentyToken, contractAddress: 'EMPTY' },
  // wusdcToken: { ...wusdc, contractAddress: '' },
  // wwbtcToken: { ...wwbtc, contractAddress: '' },
  // uusdwusdcLP: { ...uusdwusdcLP, contractAddress: '' },
  // ubtctzbtcLP: { ...ubtctzbtcLP, contractAddress: '' },
  // tzbtcuusdLP: { ...tzbtcwwbtcLP, decimals: 12, contractAddress: '' }
  ctezcchfLP: { ...ctezcchfLP, decimals: 6, contractAddress: 'KT1DGaUvD35ni8BF2QH8FkrE1ACPEJfrxn7z', tokenId: 1 },
  usdtToken: { ...usdtToken, contractAddress: 'KT1P2v4NUnJ4tGSq41qwnejSFTxRF9Eevvbb', tokenId: 0 }
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
    token1: ithacanetTokens.ctezToken,
    token2: ithacanetTokens.cchfToken,
    dexType: DexType.CHECKER,
    contractAddress: 'KT1DGaUvD35ni8BF2QH8FkrE1ACPEJfrxn7z',
    liquidityToken: ithacanetTokens.ctezcchfLP
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
          entrypoint: 'get_price'
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
    REWARD_POOL_ADDRESS: 'KT1XXUzvauzUBz3c7YuKSF5x5aBjRyVa4tXi',
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
    id: 'cCHF', // cCHF
    symbol: 'cCHF', // cCHF
    metadata: {
      targetSymbol: 'CHF',
      impliedPrice: 1.25,
      new: true,
      doubleRewards: ''
    },
    collateralOptions: [
      {
        token: ithacanetTokens.xtzToken,
        targetOracle: {
          address: 'KT1N9HBTTdPvzNQgS7t6qrcCzovDr3ehJKoY ',
          decimals: 6,
          entrypoint: 'getPrice'
        },
        ORACLE_SYMBOL: 'XTZ', // TODO
        ENGINE_ADDRESS: 'KT1DGaUvD35ni8BF2QH8FkrE1ACPEJfrxn7z',
        ENGINE_TYPE: EngineType.CHECKER_V1,
        OPTIONS_LISTING_ADDRESS: '',
        SUPPORTS_BAILOUT: false,
        SUPPORTS_CONVERSION: false,
        HAS_OBSERVED_PRICE: true,
        collateralTarget: 1,
        collateralWarning: 1,
        collateralEmergency: 1,
        isLatest: true
      }
    ],
    token: ithacanetTokens.cchfToken, // cchfToken
    governanceToken: ithacanetTokens.youToken,
    REWARD_POOL_ADDRESS: 'KT1XXUzvauzUBz3c7YuKSF5x5aBjRyVa4tXi',
    SAVINGS_POOL_ADDRESS: '',
    SAVINGS_V2_POOL_ADDRESS: '',
    SAVINGS_V3_POOL_ADDRESS: '',
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
  unifiedStaking: 'KT1XXUzvauzUBz3c7YuKSF5x5aBjRyVa4tXi'
}
