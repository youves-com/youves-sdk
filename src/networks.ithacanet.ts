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
  uusdToken
} from './networks.base'
import { Token } from './tokens/token'

export const ithacanetTokens: Record<string, Token> = {
  xtzToken: { ...xtzToken, contractAddress: 'EMPTY' },
  youToken: { ...youToken, contractAddress: 'KT1J4CiyWPmtFPXAjpgBezM5hoVHXHNzWBHK' },
  // tzbtcLP: { ...tzbtcLPToken, decimals: 18, contractAddress: '' },
  // uusdToken: { ...uusdToken, contractAddress: '' },
  // udefiToken: { ...udefiToken, contractAddress: '' },
  // ubtcToken: { ...ubtcToken, contractAddress: '' },
  uusdToken: { ...uusdToken, contractAddress: '', tokenId: 0 }
  // plentyToken: { ...plentyToken, contractAddress: 'EMPTY' },
  // wusdcToken: { ...wusdc, contractAddress: '' },
  // wwbtcToken: { ...wwbtc, contractAddress: '' },
  // uusdwusdcLP: { ...uusdwusdcLP, contractAddress: '' },
  // ubtctzbtcLP: { ...ubtctzbtcLP, contractAddress: '' },
  // tzbtcuusdLP: { ...tzbtcwwbtcLP, decimals: 12, contractAddress: '' }
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
  // {
  //   token1: ithacanetTokens.tzbtcLP,
  //   token2: ithacanetTokens.uusdToken,
  //   dexType: DexType.FLAT_CURVE,
  //   contractAddress: '',
  //   liquidityToken: ithacanetTokens.tzbtcuusdLP
  // },
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
  // {
  //   id: 'uUSD',
  //   symbol: 'uUSD',
  //   metadata: {
  //     targetSymbol: 'USD',
  //     impliedPrice: 1.25,
  //     new: false,
  //     doubleRewards: ''
  //   },
  //   collateralOptions: [
  //     {
  //       token: ithacanetTokens.xtzToken,
  //       TARGET_ORACLE_ADDRESS: '',
  //       TARGET_ORACLE_DECIMALS: 6,
  //       ORACLE_SYMBOL: 'XTZ',
  //       ENGINE_ADDRESS: '',
  //       ENGINE_TYPE: EngineType.TRACKER_V1,
  //       OPTIONS_LISTING_ADDRESS: '',
  //       SUPPORTS_BAILOUT: true,
  //       HAS_OBSERVED_PRICE: true
  //     },
  //     {
  //       token: ithacanetTokens.tzbtcLP,
  //       TARGET_ORACLE_ADDRESS: '',
  //       TARGET_ORACLE_DECIMALS: 6,
  //       ORACLE_SYMBOL: 'BTC',
  //       ENGINE_ADDRESS: '',
  //       ENGINE_TYPE: EngineType.TRACKER_V2,
  //       OPTIONS_LISTING_ADDRESS: '',
  //       SUPPORTS_BAILOUT: false,
  //       HAS_OBSERVED_PRICE: false
  //     }
  //   ],
  //   token: ithacanetTokens.uusdToken,
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
  //       token2: ithacanetTokens.uusdToken,
  //       dexType: DexType.QUIPUSWAP,
  //       address: ''
  //     },
  //     {
  //       token1: ithacanetTokens.udefiToken,
  //       token2: ithacanetTokens.uusdToken,
  //       dexType: DexType.PLENTY,
  //       address: ''
  //     }
  //   ]
  // },
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
    id: 'uUSD', // cCHF
    symbol: 'uUSD', // cCHF
    metadata: {
      targetSymbol: 'CHF',
      impliedPrice: 1.25,
      new: true,
      doubleRewards: ''
    },
    collateralOptions: [
      {
        token: ithacanetTokens.xtzToken,
        TARGET_ORACLE_ADDRESS: '',
        TARGET_ORACLE_DECIMALS: 6, // TODO: Correct?
        ORACLE_SYMBOL: 'XTZ', // TODO
        ENGINE_ADDRESS: '',
        ENGINE_TYPE: EngineType.CHECKER_V1,
        OPTIONS_LISTING_ADDRESS: '',
        SUPPORTS_BAILOUT: false,
        // SUPPORTS_CONVERSION: false,
        HAS_OBSERVED_PRICE: true
      }
    ],
    token: ithacanetTokens.uusdToken, // cchfToken
    governanceToken: ithacanetTokens.youToken,
    REWARD_POOL_ADDRESS: '',
    SAVINGS_POOL_ADDRESS: '',
    SAVINGS_V2_POOL_ADDRESS: '',
    SAVINGS_V2_VESTING_ADDRESS: '',
    GOVERNANCE_DEX: '',
    DEX: []
  }
]

export const ithacanetNetworkConstants: NetworkConstants = {
  fakeAddress: 'tz1Mj7RzPmMAqDUNFBn5t5VbXmWW4cSUAdtT',
  natViewerCallback: 'KT1HDUeKqTvmvFXTyz9Hei3HMhjdmETiQNmx%set_nat',
  balanceOfViewerCallback: '',
  addressViewerCallback: 'KT1HDUeKqTvmvFXTyz9Hei3HMhjdmETiQNmx%set_address',
  tokens: ithacanetTokens,
  farms: ithacanetFarms,
  dexes: ithacanetDexes
}
