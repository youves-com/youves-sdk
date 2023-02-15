import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { FlatYouvesExchange } from './exchanges/flat-youves-swap'
import { AssetDefinition, CheckerExchangeInfo, FlatYouvesExchangeInfo, NetworkConstants, TargetOracle } from './networks.base'
import { getPriceFromOracle } from './utils'

export class PriceService {
  constructor(
    public tezos: TezosToolkit,
    public readonly networkConstants: NetworkConstants,
    public readonly contracts: AssetDefinition[]
  ) {}

  public async getCchfChfPrice() {
    const checkerContract = this.contracts.find((contract) => contract.symbol === 'cCHF')
    if (!checkerContract) return
    const checkerAddress = checkerContract.collateralOptions[0].ENGINE_ADDRESS
    //console.log('checker contract : ', checkerAddress)
    const checkerStorage: any = ((await this.getStorageOfContract(await this.getContractWalletAbstraction(checkerAddress))) as any)
      .deployment_state.sealed.cfmm

    const cchfCtezPrice = new BigNumber(checkerStorage.ctez).shiftedBy(-6).dividedBy(new BigNumber(checkerStorage.kit).shiftedBy(-12))
    //console.log('cchfCtezPrice ', cchfCtezPrice.toNumber())

    const tezChfOracle: TargetOracle = checkerContract.collateralOptions[0].targetOracle
    const tezChfPrice = new BigNumber(1)
      .div(
        new BigNumber(
          await getPriceFromOracle(tezChfOracle, this.tezos, this.networkConstants.fakeAddress, this.networkConstants.natViewerCallback)
        )
      )
      .shiftedBy(tezChfOracle.decimals)
    //console.log('tezChfPrice ', tezChfPrice.toNumber())

    const ctezTezDex = this.networkConstants.dexes.find(
      (dex) => dex.token1.symbol === 'tez' && dex.token2.symbol === 'ctez'
    ) as CheckerExchangeInfo
    if (!ctezTezDex) return
    const ctezStorage: any = await this.getStorageOfContract(await this.getContractWalletAbstraction(ctezTezDex.contractAddress))
    const ctezTezPrice = new BigNumber(ctezStorage.cashPool).shiftedBy(-6).dividedBy(new BigNumber(ctezStorage.tokenPool).shiftedBy(-6))
    //console.log('ctezTezPrice ', ctezTezPrice.toNumber())

    const cchfChfPrice = cchfCtezPrice.times(ctezTezPrice).times(tezChfPrice)
    //console.log('>>>>>>> cchfChfPrice ', cchfChfPrice.toNumber())
    return cchfChfPrice
  }

  public async getUxtzUsdtPrice() {
    const uxtzTezDex = this.networkConstants.dexes.find(
      (dex) => dex.token1.symbol === 'tez' && dex.token2.symbol === 'uXTZ'
    ) as FlatYouvesExchangeInfo
    if (!uxtzTezDex) return
    const uxtzTezPrice = await new FlatYouvesExchange(
      this.tezos,
      uxtzTezDex.contractAddress,
      uxtzTezDex,
      this.networkConstants
    ).getExchangeRate()

    const uxtzContract = this.contracts.find((contract) => contract.symbol === 'uXTZ')
    if (!uxtzContract) return
    const usdtCollateral = uxtzContract.collateralOptions.find((x) => x.token.symbol === 'usdt')
    if (!usdtCollateral) return
    const tezUsdtOracle: TargetOracle = usdtCollateral.targetOracle
    const tezUsdtPrice = new BigNumber(1)
      .div(
        new BigNumber(
          await getPriceFromOracle(tezUsdtOracle, this.tezos, this.networkConstants.fakeAddress, this.networkConstants.natViewerCallback)
        )
      )
      .shiftedBy(tezUsdtOracle.decimals)

    const uxtzUsdtPrice = uxtzTezPrice.times(tezUsdtPrice)
    return uxtzUsdtPrice
  }

  protected async getContractWalletAbstraction(address: string): Promise<ContractAbstraction<Wallet>> {
    return this.tezos.wallet.at(address)
  }

  protected async getStorageOfContract(contract: ContractAbstraction<Wallet>) {
    return contract.storage()
  }
}
