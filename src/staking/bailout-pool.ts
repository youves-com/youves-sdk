import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'
import { NetworkConstants } from '../networks.base'
import { IndexerConfig } from '../types'
import { Token } from '../tokens/token'
import BigNumber from 'bignumber.js'
import { calculateAPR, getFA2Balance, getMillisFromDays, getMillisFromYears, sendAndAwait } from '../utils'
import { YouvesIndexer } from '../YouvesIndexer'

export interface BailoutStakeItem {
  id: BigNumber
  amount: BigNumber
  reward_weight: BigNumber
  bailout_weight: BigNumber
  accumulated_rewards: BigNumber
  accumulated_bailouts: BigNumber
  cooldown_duration: BigNumber
  cooldonw_start_timestamp: string
  reward_factor: BigNumber
  bailout_factor: BigNumber
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

  async getOwnStakes(): Promise<BailoutStakeItem[]> {
    const stakeIds = await this.getOwnStakeIds()

    const stakingPoolContract = await this.getContractWalletAbstraction(this.stakingContract)
    const dexStorage: any = (await this.getStorageOfContract(stakingPoolContract)) as any

    const stakes: BailoutStakeItem[] = await Promise.all(
      stakeIds.map(async (id) => ({ id, ...(await this.getStorageValue(dexStorage, 'stakes', id)) }))
    )

    return stakes
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

  async getOwnTotalStake(): Promise<BigNumber> {
    const stakes = await this.getOwnStakes()

    return stakes.reduce((pv, cv) => pv.plus(cv.amount), new BigNumber(0))
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

    const pool = 'KT1K9hiEmnNyfuwoL2S14YuULUC9E5ciguNN' // This is the pool where YOUs are swapped and sent to the unified staking contract. Currently, this is the only source of rewards. In the future, we might have to filter for multiple senders.

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
