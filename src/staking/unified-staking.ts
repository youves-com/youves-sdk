import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { mainnetTokens } from '../networks.mainnet'
import { Token } from '../tokens/token'
import { calculateAPR, sendAndAwait } from '../utils'
import { YouvesIndexer } from '../YouvesIndexer'

interface UnifiedStake {
  ageTimestamp: string
  owner: string
  stake: BigNumber
  tokenAmount: BigNumber
}

export class UnifiedStaking {
  public readonly stakingContract: string = 'KT1T3WJih9yrtu4VEMtJJ1AwJJsT8CR6xrcH'
  public readonly stakeToken: Token = mainnetTokens.youToken // TODO: Replace depending on network
  public readonly rewardToken: Token = mainnetTokens.youToken // TODO: Replace depending on network

  constructor(private readonly tezos: TezosToolkit, protected readonly indexerUrl: string) {}

  async getOwnStakes(): Promise<UnifiedStake[]> {
    const owner = await this.getOwnAddress()
    const rewardsPoolContract = await this.getContractWalletAbstraction(this.stakingContract)
    const dexStorage: any = (await this.getStorageOfContract(rewardsPoolContract)) as any

    const stakes: UnifiedStake[] = await this.getStorageValue(dexStorage, 'stakes', owner)

    return stakes
  }

  async getPoolBalance(): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(this.stakingContract)
    const dexStorage: any = (await this.getStorageOfContract(dexContract)) as any
    return new BigNumber(dexStorage && dexStorage.total_stake ? dexStorage.total_stake : 0)
  }

  async dailyRewards() {
    // We take the last week to get an average
    const fromDate = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
    const toDate = new Date()

    return (await this.getTransactionValueInTimeframe(fromDate, toDate)).div(7)
  }

  async getClaimableRewards(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    const rewardsPoolContract = await this.getContractWalletAbstraction(this.stakingContract)
    const rewardsPoolStorage: any = (await this.getStorageOfContract(rewardsPoolContract)) as any

    let currentDistFactor = new BigNumber(rewardsPoolStorage.dist_factor)
    const ownStake = new BigNumber(await this.getStorageValue(rewardsPoolStorage, 'stakes', source))
    const ownDistFactor = new BigNumber(await this.getStorageValue(rewardsPoolStorage, 'dist_factors', source))

    return ownStake.multipliedBy(currentDistFactor.minus(ownDistFactor)).dividedBy(10 ** this.rewardToken.decimals)
  }

  async getClaimNowFactor(): Promise<BigNumber> {
    return new BigNumber(1)
  }

  async getAPR(assetToUsdExchangeRate: BigNumber, governanceToUsdExchangeRate: BigNumber) {
    const totalStake = (await this.getPoolBalance()).shiftedBy(-1 * this.stakeToken.decimals)

    const fromDate = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
    const toDate = new Date()

    const weeklyTransactionValue = (await this.getTransactionValueInTimeframe(fromDate, toDate)).shiftedBy(-1 * this.rewardToken.decimals)

    const YEAR_MILLIS = 1000 * 60 * 60 * 24 * 7 * 52
    const yearlyFactor = new BigNumber(YEAR_MILLIS / (toDate.getTime() - fromDate.getTime()))

    return calculateAPR(totalStake, weeklyTransactionValue, yearlyFactor, assetToUsdExchangeRate, governanceToUsdExchangeRate)
  }

  async getTransactionValueInTimeframe(from: Date, to: Date): Promise<BigNumber> {
    const indexer = new YouvesIndexer(this.indexerUrl)

    return indexer.getTransferAggregateOverTime(this.stakingContract, this.rewardToken, from, to)
  }

  /**
   * Operations
   */
  async claim() {
    const farmContract = await this.getContractWalletAbstraction(this.stakingContract)

    return this.sendAndAwait(farmContract.methods.claim())
  }

  async deposit(tokenAmount: BigNumber) {
    const farmContract = await this.getContractWalletAbstraction(this.stakingContract)
    const tokenContract = await this.tezos.wallet.at(this.stakeToken.contractAddress)

    let batchCall = this.tezos.wallet.batch()

    const source = await this.getOwnAddress()

    batchCall = batchCall.withContractCall(
      tokenContract.methods.update_operators([
        { add_operator: { owner: source, operator: this.stakingContract, token_id: Number(this.stakeToken.tokenId) } }
      ])
    )

    batchCall = batchCall.withContractCall(farmContract.methods.deposit(tokenAmount))

    return this.sendAndAwait(batchCall)
  }

  async withdraw() {
    const farmContract = await this.getContractWalletAbstraction(this.stakingContract)

    return this.sendAndAwait(farmContract.methods.withdraw())
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
