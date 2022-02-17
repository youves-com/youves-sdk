import { TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { Farm } from '../networks.base'
import { LPTokenFarm } from './farm'

interface StakeStorage {}

export class IncentivisedLPTokenFarm extends LPTokenFarm {
  constructor(tezos: TezosToolkit, farm: Farm, indexerUrl: string) {
    super(tezos, farm, indexerUrl)
  }

  async getClaimableRewards() {
    const source = await this.getOwnAddress()
    const rewardsPoolContract = await this.getContractWalletAbstraction(this.farm.farmContract)
    const rewardsPoolStorage: any = (await this.getStorageOfContract(rewardsPoolContract)) as any

    const stake: StakeStorage = await this.getStorageValue(rewardsPoolStorage, 'stakes', source)

    console.log('INCENTIVISED STAKE', stake)

    let currentDistFactor = new BigNumber(rewardsPoolStorage.dist_factor)
    const ownStake = new BigNumber(1)

    return ownStake.multipliedBy(currentDistFactor.minus(1)).dividedBy(10 ** this.farm.lpToken.decimals)
  }

  async getClaimFactor(): Promise<number> {
    return 1
  }
}
