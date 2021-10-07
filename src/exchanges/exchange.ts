import { ContractAbstraction, ContractMethod, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { Token } from '../tokens/token'
import { sendAndAwait } from '../utils'

interface LoggerParams {
  type?: 'log' | 'trace' | 'warn' | 'info' | 'debug'
  inputs?: boolean
  outputs?: boolean
}

const defaultParams: Required<LoggerParams> = {
  type: 'debug',
  inputs: true,
  outputs: true
}

export function Log(params?: LoggerParams) {
  const options: Required<LoggerParams> = {
    type: params?.type || defaultParams.type,
    inputs: params?.inputs === undefined ? defaultParams.inputs : params.inputs,
    outputs: params?.outputs === undefined ? defaultParams.outputs : params.outputs
  }

  return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value

    descriptor.value = function (...args: any[]) {
      if (options.inputs) {
        console[options.type]('Logged inputs:', propertyKey, args)
      }

      const result = original.apply(this, args)

      if (options.outputs) {
        result.then((res: any) => {
          if (BigNumber.isBigNumber(res)) {
            console[options.type]('Logged outputs', propertyKey, res.toString())
          } else {
            console[options.type]('Logged outputs', propertyKey, res)
          }
        })
      }

      return result
    }
  }
}

export abstract class Exchange {
  public TOKEN_DECIMALS = 12
  public TEZ_DECIMALS = 6

  public abstract exchangeUrl: string
  public abstract exchangeId: string
  public abstract logo: string

  constructor(
    protected readonly tezos: TezosToolkit,
    protected readonly dexAddress: string,
    public readonly token1: Token,
    public readonly token2: Token
  ) {}

  public abstract token1ToToken2(tokenAmount: number, minimumReceived: number): Promise<string>
  public abstract token2ToToken1(tokenAmount: number, minimumReceived: number): Promise<string>

  public abstract getToken1MaximumExchangeAmount(): Promise<BigNumber>
  public abstract getToken2MaximumExchangeAmount(): Promise<BigNumber>

  public abstract getExpectedMinimumReceivedToken1(token2Amount: number): Promise<BigNumber>
  public abstract getExpectedMinimumReceivedToken2(token1Amount: number): Promise<BigNumber>

  public abstract getToken1Balance(): Promise<BigNumber>
  public abstract getToken2Balance(): Promise<BigNumber>

  public abstract getExchangeRate(): Promise<BigNumber>

  public abstract getExchangeUrl(): Promise<string>

  @Log()
  protected async getTokenAmount(tokenContractAddress: string, owner: string, tokenId: number): Promise<BigNumber> {
    const tokenContract = await this.tezos.wallet.at(tokenContractAddress)
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const tokenAmount = await this.getStorageValue(tokenStorage, 'ledger', {
      owner: owner,
      token_id: tokenId
    })
    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  //   @Log()
  //   public async getSyntheticAssetExchangeRate(): Promise<BigNumber> {
  //     const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
  //     const storage = (await this.getStorageOfContract(dexContract)) as any
  //     return new BigNumber(storage['storage']['token_pool'])
  //       .dividedBy(10 ** this.TOKEN_DECIMALS)
  //       .dividedBy(new BigNumber(storage['storage']['tez_pool']).dividedBy(10 ** this.TEZ_DECIMALS))
  //   }

  //   @Log()
  //   public async tezToTokenSwap(amountInMutez: number, minimumReceived: number): Promise<string> {
  //     const source = await this.getOwnAddress()
  //     const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
  //     return this.sendAndAwait(
  //       this.tezos.wallet
  //         .batch()
  //         .withTransfer(
  //           dexContract.methods.tezToTokenPayment(minimumReceived, source).toTransferParams({ amount: amountInMutez, mutez: true })
  //         )
  //     )
  //   }
  //   @Log()
  //   public async tokenToTezSwap(tokenAmount: number, minimumReceived: number): Promise<string> {
  //     const source = await this.getOwnAddress()
  //     const dexContract = await this.getContractWalletAbstraction(this.dexAddress)
  //     const dexStorage = (await this.getStorageOfContract(dexContract)) as any

  //     const tokenAddress = dexStorage['storage']['token_address']
  //     const tokenId = dexStorage['storage']['token_id']

  //     return this.sendAndAwait(
  //       this.tezos.wallet
  //         .batch()
  //         .withContractCall(await this.prepareAddTokenOperator(tokenAddress, this.dexAddress, tokenId))
  //         .withContractCall(dexContract.methods.tokenToTezPayment(tokenAmount, minimumReceived, source))
  //         .withContractCall(await this.prepareRemoveTokenOperator(tokenAddress, this.dexAddress, tokenId))
  //     )
  //   }

  @Log()
  protected async prepareAddTokenOperator(tokenAddress: string, operator: string, tokenId: number): Promise<ContractMethod<Wallet>> {
    const source = await this.getOwnAddress()
    const tokenContract = await this.tezos.wallet.at(tokenAddress)
    return tokenContract.methods.update_operators([
      {
        add_operator: {
          owner: source,
          operator: operator,
          token_id: tokenId
        }
      }
    ])
  }
  @Log()
  protected async prepareRemoveTokenOperator(tokenAddress: string, operator: string, tokenId: number): Promise<ContractMethod<Wallet>> {
    const source = await this.getOwnAddress()
    const tokenContract = await this.tezos.wallet.at(tokenAddress)
    return tokenContract.methods.update_operators([
      {
        remove_operator: {
          owner: source,
          operator: operator,
          token_id: tokenId
        }
      }
    ])
  }

  @Log()
  protected async getOwnAddress(): Promise<string> {
    return await this.tezos.wallet.pkh({ forceRefetch: true })
  }

  @Log()
  protected async sendAndAwait(walletOperation: any): Promise<string> {
    return sendAndAwait(walletOperation, () => Promise.resolve())
  }

  @Log()
  protected async getContractWalletAbstraction(address: string): Promise<ContractAbstraction<Wallet>> {
    return this.tezos.wallet.at(address)
  }

  @Log()
  protected async getStorageOfContract(contract: ContractAbstraction<Wallet>) {
    return contract.storage()
  }

  private async getStorageValue(storage: any, key: string, source: any) {
    return storage[key].get(source)
  }
}
