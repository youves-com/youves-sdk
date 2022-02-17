import { TezosToolkit } from '@taquito/taquito'
import { Farm, FarmType } from '../networks.base'
import { LPTokenFarm } from './farm'
import { IncentivisedLPTokenFarm } from './incentivized-farm'

export const createFarm = (config: { tezos: TezosToolkit; farm: Farm; indexerUrl: string }): LPTokenFarm => {
  if (config.farm.type === FarmType.NO_LOCK) {
    return new LPTokenFarm(config.tezos, config.farm, config.indexerUrl)
  } else if (config.farm.type === FarmType.INCENTIVISED) {
    return new IncentivisedLPTokenFarm(config.tezos, config.farm, config.indexerUrl)
  } else {
    throw new Error('Farm type not supported')
  }
}
