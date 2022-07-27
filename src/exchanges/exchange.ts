import { ContractAbstraction, ContractMethod, TezosToolkit, Wallet } from '@taquito/taquito'
import BigNumber from 'bignumber.js'
import { DexType, NetworkConstants } from '../networks.base'
import { Token } from '../tokens/token'
import { getFA1p2Balance, sendAndAwait } from '../utils'

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

  // @Log()
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
    } else if (tokenContractAddress === 'KT1UsSfaXyqcjSVPeiD7U1bWgKy3taYN7NWY') {
      const balancesValue = await this.getStorageValue(tokenStorage, 'ledger', {
        0: owner,
        1: tokenId
      })

      return new BigNumber(balancesValue?.balance ? balancesValue.balance : 0)
    } else if (
      tokenContractAddress === 'KT1DnNWZFWsLLFfXWJxfNnVMtaVqWBGgpzZt' ||
      tokenContractAddress === 'KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV'
    ) {
      const balancesValue = await this.getStorageValue(tokenStorage, 'balances', owner)

      return new BigNumber(balancesValue?.balance ? balancesValue.balance : 0)
    } else if (
      tokenContractAddress === 'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn' ||
      tokenContractAddress === 'KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9'
    ) {
      const balance = await getFA1p2Balance(
        owner,
        tokenContractAddress,
        this.tezos,
        this.networkConstants.fakeAddress,
        this.networkConstants.natViewerCallback
      )

      return new BigNumber(balance ? balance : 0)
    }
    const tokenAmount = await this.getStorageValue(tokenStorage, 'ledger', {
      owner: owner,
      token_id: tokenId
    })
    return new BigNumber(tokenAmount ? tokenAmount : 0)
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

  private async getStorageValue(storage: any, key: string, source: any) {
    return storage[key].get(source)
  }
}
