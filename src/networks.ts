import { Assets } from './networks.base'
import { hangzhounetContracts } from './networks.hangzhounet'
import { mainnetContracts } from './networks.mainnet'

export const contracts: Assets = {
  mainnet: mainnetContracts,
  hangzhounet: hangzhounetContracts
}
