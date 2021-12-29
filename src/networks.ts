import { Assets } from './networks.base'
import { granadanetContracts } from './networks.granadanet'
import { hangzhounetContracts } from './networks.hangzhounet'
import { mainnetContracts } from './networks.mainnet'

export const contracts: Assets = {
  mainnet: mainnetContracts,
  granadanet: granadanetContracts,
  hangzhounet: hangzhounetContracts
}
