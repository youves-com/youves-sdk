import { TezosToolkit } from '@taquito/taquito'
import { Farm, FarmType, NetworkConstants } from '../networks.base'
import { IndexerConfig } from '../types'
import { LPTokenFarm } from './farm'
import { IncentivisedLPTokenFarm } from './incentivized-farm'
import { PlentyFarm } from './plenty-farm'
import { YieldPool } from './yield-pool'
import { MultiPool } from './multi-pool'

export const createFarm = (config: {
  tezos: TezosToolkit
  farm: Farm
  indexerConfig: IndexerConfig
  networkConstants: NetworkConstants
}): LPTokenFarm | YieldPool | MultiPool => {
  if (config.farm.type === FarmType.NO_LOCK) {
    return new LPTokenFarm(config.tezos, config.farm, config.indexerConfig, config.networkConstants)
  } else if (config.farm.type === FarmType.INCENTIVISED) {
    return new IncentivisedLPTokenFarm(config.tezos, config.farm, config.indexerConfig, config.networkConstants)
  } else if (config.farm.type === FarmType.PLENTY) {
    return new PlentyFarm(config.tezos, config.farm, config.indexerConfig, config.networkConstants)
  } else if (config.farm.type === FarmType.YIELD_POOL) {
    return new YieldPool(config.tezos, config.farm, config.indexerConfig, config.networkConstants)
  } else if (config.farm.type === FarmType.MULTI_POOL) {
    return new MultiPool(config.tezos, config.farm, config.indexerConfig, config.networkConstants)
  } else {
    throw new Error('Farm type not supported')
  }
}
