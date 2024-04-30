import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { NetworkConstants } from '../networks.base'
import { Token } from '../tokens/token'
import { IndexerConfig } from '../types'
import { calculateAPR, getFA2Balance, getMillisFromDays, getMillisFromSeconds, getMillisFromYears, round, sendAndAwait } from '../utils'
import { YouvesIndexer } from '../YouvesIndexer'

export interface UnifiedStakeItem {
  id: BigNumber
  age_timestamp: string
  stake: BigNumber
  token_amount: BigNumber
}

export interface UnifiedStakeExtendedItem {
  id: BigNumber
  age_timestamp: string
  stake: BigNumber
  token_amount: BigNumber
  endTimestamp: string
  originalStake: BigNumber
  rewardTotal: BigNumber
  rewardNow: BigNumber
  rewardNowPercentage: BigNumber
}
export class UnifiedStaking {
  public readonly stakingContract: string
  public readonly stakeToken: Token
  public readonly rewardToken: Token

  constructor(
    protected readonly tezos: TezosToolkit,
    protected readonly indexerConfig: IndexerConfig,
    public readonly networkConstants: NetworkConstants
  ) {
    this.stakingContract = this.networkConstants.unifiedStaking
    this.stakeToken = (this.networkConstants.tokens as any).youToken
    this.rewardToken = (this.networkConstants.tokens as any).youToken
  }

  async getOwnStakeIds(): Promise<BigNumber[]> {
    const owner = await this.getOwnAddress()
    const stakingPoolContract = await this.getContractWalletAbstraction(this.stakingContract)
    const dexStorage: any = (await this.getStorageOfContract(stakingPoolContract)) as any

    const stakeIds: BigNumber[] = await this.getStorageValue(dexStorage, 'stakes_owner_lookup', owner)

    return stakeIds ?? []
  }

  async getOwnStakes(): Promise<UnifiedStakeItem[]> {
    const stakeIds = await this.getOwnStakeIds()

    const stakingPoolContract = await this.getContractWalletAbstraction(this.stakingContract)
    const dexStorage: any = (await this.getStorageOfContract(stakingPoolContract)) as any

    const stakes: UnifiedStakeItem[] = await Promise.all(
      stakeIds.map(async (id) => ({ id, ...(await this.getStorageValue(dexStorage, 'stakes', id)) }))
    )

    return stakes
  }

  async getOwnStakesWithExtraInfo(): Promise<UnifiedStakeExtendedItem[]> {
    const stakes = await this.getOwnStakes()
    const stakingPoolContract = await this.getContractWalletAbstraction(this.stakingContract)
    const dexStorage: any = (await this.getStorageOfContract(stakingPoolContract)) as any

    const rewardTokenBalance = new BigNumber(
      await getFA2Balance(
        this.stakingContract,
        this.rewardToken.contractAddress,
        this.rewardToken.tokenId,
        this.tezos,
        this.networkConstants.fakeAddress,
        this.networkConstants.balanceOfViewerCallback
      )
    )

    return Promise.all(
      stakes.map(async (stake) => {
        // const rewardTotal = dexStorage.disc_factor.times(stake.stake).shiftedBy(-1 * mainnetTokens.youToken.decimals)
        const claimNowFactor = await this.getClaimNowFactor(stake)
        const entireWithdrawableAmount = rewardTokenBalance.times(stake.stake).div(dexStorage.total_stake)

        return {
          ...stake,
          endTimestamp: new Date(new Date(stake.age_timestamp).getTime() + dexStorage.max_release_period * 1000).toString(),
          originalStake: stake.token_amount,
          rewardTotal: round(BigNumber.max(0, entireWithdrawableAmount.minus(stake.token_amount))),
          rewardNow: round(BigNumber.max(0, entireWithdrawableAmount.minus(stake.token_amount).times(claimNowFactor))),
          rewardNowPercentage: claimNowFactor.times(100).decimalPlaces(2, BigNumber.ROUND_DOWN)
        }
      })
    )
  }

  async getDepositFee(): Promise<BigNumber> {
    return new BigNumber(0)
  }

