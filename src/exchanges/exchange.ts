import { ContractAbstraction, ContractMethod, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { DexType, NetworkConstants } from '../networks.base'
import { Token, TokenType } from '../tokens/token'
import { getFA1p2Balance, getFA2Balance, sendAndAwait } from '../utils'

/**
 * We call token1 "cash" and token2 "token".
 */
export abstract class Exchange {
  public TOKEN_DECIMALS = 12
  public TEZ_DECIMALS = 6

  public abstract exchangeUrl: string
  public abstract exchangeId: string
  public abstract name: string
  public abstract logo: string

  public abstract readonly dexType: DexType

  public abstract readonly fee: number

  constructor(
    protected readonly tezos: TezosToolkit,
    protected readonly dexAddress: string,
    public readonly token1: Token,
    public readonly token2: Token,
    public readonly networkConstants: NetworkConstants
  ) {}

  public abstract token1ToToken2(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string>
  public abstract token2ToToken1(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string>

  public abstract getToken1MaximumExchangeAmount(): Promise<BigNumber>
  public abstract getToken2MaximumExchangeAmount(): Promise<BigNumber>

  public abstract getExpectedMinimumReceivedToken1ForToken2(token2Amount: BigNumber): Promise<BigNumber>
  public abstract getExpectedMinimumReceivedToken2ForToken1(token1Amount: BigNumber): Promise<BigNumber>

  public abstract getToken1Balance(): Promise<BigNumber>
  public abstract getToken2Balance(): Promise<BigNumber>

  public abstract getExchangeRate(): Promise<BigNumber>

  public abstract getExchangeUrl(): Promise<string>

  public abstract getPriceImpact(tokenIn: BigNumber, tokenInNumber: 1 | 2): Promise<BigNumber>

  // @Log()
  protected async getTokenAmount(token: Token, owner: string): Promise<BigNumber> {
    if (token.type === TokenType.FA2) {
      const balance = await getFA2Balance(
        owner,
        token.contractAddress,
        Number(token.tokenId),
        this.tezos,
        this.networkConstants.fakeAddress,
        this.networkConstants.balanceOfViewerCallback
      )
      return new BigNumber(balance ? balance : 0)
    } else {
      const balance = await getFA1p2Balance(
        owner,
        token.contractAddress,
        this.tezos,
        this.networkConstants.fakeAddress,
        this.networkConstants.natViewerCallback
      )

      return new BigNumber(balance ? balance : 0)
    }
  }

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

  protected async getOwnAddress(): Promise<string> {
    return await this.tezos.wallet.pkh({ forceRefetch: true })
  }

  protected async sendAndAwait(walletOperation: any): Promise<string> {
    return sendAndAwait(walletOperation, () => Promise.resolve())
  }

  protected async getContractWalletAbstraction(address: string): Promise<ContractAbstraction<Wallet>> {
    return this.tezos.wallet.at(address)
  }

  protected async getStorageOfContract(contract: ContractAbstraction<Wallet>) {
    return contract.storage()
  }
}
