import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { mainnetTokens } from '../networks.mainnet'
import { Token } from '../tokens/token'
import { calculateAPR, sendAndAwait } from '../utils'
import { YouvesIndexer } from '../YouvesIndexer'

interface UnifiedStake {
  age_timestamp: string
  stake: BigNumber
  token_amount: BigNumber
}
export class UnifiedStaking {
  public readonly stakingContract: string = 'KT1PkNCTXtQPVuxD1B6BVo8QCjKbM15X38Jw'
  public readonly stakeToken: Token = mainnetTokens.youToken // TODO: Replace depending on network
  public readonly rewardToken: Token = mainnetTokens.youToken // TODO: Replace depending on network

  constructor(private readonly tezos: TezosToolkit, protected readonly indexerUrl: string) {}

  async getOwnStakeIds(): Promise<BigNumber[]> {
    const owner = await this.getOwnAddress()
    const stakingPoolContract = await this.getContractWalletAbstraction(this.stakingContract)
    const dexStorage: any = (await this.getStorageOfContract(stakingPoolContract)) as any

    const stakeIds: BigNumber[] = await this.getStorageValue(dexStorage, 'stakes_owner_lookup', owner)

    return stakeIds
  }

  async getOwnStakes(): Promise<UnifiedStake[]> {
    const stakeIds = await this.getOwnStakeIds()

    const stakingPoolContract = await this.getContractWalletAbstraction(this.stakingContract)
    const dexStorage: any = (await this.getStorageOfContract(stakingPoolContract)) as any

    const stakes: UnifiedStake[] = await Promise.all(stakeIds.map((id) => this.getStorageValue(dexStorage, 'stakes', id)))

    return stakes
  }

  async getOwnTotalStake(): Promise<BigNumber> {
    const stakes = await this.getOwnStakes()

    return stakes.reduce((pv, cv) => pv.plus(cv.token_amount), new BigNumber(0))
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
    const stakingPoolContract = await this.getContractWalletAbstraction(this.stakingContract)
    const rewardsPoolStorage: any = (await this.getStorageOfContract(stakingPoolContract)) as any

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

    console.log(indexer.getTransferAggregateOverTime(this.stakingContract, this.rewardToken, from, to))

    return new BigNumber(7_000_000_000_000)
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
