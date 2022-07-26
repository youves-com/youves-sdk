import BigNumber from 'bignumber.js'
import { StorageKey } from '../storage/types'
import { trycatch, YouvesEngine } from './YouvesEngine'
import { tzip16 } from '@taquito/tzip16'
import { CheckerExchange } from '../exchanges/checker'
import { DexType } from '../networks.base'
import { cacheFactory } from '../utils'

export interface CheckerState {
  deployment_state: {
    sealed: {
      cfmm: {
        ctez: BigNumber
        kit: BigNumber
        lqt: BigNumber
      }
      liquidation_auctions: {
        avl_storage: any
        burrow_slices: any
        completed_auctions: any
        current_auction: { contents: BigNumber } | undefined
        queued_slices: number
      }
      parameters: {
        burrow_fee_index: BigNumber
        circulating_kit: BigNumber
        drift: BigNumber
        drift_derivative: BigNumber
        imbalance_index: BigNumber
        index: BigNumber
        last_touched: Date
        outstanding_kit: BigNumber
        protected_index: BigNumber
        q: BigNumber
        target: BigNumber
      }
    }
  }
}

const promiseCache = new Map<string, Promise<unknown>>()

const cache = cacheFactory(promiseCache, (obj: YouvesEngine): [string, string] => {
  return [obj?.symbol, obj?.activeCollateral.token.symbol]
})

export class CheckerV1Engine extends YouvesEngine {
  private VAULT_ID = 0

