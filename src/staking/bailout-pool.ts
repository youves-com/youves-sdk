import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'
import { NetworkConstants } from '../networks.base'
import { IndexerConfig } from '../types'
import BigNumber from 'bignumber.js'
import { calculateAPR, getFA2Balance, getMillisFromDays, getMillisFromYears, sendAndAwait } from '../utils'
import { YouvesIndexer } from '../YouvesIndexer'
import { Token } from '../tokens/token'
export interface BailoutStakeItem {
  id: BigNumber
  amount: BigNumber
  reward_weight: BigNumber
  accumulated_rewards: BigNumber
  accumulated_bailouts: BigNumber
  cooldown_duration: BigNumber
  cooldown_start_timestamp: string
  reward_factor: BigNumber
}

export interface BailoutVotingDetails {
  id: BigNumber
  token_amount: BigNumber
  vote_weight: BigNumber
  owner: string
}

export class BailoutPool {
  public readonly stakingContract: string
  public readonly stakeToken: Token
  public readonly rewardToken: Token

  constructor(
    protected readonly tezos: TezosToolkit,
    protected readonly indexerConfig: IndexerConfig,
    public readonly networkConstants: NetworkConstants
  ) {
    this.stakingContract = this.networkConstants.bailoutPool
    this.stakeToken = (this.networkConstants.tokens as any).youToken
    this.rewardToken = (this.networkConstants.tokens as any).youToken
  }

  async getOwnStakeIds(): Promise<BigNumber[]> {
    const owner = await this.getOwnAddress()
    const indexer = new YouvesIndexer(this.indexerConfig)

    const stakeIds = (await indexer.getStakeIdsByOwner(owner)).map((id) => new BigNumber(id.stake_id))
    return stakeIds
  }

  async getOwnStakes(): Promise<BailoutStakeItem[]> {
    const stakeIds = await this.getOwnStakeIds()

    const stakingPoolContract = await this.getContractWalletAbstraction(this.stakingContract)

    const stakes: BailoutStakeItem[] = await Promise.all(
      stakeIds.map(async (id) => {
        const stakeData = await stakingPoolContract.contractViews.view_stake_info(id).executeView({
          viewCaller: this.stakingContract
        })

        return {
          id,
          ...stakeData
        } as BailoutStakeItem
      })
    )

    return stakes
  }

  async getOwnStakesVotingDetails(): Promise<BailoutVotingDetails[]> {
    const stakeIds = await this.getOwnStakeIds()

    const stakingPoolContract = await this.getContractWalletAbstraction(this.stakingContract)

    const stakes: BailoutVotingDetails[] = await Promise.all(
      stakeIds.map(async (id) => {
        const stakeData = await stakingPoolContract.contractViews.get_voting_details(id).executeView({
          viewCaller: this.stakingContract
        })

        return {
          id,
          ...stakeData
        } as BailoutVotingDetails
      })
    )

    return stakes
  }

  async getTotalRewardsStakeWeight(): Promise<BigNumber> {
    const stakingPoolContract = await this.getContractWalletAbstraction(this.stakingContract)
    return await stakingPoolContract.contractViews.get_total_reward_stake_weight().executeView({
      viewCaller: this.stakingContract
    })
  }

  async getPoolBalance(): Promise<BigNumber> {
    return new BigNumber(
      await getFA2Balance(
        this.stakingContract,
        (this.networkConstants.tokens as any).youToken.contractAddress,
        0,
        this.tezos,
        this.networkConstants.fakeAddress,
        this.networkConstants.balanceOfViewerCallback
      )
    )
  }

  async getMaxCooldownDuration(): Promise<BigNumber> {
    const stakingContract = await this.getContractWalletAbstraction(this.stakingContract)
    const storage: any = (await this.getStorageOfContract(stakingContract)) as any

    return storage.max_cooldown_duration
  }

