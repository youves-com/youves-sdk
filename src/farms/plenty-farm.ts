import { TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { Farm, NetworkConstants } from '../networks.base'
import { IndexerConfig } from '../types'
import { LPTokenFarm } from './farm'

export class PlentyFarm extends LPTokenFarm {
  constructor(tezos: TezosToolkit, farm: Farm, indexerConfig: IndexerConfig, networkConstants: NetworkConstants) {
    super(tezos, farm, indexerConfig, networkConstants)
  }

  async getOwnStake() {
    const source = await this.getOwnAddress()
    const farmContract = await this.getContractWalletAbstraction(this.farm.farmContract)
    const farmStorage: any = (await this.getStorageOfContract(farmContract)) as any

    const stake: BigNumber = await this.getStorageValue(farmStorage, 'balances', source)
    return new BigNumber(stake ?? 0)
  }
}
