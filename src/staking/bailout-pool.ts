import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'
import { NetworkConstants } from '../networks.base'
import { IndexerConfig } from '../types'
import BigNumber from 'bignumber.js'
import { getFA2Balance, sendAndAwait } from '../utils'
import { YouvesIndexer } from '../YouvesIndexer'
import { Token } from '../tokens/token'

export interface BailoutStakeItem {
  id: BigNumber
  amount: BigNumber
  reward_weight: BigNumber
  bailout_weight: BigNumber
  accumulated_rewards: BigNumber
  accumulated_bailouts: BigNumber
  cooldown_duration: BigNumber
  cooldown_start_timestamp: string
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
    this.stakingContract = this.networkConstants.bailoutPool
    this.stakeToken = (this.networkConstants.tokens as any).youToken
    this.rewardToken = (this.networkConstants.tokens as any).youToken
  }

  async getOwnStakeIds(): Promise<BigNumber[]> {
    const owner = await this.getOwnAddress()
    const stakingPoolContract = await this.getContractWalletAbstraction(this.stakingContract)
    const storage: any = (await this.getStorageOfContract(stakingPoolContract)) as any

    const stakeIds: BigNumber[] = await this.getStorageValue(storage, 'stakes_owner_lookup', owner)

    console.log('stakeIds', stakeIds)

    return stakeIds ?? []
  }

  async getOwnStakes(): Promise<BailoutStakeItem[]> {
    const stakeIds = await this.getOwnStakeIds()

    const stakingPoolContract = await this.getContractWalletAbstraction(this.stakingContract)
    const storage: any = (await this.getStorageOfContract(stakingPoolContract)) as any

    const stakes: BailoutStakeItem[] = await Promise.all(
      stakeIds.map(async (id) => ({ id, ...(await this.getStorageValue(storage, 'stakes', id)) }))
    )

    console.log('own stakes', stakes)

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

  async getMaxCooldownDuration(): Promise<BigNumber> {
    const stakingContract = await this.getContractWalletAbstraction(this.stakingContract)
    const storage: any = (await this.getStorageOfContract(stakingContract)) as any

    return storage.max_cooldown_duration
  }
  async commit(tokenAmount: BigNumber, cooldownDuration: BigNumber, stakeId?: BigNumber) {
    const stakingContract = await this.getContractWalletAbstraction(this.stakingContract)
    const tokenContract = await this.tezos.wallet.at(this.stakeToken.contractAddress)

    console.log('staking contract', stakingContract)

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

    return this.sendAndAwait(stakingContract.methods.withdraw(stakeId))
  }

  async enter_cooldown(stakeId: BigNumber) {
    const stakingContract = await this.getContractWalletAbstraction(this.stakingContract)

    return this.sendAndAwait(stakingContract.methods.enter_cooldown(stakeId))
  }

  async recommit(stakeId: BigNumber) {
    const stakingContract = await this.getContractWalletAbstraction(this.stakingContract)

    return this.sendAndAwait(stakingContract.methods.recommit(stakeId))
  }

  async getAPR(): Promise<BigNumber> {
    return Promise.resolve(new BigNumber(0))
  }

  async getOwnTotalStake(): Promise<BigNumber> {
    const stakes = await this.getOwnStakes()

    return stakes.reduce((pv, cv) => pv.plus(cv.amount), new BigNumber(0))
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