  public async createVault(
    collateralAmountInMutez: number,
    mintAmountInToken: number,
    baker?: string,
    _allowSettlement: boolean = true
  ): Promise<string> {
    const engineContract = await this.engineContractPromise
    console.log('creating vault')

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withTransfer(
          engineContract.methods
            .create_burrow(this.VAULT_ID, baker ? baker : null)
            .toTransferParams({ amount: collateralAmountInMutez, mutez: true })
        )
        .withContractCall(engineContract.methods.mint_kit(this.VAULT_ID, mintAmountInToken))
    )
  }

  @cache()
  @trycatch(new BigNumber(0))
  protected async getVaultBalance(address: string): Promise<BigNumber> {
    const vaultContext = await this.getVaultDetails(address, this.VAULT_ID)

    console.log('VAULT BALANCE', vaultContext?.collateral.toString(), vaultContext?.collateral_at_auction.toString())

    return vaultContext ? vaultContext.collateral.plus(vaultContext.collateral_at_auction) : new BigNumber(0)
  }

  @cache()
  @trycatch(new BigNumber(0))
  protected async getVaultMaxMintableAmount(): Promise<BigNumber> {
    const address = await this.getOwnAddress()

    const contract = await this.tezos.contract.at(this.contracts.collateralOptions[0].ENGINE_ADDRESS, tzip16)

    const metadataViews = await contract.tzip16().metadataViews()

    const maxMintableKits = await metadataViews.burrow_max_mintable_kit().executeView(address, this.VAULT_ID)

    return maxMintableKits
  }

  @cache()
  public async getMaxMintableAmount(amountInMutez: BigNumber | number): Promise<BigNumber> {
    console.log('GET MAX MINTABLE AMOUNT')
    const contract = await this.tezos.contract.at(this.contracts.collateralOptions[0].ENGINE_ADDRESS, tzip16)

    const metadataViews = await contract.tzip16().metadataViews()

    const maxMintableKits = await metadataViews.max_mintable_kit_given_collateral().executeView(amountInMutez)

    console.log('GET MAX MINTABLE AMOUNT RES', maxMintableKits.toString())
    return maxMintableKits
  }

  @cache()
  protected async getAccountMaxMintableAmount(account: string): Promise<BigNumber> {
    console.log('GET ACCOUNT MAX MINTABLE')

    const balance = await this.getCollateralTokenWalletBalance(account)
    return this.getMaxMintableAmount(balance)
  }

  @cache()
  protected async getOwnMaxMintableAmount(): Promise<BigNumber> {
    console.log('GET OWN MAX MINTABLE')

    const source = await this.getOwnAddress()
    return this.getAccountMaxMintableAmount(source)
  }

  @cache()
  @trycatch(new BigNumber(0))
  protected async getMintedSyntheticAsset(address?: string): Promise<BigNumber> {
    if (!address) {
      address = await this.getOwnAddress()
    }

    const vault = await this.getVaultDetails(address, this.VAULT_ID)

    return vault?.outstanding_kit ?? new BigNumber(0)
  }

  @cache()
  protected async getOwnSyntheticAssetTokenAmount(): Promise<BigNumber> {
    const source = await this.getOwnAddress()

    const tokenContract = await this.tokenContractPromise
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const tokenAmount = await this.getStorageValue(tokenStorage['deployment_state']['sealed']['fa2_state'], 'ledger', {
      0: 0,
      1: source
    })

    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  @cache()
  public async getEngineState(): Promise<CheckerState> {
    const engineContract = await this.engineContractPromise
    const storage = (await this.getStorageOfContract(engineContract)) as CheckerState

    return storage
  }

  @cache()
  public async getOwnVaultAddress(): Promise<string> {
    return this.getFromStorageOrPersist(StorageKey.OWN_VAULT_ADDRESS, async () => {
      const source = await this.getOwnAddress()
      const vaultContext = await this.getVaultDetails(source, this.VAULT_ID)

      if (!vaultContext) {
        throw new Error('Account does not have a Vault yet!')
      }

      return vaultContext.address as any // TODO: Why is this needed?
    })
  }

  @cache()
  protected async getSyntheticAssetExchangeRate(): Promise<BigNumber> {
    return new BigNumber(1).div(await (await this.getExchangeInstance()).getExchangeRate()) // TODO: Get ctez/tez price and use in calculation (1.07 is the current value from mainnet)
  }

  @cache()
  public async getExchangeInstance(): Promise<CheckerExchange> {
    return new CheckerExchange(
      this.tezos,
      this.ENGINE_ADDRESS,
      {
        token1: this.token,
        token2: this.activeCollateral.token,
        dexType: DexType.CHECKER,
        contractAddress: this.ENGINE_ADDRESS,
        liquidityToken: {} as any
      },
      this.networkConstants
    )
  }

  @cache()
  protected async getRequiredCollateral(): Promise<BigNumber> {
    const maxMintable = await this.getVaultMaxMintableAmount()
    const minted = await this.getMintedSyntheticAsset()
    const ownCollateral = await this.getOwnVaultBalance()

    const ratio = minted.div(maxMintable)

    return ownCollateral.times(ratio)
  }

  @cache()
  protected async getVaultDelegate(): Promise<string | null> {
    const source = await this.getOwnAddress()
    const vaultAddress: string | undefined = (await this.getVaultDetails(source, this.VAULT_ID))?.address

    return vaultAddress ? this.getDelegate(vaultAddress) : null
  }

  public async depositCollateral(amountInMutez: number): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(
      this.tezos.wallet.batch().withTransfer(
        engineContract.methods.deposit_collateral(this.VAULT_ID).toTransferParams({
          amount: amountInMutez,
          mutez: true
        })
      )
    )
  }

  public async withdrawCollateral(amountInMutez: number): Promise<string> {
    const engineContract = await this.engineContractPromise

    return this.sendAndAwait(engineContract.methods.withdraw_collateral(this.VAULT_ID, amountInMutez))
  }

  public async mint(mintAmount: number): Promise<string> {
    const engineContract = await this.engineContractPromise
    const source = await this.getOwnAddress()

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(engineContract.methods.touch_burrow(source, this.VAULT_ID))
        .withContractCall(engineContract.methods.mint_kit(this.VAULT_ID, mintAmount))
    )
  }

  public async burn(burnAmount: number): Promise<string> {
    const engineContract = await this.engineContractPromise

    return this.sendAndAwait(engineContract.methods.burn_kit(this.VAULT_ID, burnAmount))
  }

  public async addLiquidity(tezAmount: number, kitAmount: number, minLiquidityReceived: number): Promise<string> {
    const engineContract = await this.engineContractPromise

    const deadline = new Date(new Date().getTime() + 2 * 60 * 1000) // 2 minutes

    return this.sendAndAwait(engineContract.methods.add_liquidity(tezAmount, kitAmount, minLiquidityReceived, deadline))
  }

  public async removeLiquidity(liquidityTokens: number, minTezReceived: number, minKitReceived: number): Promise<string> {
    const engineContract = await this.engineContractPromise

    const deadline = new Date(new Date().getTime() + 2 * 60 * 1000) // 2 minutes

    return this.sendAndAwait(engineContract.methods.remove_liquidity(liquidityTokens, minTezReceived, minKitReceived, deadline))
  }

  public async cancelLiquidation(slicePointer: number): Promise<string> {
    const engineContract = await this.engineContractPromise

    return this.sendAndAwait(engineContract.methods.cancel_liquidation_slice(slicePointer))
  }

  @cache()
  protected async getVaultDetails(
    address: string,
    vaultId: number
  ): Promise<
    | {
        active: true
        address: string
        adjustment_index: BigNumber
        collateral: BigNumber
        collateral_at_auction: BigNumber
        delegate: string
        excess_kit: BigNumber
        last_touched: string
        outstanding_kit: BigNumber
      }
    | undefined
  > {
    const storage = await this.getEngineState()
    const vaultContext = await this.getStorageValue(storage.deployment_state.sealed, 'burrows', [address, vaultId])
    console.log('VAULT CONTEXT', vaultContext)
    return vaultContext
  }

  @cache()
  public async getLiquidationAuctions(): Promise<
    | {
        avl_storage: any
        burrow_slices: any
        completed_auctions: any
        current_auction: any
        queued_slices: number
      }
    | undefined
  > {
    const storage = await this.getEngineState()

    console.log('LIQUIDATION AUCTIONS', storage.deployment_state.sealed.liquidation_auctions)
    return storage.deployment_state.sealed.liquidation_auctions
  }

  @cache()
  public async getOwnLiquidationSlices(): Promise<{ oldest_slice: BigNumber; youngest_slice: BigNumber } | undefined> {
    const source = await this.getOwnAddress()
    const storage = await this.getEngineState()

    const slicePointers = await this.getStorageValue(storage.deployment_state.sealed.liquidation_auctions, 'burrow_slices', {
      0: source,
      1: 0
    })

    return slicePointers
  }

  @cache()
  public async cancellableSlices(): Promise<{ min_kit_for_unwarranted: BigNumber; tok: BigNumber }[] | undefined> {
    const slices = await this.getOwnLiquidationSlices()

    if (!slices) {
      return undefined
    }

    const state = await this.getEngineState()

    const currentAuction = state.deployment_state.sealed.liquidation_auctions.current_auction

    if (!currentAuction) {
      return undefined
    }

    if (slices.youngest_slice.gt(currentAuction.contents)) {
      const slicePointers: {
        leaf: {
          parent: BigNumber
          value: {
            contents: {
              burrow: { '0': string; '1': BigNumber }
              min_kit_for_unwarranted: BigNumber
              tok: BigNumber
            }
          }
        }
      } = await this.getStorageValue(state.deployment_state.sealed.liquidation_auctions.avl_storage, 'mem', slices.youngest_slice)

      return [
        {
          min_kit_for_unwarranted: slicePointers.leaf.value.contents.min_kit_for_unwarranted,
          tok: slicePointers.leaf.value.contents.tok
        }
      ]
    }

    return
  }

  @cache()
  protected async getClaimableSavingsPayout(): Promise<BigNumber | undefined> {
    return undefined
  }

  public async setDeletage(delegate: string | null): Promise<string> {
    const engineContract = await this.engineContractPromise

    return this.sendAndAwait(engineContract.methods.set_burrow_delegate(this.VAULT_ID, delegate))
  }
}
