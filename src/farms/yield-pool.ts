import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { DexType, Farm, FlatYouvesExchangeInfo, NetworkConstants } from '../networks.base'
import { Token, TokenType } from '../tokens/token'
import { IndexerConfig } from '../types'
import { calculateAPR, getFA1p2Balance, getFA2Balance, getMillisFromDays, getMillisFromYears, round, sendAndAwait } from '../utils'
import { YouvesIndexer } from '../YouvesIndexer'
import { FlatYouvesExchangeV2 } from '../exchanges/flat-youves-swapV2'

export class YieldPool {
  public pool: FlatYouvesExchangeV2
  constructor(
    protected readonly tezos: TezosToolkit,
    protected readonly farm: Farm,
    protected readonly indexerConfig: IndexerConfig,
    public readonly networkConstants: NetworkConstants
  ) {
    const dex = this.networkConstants.dexes.find(
      (dex) => dex.token1.symbol === farm.token1.symbol && dex.token2.symbol === farm.token2.symbol && dex.dexType === DexType.FLAT_CURVE_V2
    ) as FlatYouvesExchangeInfo
    this.pool = new FlatYouvesExchangeV2(this.tezos, farm.farmContract, dex, this.networkConstants, this.indexerConfig)
    console.log(this.pool)
  }

  async getBalanceToken1() {
    const owner = await this.getOwnAddress()

    return this.getTokenAmount(this.farm.token1, owner)
  }

  async getBalanceToken2() {
    const owner = await this.getOwnAddress()

    return this.getTokenAmount(this.farm.token2, owner)
  }

  async getLPBalance() {
    const owner = await this.getOwnAddress()

    return this.getTokenAmount(this.farm.lpToken, owner)
  }

  async getOwnStake() {
    return this.pool.getOwnLiquidityPoolTokens()
  }

  async getClaimableRewards() {
    const source = await this.getOwnAddress()
    const rewardsPoolContract = await this.getContractWalletAbstraction(this.farm.farmContract)
    const rewardsPoolStorage: any = (await this.getStorageOfContract(rewardsPoolContract)) as any

    let currentDistFactor = new BigNumber(rewardsPoolStorage.dist_factor)
    const ownStake = new BigNumber(await this.getStorageValue(rewardsPoolStorage, 'stakes', source))
    const ownDistFactor = new BigNumber(await this.getStorageValue(rewardsPoolStorage, 'dist_factors', source))

    return ownStake.multipliedBy(currentDistFactor.minus(ownDistFactor)).dividedBy(10 ** this.farm.rewardToken.decimals)
  }

  async getClaimNowFactor(): Promise<BigNumber> {
    return new BigNumber(1)
  }

  async fullyClaimableDate(): Promise<Date | undefined> {
    return undefined
  }

  async getFarmBalance() {
    const poolInfo = this.pool.getLiquidityPoolInfo()
    return poolInfo.then((res) => {
      return Promise.resolve(res.lqtTotal)
    })
  }

  async claim() {
    const farmContract = await this.getContractWalletAbstraction(this.farm.farmContract)

    return this.sendAndAwait(farmContract.methods.claim())
  }

  async dailyRewards() {
    // We take the last week to get an average
    const fromDate = new Date(new Date().getTime() - getMillisFromDays(7))
    const toDate = new Date()

    return (await this.getTransactionValueInTimeframe(fromDate, toDate)).div(7)
  }

  async getAPR(assetToUsdExchangeRate: BigNumber, governanceToUsdExchangeRate: BigNumber) {
    const totalStake = (await this.getFarmBalance()).shiftedBy(-1 * this.farm.lpToken.decimals)

    const fromDate = new Date(new Date().getTime() - getMillisFromDays(7))
    const toDate = new Date()

    const weeklyTransactionValue = (await this.getTransactionValueInTimeframe(fromDate, toDate)).shiftedBy(
      -1 * this.farm.rewardToken.decimals
    )

    const yearlyFactor = new BigNumber(getMillisFromYears(1) / (toDate.getTime() - fromDate.getTime()))

    return calculateAPR(totalStake, weeklyTransactionValue, yearlyFactor, assetToUsdExchangeRate, governanceToUsdExchangeRate)
  }

  async getTransactionValueInTimeframe(from: Date, to: Date): Promise<BigNumber> {
    const indexer = new YouvesIndexer(this.indexerConfig)

    const expectedWeeklyVolume = new BigNumber(this.farm.expectedWeeklyRewards).shiftedBy(this.farm.rewardToken.decimals)

    const volume = await indexer.getTransferAggregateOverTime(this.farm.farmContract, this.farm.rewardToken, from, to)

    if (volume.isNaN()) {
      return expectedWeeklyVolume
    }

    return BigNumber.max(expectedWeeklyVolume, volume)
  }

  async deposit(tokenAmount: BigNumber) {
    const farmContract = await this.getContractWalletAbstraction(this.farm.farmContract)
    const tokenContract = await this.tezos.wallet.at(this.farm.lpToken.contractAddress)

    let batchCall = this.tezos.wallet.batch()

    if (this.farm.lpToken.type === TokenType.FA1p2) {
      batchCall = batchCall.withContractCall(tokenContract.methods.approve(this.farm.farmContract, 0))
      batchCall = batchCall.withContractCall(tokenContract.methods.approve(this.farm.farmContract, round(tokenAmount)))
    } else {
      const source = await this.getOwnAddress()

      batchCall = batchCall.withContractCall(
        tokenContract.methods.update_operators([
          { add_operator: { owner: source, operator: this.farm.farmContract, token_id: Number(this.farm.lpToken.tokenId) } }
        ])
      )
    }

    batchCall = batchCall.withContractCall(farmContract.methods.deposit(tokenAmount))

    return this.sendAndAwait(batchCall)
  }

  async withdraw() {
    const farmContract = await this.getContractWalletAbstraction(this.farm.farmContract)

    return this.sendAndAwait(farmContract.methods.withdraw())
  }

  protected async getOwnAddress(): Promise<string> {
    return await this.tezos.wallet.pkh({ forceRefetch: true })
  }

  async sendAndAwait(walletOperation: any): Promise<string> {
    return sendAndAwait(walletOperation, () => Promise.resolve())
  }

  protected async getTokenAmount(token: Token, owner: string): Promise<BigNumber> {
    if (token.type === TokenType.FA2) {
      const balance = await getFA2Balance(
        owner,
        token.contractAddress,
        token.tokenId,
        this.tezos,
        this.networkConstants.fakeAddress,
        this.networkConstants.balanceOfViewerCallback
      )

      return new BigNumber(balance ? balance : 0)
    } else if (token.type === TokenType.FA1p2) {
      const balance = await getFA1p2Balance(
        owner,
        token.contractAddress,
        this.tezos,
        this.networkConstants.fakeAddress,
        this.networkConstants.natViewerCallback
      )

      return new BigNumber(balance ? balance : 0)
    } else {
      throw new Error('Unknown token type')
    }
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
