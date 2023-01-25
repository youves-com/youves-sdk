import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { AssetDefinition, CheckerExchangeInfo, NetworkConstants, TargetOracle } from './networks.base'
import { TokenSymbol } from './tokens/token'
import { getPriceFromOracle } from './utils'

// let service: PriceService | undefined
// export function getPriceService(): PriceService {
//   if (!service) {
//     service = new PriceService(environment.networkConstants)
//   }
//   return service
// }

type TokenKey = string // `${TokenSymbol}-${TokenSymbol}`

export class PriceService {
  public prices: Map<TokenKey, BigNumber> = new Map()

  constructor(
    public tezos: TezosToolkit,
    public readonly networkConstants: NetworkConstants,
    public readonly contracts: AssetDefinition[]
  ) {}

  async printPrice(fromToken: TokenSymbol, toToken: TokenSymbol) {
    console.log('1', fromToken, 'will give you', (await this.getTokenToTokenPrice(fromToken, toToken)).toString(), toToken)
    console.log('1', toToken, 'will give you', (await this.getTokenToTokenPrice(toToken, fromToken)).toString(), fromToken)
  }

  // async fetchPrice(fromToken: TokenSymbol, toToken: TokenSymbol): Promise<void> {

  //   this.prices.set(`${fromToken}-${toToken}`, price)
  //   this.prices.set(`${toToken}-${fromToken}`, new BigNumber(1).div(price))
  // }

  async addPrice(fromToken: TokenSymbol, toToken: TokenSymbol, price: BigNumber): Promise<void> {
    this.prices.set(`${fromToken}-${toToken}`, price)
    this.prices.set(`${toToken}-${fromToken}`, new BigNumber(1).div(price))
    this.printPrice(fromToken, toToken)
  }

  async getUSDPrice(fromToken: TokenSymbol): Promise<BigNumber> {
    return this.prices.get(`${fromToken}-uUSD`) ?? new BigNumber(0)
  }

  async getTokenToTokenPrice(fromToken: TokenSymbol, toToken: TokenSymbol, onlyExact: boolean = false): Promise<BigNumber> {
    // const from = this.prices.get(`${fromToken}-${toToken}`) ?? new BigNumber(1)
    // const to = this.prices.get(toToken) ?? new BigNumber(1)
    // return from.div(to)
    let price = this.prices.get(`${fromToken}-${toToken}`)
    if (price) {
      return price
    }

    if (onlyExact) {
      console.log('NOT FOUND', fromToken, toToken)
      return new BigNumber(-2)
    }

    if (fromToken !== 'tez' && toToken !== 'tez') {
      price = await this.findRoute(fromToken, toToken, 'tez')
      if (price) {
        return price
      }
    }

    if (fromToken !== 'uUSD' && toToken !== 'uUSD') {
      price = await this.findRoute(fromToken, toToken, 'uUSD')
      if (price) {
        return price
      }
    }

    return new BigNumber(-1)
  }

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
    const ctezTezAddress = ctezTezDex.contractAddress
    const ctezStorage: any = await this.getStorageOfContract(await this.getContractWalletAbstraction(ctezTezAddress))
    const ctezTezPrice = new BigNumber(ctezStorage.cashPool).shiftedBy(-6).dividedBy(new BigNumber(ctezStorage.tokenPool).shiftedBy(-6))
    //console.log('ctezTezPrice ', ctezTezPrice.toNumber())

    const cchfChfPrice = cchfCtezPrice.times(ctezTezPrice).times(tezChfPrice)
    //console.log('>>>>>>> cchfChfPrice ', cchfChfPrice.toNumber())
    return cchfChfPrice
  }

  protected async getContractWalletAbstraction(address: string): Promise<ContractAbstraction<Wallet>> {
    return this.tezos.wallet.at(address)
  }

  protected async getStorageOfContract(contract: ContractAbstraction<Wallet>) {
    return contract.storage()
  }

  async findRoute(fromToken: TokenSymbol, toToken: TokenSymbol, hopToken: TokenSymbol) {
    return (await this.getTokenToTokenPrice(fromToken, hopToken, true)).times(await this.getTokenToTokenPrice(hopToken, toToken, true))
  }
}