  async getOwnTotalStake(): Promise<BigNumber> {
    const stakes = await this.getOwnStakes()

    return stakes.reduce((pv, cv) => pv.plus(cv.token_amount), new BigNumber(0))
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

  async dailyRewards() {
    // We take the last week to get an average
    const fromDate = new Date(new Date().getTime() - getMillisFromDays(7))
    const toDate = new Date()

    return (await this.getTransactionValueInTimeframe(fromDate, toDate)).div(7)
  }

  async getClaimableRewards(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    const stakingPoolContract = await this.getContractWalletAbstraction(this.stakingContract)
    const rewardsPoolStorage: any = (await this.getStorageOfContract(stakingPoolContract)) as any

    let currentDistFactor = new BigNumber(rewardsPoolStorage.dist_factor)
    const ownStake = new BigNumber(await this.getStorageValue(rewardsPoolStorage, 'stakes', source))
    const ownDistFactor = new BigNumber(await this.getStorageValue(rewardsPoolStorage, 'dist_factors', source))

    return ownStake.multipliedBy(currentDistFactor.minus(ownDistFactor)).dividedBy(10 ** this.rewardToken.decimals)
  }

  async getClaimNowFactor(stake: UnifiedStakeItem): Promise<BigNumber> {
    if (!stake) {
      return new BigNumber(0)
    }

    const stakingPoolContract = await this.getContractWalletAbstraction(this.stakingContract)
    const dexStorage: any = (await this.getStorageOfContract(stakingPoolContract)) as any

    const dateStaked = new Date(stake.age_timestamp)

    const secondsSinceStaked = (Date.now() - dateStaked.getTime()) / getMillisFromSeconds(1)

    const factor = secondsSinceStaked / dexStorage.max_release_period

    return BigNumber.min(1, BigNumber.max(factor, 0))
  }

  async getAPR(assetToUsdExchangeRate: BigNumber, governanceToUsdExchangeRate: BigNumber) {
    const totalStake = (await this.getPoolBalance()).shiftedBy(-1 * this.stakeToken.decimals)

    const fromDate = new Date(new Date().getTime() - getMillisFromDays(7))
    const toDate = new Date()

    const weeklyTransactionValue = (await this.getTransactionValueInTimeframe(fromDate, toDate)).shiftedBy(-1 * this.rewardToken.decimals)

    const yearlyFactor = new BigNumber(getMillisFromYears(1) / (toDate.getTime() - fromDate.getTime()))

    return calculateAPR(totalStake, weeklyTransactionValue, yearlyFactor, assetToUsdExchangeRate, governanceToUsdExchangeRate)
  }

  async getTransactionValueInTimeframe(from: Date, to: Date): Promise<BigNumber> {
    const indexer = new YouvesIndexer(this.indexerConfig)

    const pool = 'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE' // This is the pool where YOUs are swapped and sent to the unified staking contract. Currently, this is the only source of rewards. In the future, we might have to filter for multiple senders.

    return indexer.getTransferAggregateOverTime(this.stakingContract, this.rewardToken, from, to, pool)
  }

  /**
   * Operations
   */
  async deposit(stakeId: number, tokenAmount: BigNumber) {
    const stakingContract = await this.getContractWalletAbstraction(this.stakingContract)
    const tokenContract = await this.tezos.wallet.at(this.stakeToken.contractAddress)

    let batchCall = this.tezos.wallet.batch()

    const source = await this.getOwnAddress()

    batchCall = batchCall.withContractCall(
      tokenContract.methods.update_operators([
        { add_operator: { owner: source, operator: this.stakingContract, token_id: Number(this.stakeToken.tokenId) } }
      ])
    )

    batchCall = batchCall.withContractCall(stakingContract.methods.deposit(stakeId, tokenAmount))

    batchCall = batchCall.withContractCall(
      tokenContract.methods.update_operators([
        { remove_operator: { owner: source, operator: this.stakingContract, token_id: Number(this.stakeToken.tokenId) } }
      ])
    )

    return this.sendAndAwait(batchCall)
  }

  async withdraw(stakeId: number, ratioNumerator: number, ratioDenominator: number) {
    const stakingContract = await this.getContractWalletAbstraction(this.stakingContract)

    return this.sendAndAwait(stakingContract.methods.withdraw(ratioDenominator, ratioNumerator, stakeId))
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
