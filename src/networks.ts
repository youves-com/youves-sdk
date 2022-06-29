import { Assets } from './networks.base'
import { ithacanetContracts } from './networks.ghostnet'
import { mainnetContracts } from './networks.mainnet'

export const contracts: Assets = {
  mainnet: mainnetContracts,
  ithacanet: ithacanetContracts
}
