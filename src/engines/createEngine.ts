import { TezosToolkit } from '@taquito/taquito'
import { CollateralInfo, AssetDefinition, EngineType } from '../networks.base'
import { Storage } from '../public'
import { Token, TokenSymbol } from '../tokens/token'
import { YouvesEngine } from './YouvesEngine'
import { TrackerV1Engine } from './TrackerV1Engine'
import { TrackerV2Engine } from './TrackerV2Engine'

export const createEngine = (config: {
  tezos: TezosToolkit
  contracts: AssetDefinition
  storage: Storage
  indexerEndpoint: string
  tokens: Record<TokenSymbol | any, Token>
  activeCollateral: CollateralInfo
}): YouvesEngine => {
  if (config.activeCollateral.ENGINE_TYPE === EngineType.CHECKER_V1) {
    throw new Error('Checker engine not supported yet.')
    // return new CheckerV1Engine(config.tezos, config.contracts, config.storage, config.indexerEndpoint, config.tokens, config.activeCollateral)
  } else if (config.activeCollateral.ENGINE_TYPE === EngineType.TRACKER_V2) {
    return new TrackerV2Engine(
      config.tezos,
      config.contracts,
      config.storage,
      config.indexerEndpoint,
      config.tokens,
      config.activeCollateral
    )
  } else {
    return new TrackerV1Engine(
      config.tezos,
      config.contracts,
      config.storage,
      config.indexerEndpoint,
      config.tokens,
      config.activeCollateral
    )
  }
}
