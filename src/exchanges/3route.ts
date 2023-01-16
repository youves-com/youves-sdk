import { ContractAbstraction, ContractMethod, MichelsonMap, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { DexType, NetworkConstants } from '../networks.base'
import { mainnetContracts, mainnetUnifiedStakingContractAddress } from '../networks.mainnet'
import { Token, TokenType } from '../tokens/token'
import { cacheFactory, round } from '../utils'
import { Exchange, LiquidityPoolInfo } from './exchange'

export interface Hop {
  dex: number
  forward: boolean
}

export interface Chain {
  input: number
  output: number
  hops: Hop[]
}

export interface Route {
  input: number
  output: number
  chains: Chain[]
}

export interface FlatHop {
  amount_opt: BigNumber | undefined
  dex_id: number
  code: number
}

export interface FlatRoute {
  token_in_id: number | undefined
  token_out_id: number | undefined
  min_out: BigNumber | undefined
  receiver: string
  hops: Map<number, FlatHop>
  app_id: number
}

const promiseCache = new Map<string, Promise<unknown>>()

const cache = cacheFactory(promiseCache, (obj: _3RouteExchange): [string, string] => {
  return [obj.token1.symbol, obj.token2.symbol]
})

const CONTRACT = 'KT1Tuta6vbpHhZ15ixsYD3qJdhnpEAuogLQ9'

export class _3RouteExchange extends Exchange {
  public exchangeUrl: string = 'https://3route.io/'
  public exchangeId: string = ``
  public name: string = '3Route'
  public logo: string = '/assets/img/3route_logo.svg'

  public readonly dexType: DexType = DexType._3ROUTE

  public fee: number = 1 //0 exchange fee

  constructor(tezos: TezosToolkit, token1: Token, token2: Token, networkConstants: NetworkConstants) {
    super(tezos, CONTRACT, token1, token2, networkConstants)
  }

  public async token1ToToken2(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    return this.token1ToToken2Swap(tokenAmount, minimumReceived)
  }

  public async token2ToToken1(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    return this.token2ToToken1Swap(tokenAmount, minimumReceived)
  }

  public async getToken1MaximumExchangeAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(1)
  }

  public async getToken2MaximumExchangeAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(2)
  }

  public async getExchangeRate(): Promise<BigNumber> {
    return new BigNumber(0)
  }

  public async getToken1Balance(): Promise<BigNumber> {
    if (this.token1.symbol === 'tez') {
      return this.getTezBalance()
    }

    return this.getTokenAmount(this.token1, await this.getOwnAddress())
  }

  public async getToken2Balance(): Promise<BigNumber> {
    if (this.token2.symbol === 'tez') {
      return this.getTezBalance()
    }

    return this.getTokenAmount(this.token2, await this.getOwnAddress())
  }

  public async getTokenBalance(token: Token): Promise<BigNumber> {
    return token.symbol === 'tez' ? this.getTezBalance() : this.getTokenAmount(token, await this.getOwnAddress())
  }

  private async getTezBalance(): Promise<BigNumber> {
    return this.tezos.tz.getBalance(await this.getOwnAddress())
  }

  public async getExpectedMinimumReceivedToken1ForToken2(_amountInMutez: BigNumber): Promise<BigNumber> {
    return new BigNumber(0)
  }

  public async getExpectedMinimumReceivedToken2ForToken1(_tokenAmount: BigNumber): Promise<BigNumber> {
    return new BigNumber(0)
  }

  private async getExchangeMaximumTokenAmount(_tokenNumber: 1 | 2): Promise<BigNumber> {
    return new BigNumber(0)
  }

  public async token1ToToken2Swap(_tokenAmount: BigNumber, _minimumReceived: BigNumber): Promise<string> {
    return ''
  }

  public async token2ToToken1Swap(_tokenAmount: BigNumber, _minimumReceived: BigNumber): Promise<string> {
    return ''
  }

  //takes the Route returned from the 3route API and
  //returns a flattened route with the proper structure to call the execute on the 3route contract
  private flattenRoute(route: Route, receiver: string, token1: Token, token2: Token, slippage: BigNumber): FlatRoute {
    let hops: any = new MichelsonMap()

    route.chains.forEach((chain: any) => {
      chain.hops.forEach((hop: any, i: number) => {
        hops.set(hops.size, {
          amount_opt: i === 0 ? new BigNumber(chain.input).shiftedBy(token1.decimals) : undefined, //undefined if not first of chain
          dex_id: hop.dex,
          code: (i === 0 ? 1 : 0) + (hop.forward ? 2 : 0) //code bitmask (first of chain (0x01) | isForward (0x02)
          // min_out_opt: i === chain.hops.length - 1 ? chain.output : undefined //undefined if not last of chain
        })
      })
    })

    return {
      token_in_id: token1._3RouteId,
      token_out_id: token2._3RouteId,
      min_out: round(new BigNumber(route.output).shiftedBy(token2.decimals).times(slippage)),
      receiver,
      hops,
      app_id: 1 //app id 1 to distinguish youves from other calls
    }
  }

  //adds token operator based on token type
  protected async addTokenOperator(token: Token, operator: string, amount?: BigNumber): Promise<ContractMethod<Wallet>> {
    const source = await this.getOwnAddress()
    const tokenContract = await this.tezos.wallet.at(token.contractAddress)

    if (token.type === TokenType.FA2) {
      return tokenContract.methods.update_operators([
        { add_operator: { owner: source, operator: operator, token_id: Number(token.tokenId) } }
      ])
    } else if (token.type === TokenType.FA1p2 && amount) {
      return tokenContract.methods.approve(operator, amount)
    }
    throw new Error('Token type not supported')
  }

  //removes token operator based on token type
  protected async removeTokenOperator(token: Token, operator: string): Promise<ContractMethod<Wallet>> {
    const source = await this.getOwnAddress()
    const tokenContract = await this.tezos.wallet.at(token.contractAddress)

    if (token.type === TokenType.FA2) {
      return tokenContract.methods.update_operators([
        { remove_operator: { owner: source, operator: operator, token_id: Number(token.tokenId) } }
      ])
    } else if (token.type === TokenType.FA1p2) {
      return tokenContract.methods.approve(operator, 0)
    }
    throw new Error('Token type not supported')
  }

  public async buyAndStake(amount: BigNumber, route: Route, token1: Token, token2: Token, slippage: BigNumber): Promise<string> {
    const source = await this.getOwnAddress()
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const stakingAdress =
      token2.symbol === 'YOU'
        ? mainnetUnifiedStakingContractAddress
        : mainnetContracts.find((x) => x?.symbol === token2.symbol)?.SAVINGS_V3_POOL_ADDRESS
    if (!stakingAdress) {
      return ''
    }
    const stakingContract = await this.getContractWalletAbstraction(stakingAdress)

    //this gets the flattened route with the right structure to call execute on 3route
    const flatRoute = this.flattenRoute(route, source, token1, token2, slippage)

    let batchCall = this.tezos.wallet.batch()

    //========== 3ROUTE SWAP ==========
    //ADD OPERATOR
    if (token1.type !== TokenType.NATIVE) {
      batchCall = batchCall.withContractCall(await this.addTokenOperator(token1, dexContract.address, amount))
      //3ROUTE EXECUTE
      try {
        batchCall = batchCall.withContractCall(dexContract.methodsObject.execute(flatRoute))
      } catch (error) {
        console.log(error)
      }
      //REMOVE OPERATOR
      batchCall = batchCall.withContractCall(await this.removeTokenOperator(token1, dexContract.address))
    } else {
      //3ROUTE EXECUTE WITH TEZ
      try {
        batchCall = batchCall.withTransfer(
          dexContract.methodsObject.execute(flatRoute).toTransferParams({ amount: amount.toNumber(), mutez: true })
        )
      } catch (error) {
        console.log(error)
      }
    }
    //========== STAKING ==========
    //ADD OPERATOR
    batchCall = batchCall.withContractCall(await this.addTokenOperator(token2, stakingContract.address, flatRoute.min_out))
    //STAKE
    try {
      batchCall = batchCall.withContractCall(stakingContract.methods.deposit(0, flatRoute.min_out))
    } catch (error) {
      console.log(error)
    }
    //REMOVE OPERATOR
    batchCall = batchCall.withContractCall(await this.removeTokenOperator(token2, stakingContract.address))

    return this.sendAndAwait(batchCall)
  }

  public async get3RouteIdsFromDexId(dexId: number) {
    const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
    const dexStorage = (await this.getStorageOfContract(dexContract)) as any
    const dex = await this.getStorageValue(dexStorage.provider, 'dexes', dexId)

    return { token1Id: dex.token1_id.toNumber(), token2Id: dex.token2_id.toNumber() }
  }

  public async getPriceImpact(_amount: BigNumber, _reverse: boolean): Promise<BigNumber> {
    return new BigNumber(0)
  }

  @cache()
  public async getLiquidityPoolInfo(): Promise<LiquidityPoolInfo> {
    return {} as LiquidityPoolInfo
  }

  public async getExchangeUrl(): Promise<string> {
    return `https://3route.io/`
  }

  public async clearCache() {
    promiseCache.clear()
  }

  @cache()
  protected async getContractWalletAbstraction(address: string): Promise<ContractAbstraction<Wallet>> {
    return this.tezos.wallet.at(address)
  }

  @cache()
  protected async getStorageOfContract(contract: ContractAbstraction<Wallet>) {
    return contract.storage()
  }

  protected async getStorageValue(storage: any, key: string, source: any) {
    return storage[key].get(source)
  }
}
