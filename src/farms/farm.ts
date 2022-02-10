import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { Farm } from '../networks.base'
import { mainnetNetworkConstants } from '../networks.mainnet'
import { Token, TokenType } from '../tokens/token'
import { getFA1p2Balance, getFA2Balance, round, sendAndAwait } from '../utils'
import { YouvesIndexer } from '../YouvesIndexer'

export class LPTokenFarm {
  protected YEARLY_MILLIS = 1000 * 60 * 60 * 24 * 7 * 52

  constructor(private readonly tezos: TezosToolkit, private readonly farm: Farm, private readonly indexerUrl: string) {
    console.log('FARM', farm)
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
    const owner = await this.getOwnAddress()
    const rewardsPoolContract = await this.getContractWalletAbstraction(this.farm.farmContract)
    const dexStorage: any = (await this.getStorageOfContract(rewardsPoolContract)) as any

    const tokenAmount = await this.getStorageValue(dexStorage, 'stakes', owner)

    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  async getClaimableRewards() {
    const source = await this.getOwnAddress()
    const rewardsPoolContract = await this.getContractWalletAbstraction(this.farm.farmContract)
    const rewardsPoolStorage: any = (await this.getStorageOfContract(rewardsPoolContract)) as any

    let currentDistFactor = new BigNumber(rewardsPoolStorage.dist_factor)
    const ownStake = new BigNumber(await this.getStorageValue(rewardsPoolStorage, 'stakes', source))
    const ownDistFactor = new BigNumber(await this.getStorageValue(rewardsPoolStorage, 'dist_factors', source))

    return ownStake.multipliedBy(currentDistFactor.minus(ownDistFactor)).dividedBy(10 ** this.farm.lpToken.decimals)
  }

  async getFarmBalance() {
    const dexContract = await this.getContractWalletAbstraction(this.farm.farmContract)
    const dexStorage: any = (await this.getStorageOfContract(dexContract)) as any
    return new BigNumber(dexStorage && dexStorage.total_stake ? dexStorage.total_stake : 0)
  }

  async claim() {
    const farmContract = await this.getContractWalletAbstraction(this.farm.farmContract)

    return this.sendAndAwait(farmContract.methods.claim())
  }

  async dailyRewards() {
    return (await this.getTransactionValueInLastWeek()).div(7)
  }

  async getAPR(assetExchangeRate: BigNumber, governanceExchangeRate: BigNumber) {
    const totalStake = await this.getFarmBalance()
    const weeklyTransactionValue = await this.getTransactionValueInLastWeek()
    const weeklyFactor = this.YEARLY_MILLIS / 604_800_000

    const yearlyRewardsInUSD = weeklyTransactionValue.multipliedBy(weeklyFactor).multipliedBy(governanceExchangeRate)
    const totalStakeInUSD = totalStake.multipliedBy(assetExchangeRate)

    return yearlyRewardsInUSD.div(totalStakeInUSD)
  }

  async getTransactionValueInLastWeek(): Promise<BigNumber> {
    const indexer = new YouvesIndexer(this.indexerUrl)
    return indexer.getTransferAggregate(this.farm.farmContract, 'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL') // TODO: governance token
  }

  async deposit(tokenAmount: BigNumber) {
    const farmContract = await this.getContractWalletAbstraction(this.farm.farmContract)
    const tokenContract = await this.tezos.wallet.at(this.farm.lpToken.contractAddress)

    let batchCall = this.tezos.wallet.batch()

    if (this.farm.lpToken.type === TokenType.FA1p2) {
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
        mainnetNetworkConstants.fakeAddress, // TODO: Replace with network config
        mainnetNetworkConstants.natViewerCallback // TODO: Replace with network config
      )

      return new BigNumber(balance ? balance : 0)
    } else if (token.type === TokenType.FA1p2) {
      const balance = await getFA1p2Balance(
        owner,
        token.contractAddress,
        this.tezos,
        mainnetNetworkConstants.fakeAddress, // TODO: Replace with network config
        mainnetNetworkConstants.natViewerCallback // TODO: Replace with network config
      )

      return new BigNumber(balance ? balance : 0)
    } else {
      throw new Error('Unknown token type')
    }
  }

  protected async getStorageOfContract(contract: ContractAbstraction<Wallet>) {
    return contract.storage()
  }

  private async getStorageValue(storage: any, key: string, source: any) {
    return storage[key].get(source)
  }

  protected async getContractWalletAbstraction(address: string): Promise<ContractAbstraction<Wallet>> {
    return this.tezos.wallet.at(address)
  }
}
