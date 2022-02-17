import { TezosToolkit } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { Farm } from '../networks.base'
import { LPTokenFarm } from './farm'

interface StakeStorage {
  age_timestamp: string
  dist_factor: BigNumber
  stake: BigNumber
}

export class IncentivisedLPTokenFarm extends LPTokenFarm {
  constructor(tezos: TezosToolkit, farm: Farm, indexerUrl: string) {
    super(tezos, farm, indexerUrl)
  }

  async getOwnStake() {
    const source = await this.getOwnAddress()
    const rewardsPoolContract = await this.getContractWalletAbstraction(this.farm.farmContract)
    const rewardsPoolStorage: any = (await this.getStorageOfContract(rewardsPoolContract)) as any

    const stake: StakeStorage = await this.getStorageValue(rewardsPoolStorage, 'stakes', source)

    return new BigNumber(stake && stake.stake ? stake.stake : 0)
  }

  async getClaimableRewards() {
    const { rewardsPoolStorage, stake } = await this.getStorageAndOwnStakeInfo()

    const currentDistFactor = new BigNumber(rewardsPoolStorage.dist_factor)

    if (!stake) {
      return new BigNumber(0)
    }

    const ownStake = new BigNumber(stake.stake)

    return ownStake.multipliedBy(currentDistFactor.minus(stake.dist_factor)).dividedBy(10 ** this.farm.rewardToken.decimals)
  }

  async getClaimNowFactor(): Promise<BigNumber> {
    const { rewardsPoolStorage, stake } = await this.getStorageAndOwnStakeInfo()

    const dateStaked = new Date(stake.age_timestamp)

    const secondsSinceStaked = (Date.now() - dateStaked.getTime()) / 1000

    const factor = secondsSinceStaked / rewardsPoolStorage.max_release_period

    return BigNumber.min(1, BigNumber.max(factor, 0))
  }

  async fullyClaimableDate(): Promise<Date | undefined> {
    const { rewardsPoolStorage, stake } = await this.getStorageAndOwnStakeInfo()

    const dateStaked = new Date(stake.age_timestamp)

    return new Date(dateStaked.getTime() + rewardsPoolStorage.max_release_period * 1000)
  }

  async getTransactionValueInTimeframe(_from: Date, _to: Date): Promise<BigNumber> {
    return new BigNumber(1000).shiftedBy(12) // TODO: This is only temporary in the first week, afterwards remove this method.
  }

  private async getStorageAndOwnStakeInfo() {
    const source = await this.getOwnAddress()
    const rewardsPoolContract = await this.getContractWalletAbstraction(this.farm.farmContract)
    const rewardsPoolStorage: any = (await this.getStorageOfContract(rewardsPoolContract)) as any

    const stake: StakeStorage = await this.getStorageValue(rewardsPoolStorage, 'stakes', source)

    return { rewardsPoolStorage, stake }
  }
}
