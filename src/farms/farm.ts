import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { Farm } from '../networks.base'
import { hangzhounetNetworkConstants } from '../networks.hangzhounet'
import { getFA1p2Balance, round, sendAndAwait } from '../utils'

export class LPTokenFarm {
  constructor(private readonly tezos: TezosToolkit, private readonly farm: Farm) {
    console.log('FARM', farm)
  }

  async getBalanceToken1() {
    const owner = await this.getOwnAddress()

    return this.getTokenAmount(this.farm.token1.contractAddress, owner, this.farm.token1.tokenId)
  }
  async getBalanceToken2() {
    const owner = await this.getOwnAddress()

    return this.getTokenAmount(this.farm.token2.contractAddress, owner, this.farm.token2.tokenId)
  }
  async getLPBalance() {
    const owner = await this.getOwnAddress()

    return this.getTokenAmount(this.farm.lpToken.contractAddress, owner, this.farm.lpToken.tokenId)
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

  async getAPR() {
    return new BigNumber(321)
  }

  async deposit(tokenAmount: BigNumber) {
    // const source = await this.getOwnAddress()
    const farmContract = await this.getContractWalletAbstraction(this.farm.farmContract)
    const tokenContract = await this.tezos.wallet.at(this.farm.lpToken.contractAddress)

    let batchCall = this.tezos.wallet.batch()

    batchCall = batchCall.withContractCall(tokenContract.methods.approve(this.farm.farmContract, round(tokenAmount)))

    // FA2
    // batchCall = batchCall.withContractCall(
    //   tokenContract.methods.update_operators([
    //     { add_operator: { owner: source, operator: this.farm.farmContract, token_id: Number(this.farm.lpToken.tokenId) } }
    //   ])
    // )

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
  protected async getTokenAmount(tokenContractAddress: string, owner: string, tokenId: number): Promise<BigNumber> {
    const tokenContract = await this.tezos.wallet.at(tokenContractAddress)
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    // wUSDC is different to uUSD
    if (
      tokenContractAddress === 'KT19z4o3g8oWVvExK93TA2PwknvznbXXCWRu' ||
      tokenContractAddress === 'KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ'
    ) {
      const tokenAmount = await this.getStorageValue(tokenStorage.assets, 'ledger', {
        0: owner,
        1: tokenId
      })
      return new BigNumber(tokenAmount ? tokenAmount : 0)
    } else if (
      tokenContractAddress === 'KT1DnNWZFWsLLFfXWJxfNnVMtaVqWBGgpzZt' ||
      tokenContractAddress === 'KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV'
    ) {
      const balancesValue = await this.getStorageValue(tokenStorage, 'balances', owner)

      return new BigNumber(balancesValue?.balance ? balancesValue.balance : 0)
    } else if (
      tokenContractAddress === 'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn' ||
      tokenContractAddress === 'KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9' ||
      tokenContractAddress === 'KT1Lwo6KKo17VkTcs9UVU5xEsLP1kygxrpuh' || // Testnet
      tokenContractAddress === 'KT1MZ6v9teQmCBTg6Q9G9Z843VkoTFkjk2jk' // Testnet
    ) {
      const balance = await getFA1p2Balance(
        owner,
        tokenContractAddress,
        this.tezos,
        hangzhounetNetworkConstants.fakeAddress, // TODO: Replace with network config
        hangzhounetNetworkConstants.natViewerCallback // TODO: Replace with network config
      )

      console.log('GET BALANCE ', balance.toString())

      return new BigNumber(balance ? balance : 0)
    }
    const tokenAmount = await this.getStorageValue(tokenStorage, 'ledger', {
      owner: owner,
      token_id: tokenId
    })
    return new BigNumber(tokenAmount ? tokenAmount : 0)
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