  async commit(tokenAmount: BigNumber, cooldownDuration: BigNumber, stakeId?: BigNumber) {
    const stakingContract = await this.getContractWalletAbstraction(this.stakingContract)
    const tokenContract = await this.tezos.wallet.at(this.stakeToken.contractAddress)

    let batchCall = this.tezos.wallet.batch()

    const source = await this.getOwnAddress()

    batchCall = batchCall.withContractCall(
      tokenContract.methods.update_operators([
        { add_operator: { owner: source, operator: this.stakingContract, token_id: Number(this.stakeToken.tokenId) } }
      ])
    )

    batchCall = batchCall.withContractCall(stakingContract.methods.commit(tokenAmount, cooldownDuration, stakeId))

    batchCall = batchCall.withContractCall(
      tokenContract.methods.update_operators([
        { remove_operator: { owner: source, operator: this.stakingContract, token_id: Number(this.stakeToken.tokenId) } }
      ])
    )

    return this.sendAndAwait(batchCall)
  }

  async withdraw(stakeId: BigNumber) {
    const stakingContract = await this.getContractWalletAbstraction(this.stakingContract)

    let batchCall = this.tezos.wallet.batch()

    batchCall = batchCall.withContractCall(stakingContract.methods.update_parameters())
    batchCall = batchCall.withContractCall(stakingContract.methods.withdraw(stakeId))

    return this.sendAndAwait(batchCall)
  }

  async enter_cooldown(stakeId: BigNumber) {
    const stakingContract = await this.getContractWalletAbstraction(this.stakingContract)

    return this.sendAndAwait(stakingContract.methods.enter_cooldown(stakeId))
  }

  async recommit(stakeId: BigNumber) {
    const stakingContract = await this.getContractWalletAbstraction(this.stakingContract)

    return this.sendAndAwait(stakingContract.methods.recommit(stakeId))
  }

  async getAPR() {
    const totalStake = (await this.getTotalRewardsStakeWeight()).shiftedBy(-1 * this.stakeToken.decimals)

    const fromDate = new Date(new Date().getTime() - getMillisFromDays(7))
    const toDate = new Date()

    const weeklyTransactionValue = (await this.getTransactionValueInTimeframe(fromDate, toDate)).shiftedBy(-1 * this.rewardToken.decimals)

    const yearlyFactor = new BigNumber(getMillisFromYears(1) / (toDate.getTime() - fromDate.getTime()))

    return calculateAPR(totalStake, weeklyTransactionValue, yearlyFactor, new BigNumber(1), new BigNumber(1))
  }

  async dailyRewards() {
    // We take the last week to get an average
    const fromDate = new Date(new Date().getTime() - getMillisFromDays(7))
    const toDate = new Date()

    const dailyRewards = (await this.getTransactionValueInTimeframe(fromDate, toDate)).div(7)
    return dailyRewards
  }

  async getOwnTotalStake(): Promise<BigNumber> {
    const stakes = await this.getOwnStakes()

    return stakes.reduce((pv, cv) => pv.plus(cv.amount), new BigNumber(0))
  }

  async getTransactionValueInTimeframe(from: Date, to: Date): Promise<BigNumber> {
    const indexer = new YouvesIndexer(this.indexerConfig)

    const pool = 'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE'
    // This is the pool where YOUs are swapped and sent to the unified staking contract. Currently, this is the only source of rewards. In the future, we might have to filter for multiple senders.

    return indexer.getTransferAggregateOverTime(this.stakingContract, this.rewardToken, from, to, pool)
  }

  protected async getOwnAddress(): Promise<string> {
    return await this.tezos.wallet.pkh({ forceRefetch: true })
  }

  async sendAndAwait(walletOperation: any): Promise<string> {
    return sendAndAwait(walletOperation, () => Promise.resolve())
  }

  protected async getStorageOfContract(contract: ContractAbstraction<Wallet>) {
    return contract.storage()
  }

  protected async getStorageValue(storage: any, key: string, source: any) {
    return storage[key].get(source)
  }

  protected async getContractWalletAbstraction(address: string): Promise<ContractAbstraction<Wallet>> {
    return this.tezos.wallet.at(address)
  }
}
