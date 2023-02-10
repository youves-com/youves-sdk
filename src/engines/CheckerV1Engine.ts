import BigNumber from 'bignumber.js'
import { StorageKey } from '../storage/types'
import { trycatch, YouvesEngine } from './YouvesEngine'
import { tzip16 } from '@taquito/tzip16'
import { CheckerExchange } from '../exchanges/checker'
import { CheckerExchangeInfo, DexType } from '../networks.base'
import { cacheFactory, getMillisFromMinutes } from '../utils'

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

export interface Slice {
  slicePointer: BigNumber
  minKitForUnwarranted: BigNumber
  tok: BigNumber
  inAuction?: boolean
  necessaryCollateral?: BigNumber
}

const promiseCache = new Map<string, Promise<unknown>>()

const cache = cacheFactory(promiseCache, (obj: YouvesEngine): [string, string, string] => {
  return [obj?.symbol, obj?.activeCollateral.token.symbol, obj?.activeCollateral.ENGINE_TYPE]
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

    const sliceInAuction = await this.getSliceInAuction(address)
    const auctioned_tok = sliceInAuction ? sliceInAuction.leaf.value.contents.tok : new BigNumber(0)
    console.log('SLICE IN AUCTION: tok', auctioned_tok.toNumber())

    return vaultContext ? vaultContext.collateral.plus(vaultContext.collateral_at_auction).minus(auctioned_tok) : new BigNumber(0)
  }

  @cache()
  protected async getTotalMinted(): Promise<BigNumber> {
    const minted = await this.youvesIndexer.getTotalMintedForEngine(this.ENGINE_ADDRESS)
    return minted.dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  protected async getTotalCollateralRatio(): Promise<BigNumber> {
    return (await this.getTotalBalanceInVaults()).dividedBy(await this.getTargetPrice()).dividedBy(await this.getTotalMinted())
    // .shiftedBy(this.getDecimalsWorkaround()) // TODO: Fix decimals
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
  protected async getVaultCollateralisation(address?: string, newBalance?: BigNumber, newMinted?: BigNumber): Promise<BigNumber> {
    if (!address) {
      address = await this.getOwnAddress()
    }
    const storage = await this.getEngineState()
    const p = storage.deployment_state.sealed.parameters
    console.log('STORAGE ', storage)

    const collateral = (newBalance ?? (await this.getVaultBalance(address))).shiftedBy(-6)
    const maxIndex = BigNumber.max(p.index, p.protected_index)
    const mintingPrice = p.q.times(maxIndex).div(new BigNumber(2).pow(64).shiftedBy(6))
    const mintingRatio = new BigNumber(2.1)
    const outstanding_kit = newMinted ?? (await this.getMintedSyntheticAsset(address))

    const collateralUtilization = mintingPrice.times(mintingRatio).times(outstanding_kit.shiftedBy(-12))

    const percentage = collateralUtilization.div(collateral).times(100)

    console.log('---------- COLLATERAL UTILISATION')
    console.log('collateral ', collateral.toNumber())
    console.log('q ', p.q.toNumber())
    console.log('maxIndex ', maxIndex.toNumber())
    console.log('mintingPrice ', mintingPrice.toNumber())
    console.log('mintingRatio ', mintingRatio.toNumber())
    console.log('outstanding_kit ', outstanding_kit.toNumber())
    console.log('collateralUtilization ', collateralUtilization.toNumber())
    console.log('============')
    console.log(percentage.toNumber() + ' %')
    console.log('----------')

    return collateralUtilization.div(collateral)
  }

  @cache()
  public async getCollateralisationUsage(address?: string): Promise<BigNumber> {
    if (address) {
      return await this.getVaultCollateralisation(address)
    } else {
      return await this.getVaultCollateralisation()
    }
  }

  @cache()
  public async getCollateralisationUsageSimulation(newBalance: BigNumber, newMinted: BigNumber): Promise<BigNumber> {
    console.log('COLLATERILASATION USAGE SIMULATED ', (await this.getVaultCollateralisation(undefined, newBalance, newMinted)).toNumber())
    return await this.getVaultCollateralisation(undefined, newBalance, newMinted)
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

  //returns outstanding kit minus kit that is in auction
  @cache()
  @trycatch(new BigNumber(0))
  protected async getMintedSyntheticAsset(address?: string): Promise<BigNumber> {
    if (!address) {
      address = await this.getOwnAddress()
    }

    const vault = await this.getVaultDetails(address, this.VAULT_ID)

    const sliceInAuction = await this.getSliceInAuction(address)
    const min_kit_for_unwarranted = sliceInAuction ? sliceInAuction.leaf.value.contents.min_kit_for_unwarranted : new BigNumber(0)
    console.log('SLICE IN AUCTION : min_kit_for_unwarranted', min_kit_for_unwarranted.toNumber())

    const outstanding_kit = vault?.outstanding_kit ?? new BigNumber(0)

    //const outstandingKitMinusAuction = outstanding_kit.minus(min_kit_for_unwarranted)
    // return outstandingKitMinusAuction
    return outstanding_kit
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
    const ctezTezDex = this.networkConstants.dexes.find(
      (dex) => dex.token1.symbol === 'tez' && dex.token2.symbol === 'ctez'
    ) as CheckerExchangeInfo
    if (!ctezTezDex) return new BigNumber(0)
    const ctezStorage: any = await this.getStorageOfContract(await this.getContractWalletAbstraction(ctezTezDex.contractAddress))
    const ctezTezPrice = new BigNumber(ctezStorage.cashPool).shiftedBy(-6).dividedBy(new BigNumber(ctezStorage.tokenPool).shiftedBy(-6))

    const ctezCchf = await (await this.getExchangeInstance()).getExchangeRate()
    return new BigNumber(1).div(ctezCchf.div(ctezTezPrice))
  }

  @cache()
  protected async getSyntheticAssetTotalSupply(): Promise<BigNumber> {
    const storage = await this.getEngineState()
    return new BigNumber(storage.deployment_state.sealed.parameters.circulating_kit)
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

  //compound interest rate does not exist in checker. I return 1 so it is irrelevant in the multiplication with the minted value.
  @cache()
  public async getCompoundInterestRate(): Promise<BigNumber> {
    return new BigNumber(1)
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

    const deadline = new Date(new Date().getTime() + getMillisFromMinutes(2))

    return this.sendAndAwait(engineContract.methods.add_liquidity(tezAmount, kitAmount, minLiquidityReceived, deadline))
  }

  public async removeLiquidity(liquidityTokens: number, minTezReceived: number, minKitReceived: number): Promise<string> {
    const engineContract = await this.engineContractPromise

    const deadline = new Date(new Date().getTime() + getMillisFromMinutes(2))

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
    // const storage = await this.getEngineState()
    // const vaultContext = await this.getStorageValue(storage.deployment_state.sealed, 'burrows', [address, vaultId])
    // console.log('VAULT CONTEXT', vaultContext)
    // return vaultContext

    //this is using the view burrow_assuming_touch that returns the burrow as it would be after a touch
    const contract = await this.tezos.contract.at(this.contracts.collateralOptions[0].ENGINE_ADDRESS, tzip16)
    const metadataViews = await contract.tzip16().metadataViews()
    const burrow_assuming_touch = await metadataViews.burrow_assuming_touch().executeView(address, vaultId)
    return burrow_assuming_touch
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
  public async getLiquidationSlices(address?: string): Promise<{ oldest_slice: BigNumber; youngest_slice: BigNumber } | undefined> {
    if (!address) {
      address = await this.getOwnAddress()
    }
    const storage = await this.getEngineState()

    const slicePointers = await this.getStorageValue(storage.deployment_state.sealed.liquidation_auctions, 'burrow_slices', {
      0: address,
      1: 0
    })

    return slicePointers
  }

  @cache()
  public async cancellableSlices(): Promise<Slice[] | undefined> {
    const slices = await this.getLiquidationSlices()

    console.log('slices: ', slices)

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
          slicePointer: slices.youngest_slice,
          minKitForUnwarranted: slicePointers.leaf.value.contents.min_kit_for_unwarranted,
          necessaryCollateral: await this.getNecessaryCollateral(slicePointers.leaf.value.contents.tok),
          tok: slicePointers.leaf.value.contents.tok
        }
      ]
    }

    return
  }

  private async getRoot(slicePointer: BigNumber): Promise<BigNumber | undefined> {
    const state = await this.getEngineState()

    //follow the parent untill the root is reached
    let nextKey = slicePointer
    let nextNode
    while (true) {
      nextNode = await this.getStorageValue(state.deployment_state.sealed.liquidation_auctions.avl_storage, 'mem', nextKey)
      const nodeType = Object.keys(nextNode)[0]
      if (nodeType == 'root' || nextNode == undefined) {
        return nextKey
      }

      nextKey = new BigNumber(nextNode[nodeType].parent)
    }
  }

  //get all slices both in queue and in the auction
  @cache()
  public async allOwnSlices(): Promise<Slice[] | undefined> {
    const slicePointers = await this.getLiquidationSlices()
    if (!slicePointers) {
      return undefined
    }

    const state = await this.getEngineState()
    //get the oldest slice and iterate over the slices in the 'mem' following the pointer to the younger leaf.
    let nextSlice: BigNumber = slicePointers.oldest_slice
    let slices: Slice[] = []
    while (nextSlice != null) {
      const slice: {
        leaf: {
          parent: BigNumber
          value: {
            contents: {
              burrow: { '0': string; '1': BigNumber }
              min_kit_for_unwarranted: BigNumber
              tok: BigNumber
            }
            older: BigNumber
            younger: BigNumber
          }
        }
      } = await this.getStorageValue(state.deployment_state.sealed.liquidation_auctions.avl_storage, 'mem', nextSlice)

      //checking if the slice is in auction. There will always be at most one slice per user in auction. So we check only the oldest.
      let inAuction: boolean = false
      const currentAuctionPointer = state.deployment_state.sealed.liquidation_auctions.current_auction?.contents
      if (nextSlice.eq(slicePointers.oldest_slice) && currentAuctionPointer) {
        inAuction = (await this.getRoot(nextSlice))?.eq(currentAuctionPointer) ?? false
      }

      slices.push({
        slicePointer: nextSlice,
        minKitForUnwarranted: slice.leaf.value.contents.min_kit_for_unwarranted,
        tok: slice.leaf.value.contents.tok,
        inAuction,
        necessaryCollateral: inAuction ? undefined : await this.getNecessaryCollateral(slice.leaf.value.contents.tok)
      })

      nextSlice = slice.leaf.value.younger
    }

    return slices
  }

  private async getNecessaryCollateral(sliceCollateral: BigNumber): Promise<BigNumber> {
    const state = await this.getEngineState()
    const p = state.deployment_state.sealed.parameters

    const source = await this.getOwnAddress()
    const vaultContext = await this.getVaultDetails(source, this.VAULT_ID)
    const vaultCollateral = vaultContext ? vaultContext.collateral : new BigNumber(0)

    const maxIndex = BigNumber.max(p.index, p.protected_index)
    const mintingPrice = p.q.times(maxIndex).div(new BigNumber(2).pow(64).shiftedBy(6))
    const fminting = new BigNumber(2.1)
    // const kit = (await this.getMintedSyntheticAsset()).shiftedBy(-12)
    const kit = vaultContext ? vaultContext.outstanding_kit.shiftedBy(-12) : new BigNumber(0)
    const minCollateral = mintingPrice.times(fminting).times(kit).shiftedBy(6).times(100).div(90)

    console.log('old new', mintingPrice.times(fminting).times(kit).toNumber(), minCollateral.shiftedBy(-6).toNumber())

    const necessaryCollateral = minCollateral.minus(vaultCollateral.plus(sliceCollateral))

    console.log('########### NECESSARY COLLATERAL')
    console.log('minting price ', mintingPrice.toNumber())
    console.log('fminting ', fminting.toNumber())
    console.log('kit ', kit.toNumber())
    console.log('minCollateral ', minCollateral.toNumber())
    console.log('vaultCollateral ', vaultCollateral.toNumber())
    console.log('sliceCollateral ', sliceCollateral.toNumber())
    console.log('============')
    console.log('necessaryCollateral ', necessaryCollateral.toNumber())
    console.log('###########')

    return necessaryCollateral
  }

  @cache()
  private async getSliceInAuction(address?: string): Promise<
    | {
        leaf: {
          parent: BigNumber
          value: {
            contents: {
              burrow: { '0': string; '1': BigNumber }
              min_kit_for_unwarranted: BigNumber
              tok: BigNumber
            }
            older: BigNumber
            younger: BigNumber
          }
        }
      }
    | undefined
  > {
    const slicePointers = address ? await this.getLiquidationSlices(address) : await this.getLiquidationSlices()
    if (!slicePointers) {
      return undefined
    }

    const state = await this.getEngineState()
    const currentAuctionPointer = state.deployment_state.sealed.liquidation_auctions.current_auction?.contents

    if (currentAuctionPointer && (await this.getRoot(slicePointers.oldest_slice))?.eq(currentAuctionPointer)) {
      const slice: {
        leaf: {
          parent: BigNumber
          value: {
            contents: {
              burrow: { '0': string; '1': BigNumber }
              min_kit_for_unwarranted: BigNumber
              tok: BigNumber
            }
            older: BigNumber
            younger: BigNumber
          }
        }
      } = await this.getStorageValue(state.deployment_state.sealed.liquidation_auctions.avl_storage, 'mem', slicePointers.oldest_slice)

      return slice
    } else {
      return undefined
    }
  }

  @cache()
  protected async getClaimableSavingsPayout(): Promise<BigNumber | undefined> {
    return undefined
  }

  public async setDeletage(delegate: string | null): Promise<string> {
    const engineContract = await this.engineContractPromise

    return this.sendAndAwait(engineContract.methods.set_burrow_delegate(this.VAULT_ID, delegate))
  }

  public async clearCache() {
    super.clearCache()
    promiseCache.clear()
  }
}
