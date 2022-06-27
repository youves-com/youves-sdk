import { TezosToolkit } from '@taquito/taquito'
import { Farm, FarmType } from '../networks.base'
import { IndexerConfig } from '../types'
import { LPTokenFarm } from './farm'
import { IncentivisedLPTokenFarm } from './incentivized-farm'

export const createFarm = (config: { tezos: TezosToolkit; farm: Farm; indexerConfig: IndexerConfig }): LPTokenFarm => {
  if (config.farm.type === FarmType.NO_LOCK) {
    return new LPTokenFarm(config.tezos, config.farm, config.indexerConfig)
  } else if (config.farm.type === FarmType.INCENTIVISED) {
    return new IncentivisedLPTokenFarm(config.tezos, config.farm, config.indexerConfig)
  } else {
    throw new Error('Farm type not supported')
  }
}
