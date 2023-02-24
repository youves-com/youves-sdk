import { TezosToolkit } from '@taquito/taquito'
import { CollateralInfo, AssetDefinition, EngineType, NetworkConstants } from '../networks.base'
import { Storage } from '../public'
import { Token, TokenSymbol } from '../tokens/token'
import { YouvesEngine } from './YouvesEngine'
import { TrackerV1Engine } from './TrackerV1Engine'
import { TrackerV2Engine } from './TrackerV2Engine'
import { CheckerV1Engine } from './CheckerV1Engine'
import { IndexerConfig } from '../types'
import { TrackerV3Engine } from './TrackerV3Engine'

export const createEngine = (config: {
  tezos: TezosToolkit
  contracts: AssetDefinition
  storage: Storage
  indexerConfig: IndexerConfig
  tokens: Record<TokenSymbol | any, Token>
  activeCollateral: CollateralInfo
  networkConstants: NetworkConstants
}): YouvesEngine => {
  if (config.activeCollateral.ENGINE_TYPE === EngineType.CHECKER_V1) {
    return new CheckerV1Engine(
      config.tezos,
      config.contracts,
      config.storage,
      config.indexerConfig,
      config.tokens,
      config.activeCollateral,
      config.networkConstants
    )
  } else if (config.activeCollateral.ENGINE_TYPE === EngineType.TRACKER_V2) {
    return new TrackerV2Engine(
      config.tezos,
      config.contracts,
      config.storage,
      config.indexerConfig,
      config.tokens,
      config.activeCollateral,
      config.networkConstants
    )
  } else if (config.activeCollateral.ENGINE_TYPE === EngineType.TRACKER_V3 || config.activeCollateral.ENGINE_TYPE === EngineType.TRACKER_V3_0) {
    return new TrackerV3Engine(
      config.tezos,
      config.contracts,
      config.storage,
      config.indexerConfig,
      config.tokens,
      config.activeCollateral,
      config.networkConstants
    )
  } else {
    return new TrackerV1Engine(
      config.tezos,
      config.contracts,
      config.storage,
      config.indexerConfig,
      config.tokens,
      config.activeCollateral,
      config.networkConstants
    )
  }
}
