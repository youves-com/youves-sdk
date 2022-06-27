import { ContractAbstraction, ContractMethod, TezosToolkit, Wallet } from '@taquito/taquito'

import BigNumber from 'bignumber.js'
import { CollateralInfo, AssetDefinition, DexType, EngineType, NetworkConstants } from '../networks.base'
import { Storage } from '../storage/Storage'
import { StorageKey, StorageKeyReturnType } from '../storage/types'
import {
  Activity,
  EngineStorage,
  GovernanceTokenStorage,
  IndexerConfig,
  Intent,
  OptionsListingStroage,
  RewardsPoolStorage,
  SavingsPoolStorage,
  Vault,
  VaultContext,
  VestingLedgerValue,
  VestingStorage
} from '../types'
import { QuipuswapExchange } from '../exchanges/quipuswap'
import { calculateAPR, getFA1p2Balance, getPriceFromOracle, round, sendAndAwait } from '../utils'
import { Exchange } from '../exchanges/exchange'
import { PlentyExchange } from '../exchanges/plenty'
import { Token, TokenSymbol, TokenType } from '../tokens/token'
import { YouvesIndexer } from '../YouvesIndexer'
import { getNodeService } from '../NodeService'

const globalPromiseCache = new Map<string, Promise<unknown>>()

const simpleHash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }

  return h
}

export const cache = () => {
  return (_target: Object, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    const constructKey = (symbol: string, collateralSymbol: string, input: any[]) => {
      const processedInput = input.map((value) => {
        if (value instanceof ContractAbstraction) {
          return value.address
        } else if (value instanceof BigNumber) {
          return value.toString(10)
        } else if (typeof value === 'object') {
          return simpleHash(JSON.stringify(value))
        } else {
          return value
        }
      })
      return `${symbol}-${collateralSymbol}-${propertyKey}-${processedInput.join('-')}`
    }

    descriptor.value = async function (...args: any[]) {
      const youves = this as YouvesEngine
      const constructedKey = constructKey(youves?.symbol, youves?.activeCollateral.token.symbol, args)
      const promise = globalPromiseCache.get(constructedKey)
      if (promise) {
        // log with constructedKey --> goes into cache
        // console.log(constructedKey, await promise)
        return promise
      } else {
        const newPromise = originalMethod.apply(this, args)
        globalPromiseCache.set(constructedKey, newPromise)
        return newPromise
      }
    }

    return descriptor
  }
}

export const trycatch = (defaultValue: any) => {
  return (_target: Object, _propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args)
      } catch (e) {
        // console.error(`METHOD ${propertyKey} HAS THROWN AN ERROR, RETURNING ${defaultValue}`)
        return defaultValue
      }
    }

    return descriptor
  }
}

export class YouvesEngine {
  public symbol: TokenSymbol
  public collateralOptions: CollateralInfo[]
  protected token: Token
  protected governanceToken: Token

  protected TARGET_ORACLE_ADDRESS: string
  protected ENGINE_ADDRESS: string
  protected ENGINE_TYPE: string
  protected OPTIONS_LISTING_ADDRESS: string
  protected REWARD_POOL_ADDRESS: string
  protected SAVINGS_POOL_ADDRESS: string
  protected SAVINGS_V2_POOL_ADDRESS: string
  protected SAVINGS_V2_VESTING_ADDRESS: string
  protected VIEWER_CALLBACK_ADDRESS: string
  protected GOVERNANCE_DEX: string

  protected SECONDS_INTEREST_SPREAD = 316
  protected TEZ_DECIMALS = 6 // TODO: Remove?
  protected GOVERNANCE_TOKEN_PRECISION_FACTOR: number
  protected PRECISION_FACTOR: number
  protected GOVERNANCE_TOKEN_ISSUANCE_RATE = 66137566137
  protected YEAR_MILLIS = 1000 * 60 * 60 * 24 * 7 * 52
  protected MINTING_FEE = 0.015625

  protected tokenContractPromise: Promise<ContractAbstraction<Wallet>>
  protected governanceTokenContractPromise: Promise<ContractAbstraction<Wallet>>
  protected rewardsPoolContractPromise: Promise<ContractAbstraction<Wallet>>
  protected savingsPoolContractPromise: Promise<ContractAbstraction<Wallet>> | undefined
  protected savingsV2PoolContractPromise: Promise<ContractAbstraction<Wallet>>
  protected savingsV2VestingContractPromise: Promise<ContractAbstraction<Wallet>>
  protected optionsListingContractPromise: Promise<ContractAbstraction<Wallet>>
  protected engineContractPromise: Promise<ContractAbstraction<Wallet>>
  // protected targetOracleContractPromise: Promise<ContractAbstraction<Wallet>>
  protected governanceTokenDexContractPromise: Promise<ContractAbstraction<Wallet>>

  protected lastBlockHash: string = ''
  protected chainWatcherIntervalId: ReturnType<typeof setInterval> | undefined = undefined
  protected chainUpdateCallbacks: Array<() => void> = []

  protected youvesIndexer: YouvesIndexer

  constructor(
    protected readonly tezos: TezosToolkit,
    protected readonly contracts: AssetDefinition,
    protected readonly storage: Storage,
    protected readonly indexerConfig: IndexerConfig,
    protected readonly tokens: Record<TokenSymbol | any, Token>,
    public readonly activeCollateral: CollateralInfo,
    public readonly networkConstants: NetworkConstants
  ) {
    this.youvesIndexer = new YouvesIndexer(this.indexerConfig)

    this.symbol = contracts.symbol
    this.collateralOptions = contracts.collateralOptions
    this.token = contracts.token
    this.governanceToken = contracts.governanceToken

    this.TARGET_ORACLE_ADDRESS = this.activeCollateral.TARGET_ORACLE_ADDRESS
    this.ENGINE_ADDRESS = this.activeCollateral.ENGINE_ADDRESS
    this.ENGINE_TYPE = this.activeCollateral.ENGINE_TYPE
    this.OPTIONS_LISTING_ADDRESS = this.activeCollateral.OPTIONS_LISTING_ADDRESS

    this.REWARD_POOL_ADDRESS = contracts.REWARD_POOL_ADDRESS
    this.SAVINGS_POOL_ADDRESS = contracts.SAVINGS_POOL_ADDRESS
    this.SAVINGS_V2_POOL_ADDRESS = contracts.SAVINGS_V2_POOL_ADDRESS
    this.SAVINGS_V2_VESTING_ADDRESS = contracts.SAVINGS_V2_VESTING_ADDRESS
    this.VIEWER_CALLBACK_ADDRESS = networkConstants.addressViewerCallback
    this.GOVERNANCE_DEX = contracts.GOVERNANCE_DEX

    this.PRECISION_FACTOR = 10 ** this.token.decimals
    this.GOVERNANCE_TOKEN_PRECISION_FACTOR = 10 ** this.governanceToken.decimals

    this.tokenContractPromise = this.tezos.wallet.at(this.token.contractAddress)
    this.governanceTokenContractPromise = this.tezos.wallet.at(this.governanceToken.contractAddress)
    this.rewardsPoolContractPromise = this.tezos.wallet.at(this.REWARD_POOL_ADDRESS)
    if (this.SAVINGS_POOL_ADDRESS) {
      this.savingsPoolContractPromise = this.tezos.wallet.at(this.SAVINGS_POOL_ADDRESS)
    }
    this.savingsV2PoolContractPromise = this.tezos.wallet.at(this.SAVINGS_V2_POOL_ADDRESS)
    this.savingsV2VestingContractPromise = this.tezos.wallet.at(this.SAVINGS_V2_VESTING_ADDRESS)
    this.governanceTokenDexContractPromise = this.tezos.wallet.at(this.GOVERNANCE_DEX)

    this.optionsListingContractPromise = this.tezos.wallet.at(this.activeCollateral.OPTIONS_LISTING_ADDRESS)
    this.engineContractPromise = this.tezos.wallet.at(this.activeCollateral.ENGINE_ADDRESS)
    // this.targetOracleContractPromise = this.tezos.wallet.at(this.activeCollateral.TARGET_ORACLE_ADDRESS)
  }

  protected async getTezWalletBalance(address: string): Promise<BigNumber> {
    return this.tezos.tz.getBalance(address)
  }

  @cache()
  protected async getDelegate(address: string): Promise<string | null> {
    if (address) {
      return this.tezos.tz.getDelegate(address)
    }
    return null
  }

  protected async getAccountTezWalletBalance(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getTezWalletBalance(source)
  }

  @cache()
  @trycatch(new BigNumber(0))
  protected async getVaultBalance(address: string): Promise<BigNumber> {
    const engineContract = await this.engineContractPromise
    const storage = (await this.getStorageOfContract(engineContract)) as any
    const vaultContext = await this.getStorageValue(storage, 'vault_contexts', address)
    return new BigNumber(vaultContext ? vaultContext.balance : 0)
  }

  @cache()
  @trycatch(new BigNumber(0))
  protected async getOwnVaultBalance(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getVaultBalance(source)
  }

  async sendAndAwait(walletOperation: any): Promise<string> {
    return sendAndAwait(walletOperation, () => this.clearCache())
  }

  public async createVault(
    collateralAmountInMutez: number,
    mintAmountInToken: number,
    baker?: string,
    allowSettlement: boolean = true
  ): Promise<string> {
    const engineContract = await this.engineContractPromise
    console.log('creating vault')

    if (this.activeCollateral.ENGINE_TYPE === EngineType.TRACKER_V1) {
      // TODO: REMOVE HARDCODED ADDRESS
      // This is done because on hangzhou, the deployment is Tracker V2, but the oracle is not how the V2 version should be
      if (engineContract.address === 'KT1BJxrpWDZXVCA4cNwbHSJDPBxC3V36XQ4t') {
        return this.sendAndAwait(
          this.tezos.wallet
            .batch()
            .withTransfer(
              engineContract.methods
                .create_vault(allowSettlement, baker ? baker : null, this.VIEWER_CALLBACK_ADDRESS)
                .toTransferParams({ amount: collateralAmountInMutez, mutez: true })
            )
            .withContractCall(engineContract.methods.mint(round(new BigNumber(mintAmountInToken))))
        )
      }

      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withTransfer(
            engineContract.methods
              .create_vault(baker ? baker : null, this.VIEWER_CALLBACK_ADDRESS)
              .toTransferParams({ amount: collateralAmountInMutez, mutez: true })
          )
          .withContractCall(engineContract.methods.mint(round(new BigNumber(mintAmountInToken))))
      )
    } else {
      if (this.activeCollateral.token.symbol === 'tez') {
        return this.sendAndAwait(
          this.tezos.wallet
            .batch()
            .withTransfer(
              engineContract.methods
                .create_vault(allowSettlement, baker ? baker : null, this.VIEWER_CALLBACK_ADDRESS)
                .toTransferParams({ amount: collateralAmountInMutez, mutez: true })
            )
            .withContractCall(engineContract.methods.mint(round(new BigNumber(mintAmountInToken))))
        )
      }

      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(await this.prepareAddTokenOperator(this.activeCollateral.token, this.ENGINE_ADDRESS))
          .withContractCall(engineContract.methods.create_vault(allowSettlement, this.VIEWER_CALLBACK_ADDRESS))
          .withContractCall(engineContract.methods.deposit(collateralAmountInMutez))
          .withContractCall(engineContract.methods.mint(round(new BigNumber(mintAmountInToken))))
          .withContractCall(await this.prepareRemoveTokenOperator(this.activeCollateral.token, this.ENGINE_ADDRESS))
      )
    }
  }

  @cache()
  protected async getOwnAddress(): Promise<string> {
    return await this.tezos.wallet.pkh({ forceRefetch: true })
  }

  @cache()
  protected async hasVault(): Promise<boolean> {
    try {
      const address = await this.getOwnVaultAddress()
      return Boolean(address)
    } catch {}
    return false
  }

  @cache()
  public async getOwnVaultAddress(): Promise<string> {
    return this.getFromStorageOrPersist(StorageKey.OWN_VAULT_ADDRESS, async () => {
      const source = await this.getOwnAddress()
      const engineContract = await this.engineContractPromise
      const storage = (await this.getStorageOfContract(engineContract)) as any
      const vaultContext = await this.getStorageValue(storage, 'vault_contexts', source)
      if (!vaultContext) {
        throw new Error('Account does not have a Vault yet!')
      }

      return vaultContext.address ?? source
    })
  }
  public async transferMutez(amountInMutez: number, address: string): Promise<string> {
    return this.sendAndAwait(
      this.tezos.wallet.transfer({
        to: address,
        amount: amountInMutez,
        mutez: true
      })
    )
  }

  // TODO: Rename to "setVaultDelegate"
  public async setDeletage(delegate: string | null): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.set_vault_delegate(delegate))
  }

  public async depositCollateral(amountInMutez: number): Promise<string> {
    if (this.activeCollateral.token.symbol === 'tez') {
      const ownVaultAddress = await this.getOwnVaultAddress()
      return this.transferMutez(amountInMutez, ownVaultAddress)
    } else {
      const engineContract = await this.engineContractPromise
      return this.sendAndAwait(
        this.tezos.wallet
          .batch()
          .withContractCall(await this.prepareAddTokenOperator(this.activeCollateral.token, this.ENGINE_ADDRESS))
          .withContractCall(engineContract.methods.deposit(amountInMutez))
          .withContractCall(await this.prepareRemoveTokenOperator(this.activeCollateral.token, this.ENGINE_ADDRESS))
      )
    }
  }

  public async withdrawCollateral(amountInMutez: number): Promise<string> {
    const engineContract = await this.engineContractPromise

    return this.sendAndAwait(engineContract.methods.withdraw(amountInMutez))
  }

  public async mint(mintAmount: number): Promise<string> {
    const engineContract = await this.engineContractPromise

    return this.sendAndAwait(engineContract.methods.mint(mintAmount))
  }

  public async burn(burnAmount: number): Promise<string> {
    const engineContract = await this.engineContractPromise

    return this.sendAndAwait(engineContract.methods.burn(burnAmount))
  }

  protected async transferToken(tokenAddress: string, recipient: string, tokenAmount: number, tokenId: number): Promise<string> {
    const source = await this.getOwnAddress()
    const tokenContract = await this.tezos.wallet.at(tokenAddress)
    return this.sendAndAwait(
      tokenContract.methods.transfer([
        {
          from_: source,
          txs: [
            {
              to_: recipient,
              token_id: tokenId,
              amount: tokenAmount
            }
          ]
        }
      ])
    )
  }

  public async transferSyntheticToken(recipient: string, tokenAmount: number): Promise<string> {
    return this.transferToken(this.token.contractAddress, recipient, tokenAmount, Number(this.token.tokenId))
  }

  public async transferGovernanceToken(recipient: string, tokenAmount: number): Promise<string> {
    return this.transferToken(this.governanceToken.contractAddress, recipient, tokenAmount, Number(this.governanceToken.tokenId))
  }

  protected async addTokenOperator(token: Token, operator: string): Promise<string> {
    return this.sendAndAwait(await this.prepareAddTokenOperator(token, operator))
  }

  protected async prepareAddTokenOperator(token: Token, operator: string): Promise<ContractMethod<Wallet>> {
    const source = await this.getOwnAddress()
    const tokenContract = await this.tezos.wallet.at(token.contractAddress)

    if (token.type === TokenType.FA2) {
      return tokenContract.methods.update_operators([
        {
          add_operator: {
            owner: source,
            operator: operator,
            token_id: token.tokenId
          }
        }
      ])
    } else if (token.type === TokenType.FA1p2) {
      const amount = `1${'0'.repeat(token.decimals + 12)}` // TODO: Replace with actual token amount

      return tokenContract.methods.approve(operator, amount)
    }
    throw new Error('Token type not supported')
  }

  protected async prepareRemoveTokenOperator(token: Token, operator: string): Promise<ContractMethod<Wallet>> {
    const source = await this.getOwnAddress()
    const tokenContract = await this.tezos.wallet.at(token.contractAddress)

    if (token.type === TokenType.FA2) {
      return tokenContract.methods.update_operators([
        {
          remove_operator: {
            owner: source,
            operator: operator,
            token_id: token.tokenId
          }
        }
      ])
    } else if (token.type === TokenType.FA1p2) {
      return tokenContract.methods.approve(operator, '0')
    }
    throw new Error('Token type not supported')
  }

  protected async addSynthenticTokenOperator(operator: string): Promise<string> {
    return this.addTokenOperator(this.token, operator)
  }

  protected async addGovernanceTokenOperator(operator: string): Promise<string> {
    return this.addTokenOperator(this.governanceToken, operator)
  }

  public async claimGovernanceToken(): Promise<string> {
    const governanceTokenContract = await this.governanceTokenContractPromise
    return this.sendAndAwait(governanceTokenContract.methods.claim(null))
  }

  public async depositToRewardsPool(tokenAmount: number): Promise<string> {
    const source = await this.getOwnAddress()
    const rewardsPoolContract = await this.rewardsPoolContractPromise

    let batchCall = this.tezos.wallet.batch()
    if (!(await this.isGovernanceTokenOperatorSet(this.REWARD_POOL_ADDRESS))) {
      const governanceTokenContract = await this.governanceTokenContractPromise
      batchCall = batchCall.withContractCall(
        governanceTokenContract.methods.update_operators([
          { add_operator: { owner: source, operator: this.REWARD_POOL_ADDRESS, token_id: Number(this.governanceToken.tokenId) } }
        ])
      )
    }
    batchCall = batchCall.withContractCall(rewardsPoolContract.methods.deposit(tokenAmount))

    return this.sendAndAwait(batchCall)
  }

  public async claimRewards(): Promise<string> {
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    return this.sendAndAwait(rewardsPoolContract.methods.claim(null))
  }

  public async claimAndStake(): Promise<string> {
    // TODO: Refactor this so the code is not duplicated in "depositToRewardsPool". We should find a way to batch our sdk methods together, we need that in a couple flows
    const claimableTokenAmount = await this.getClaimableGovernanceToken()
    const governanceTokenContract = await this.governanceTokenContractPromise

    const source = await this.getOwnAddress()
    const rewardsPoolContract = await this.rewardsPoolContractPromise

    let batchCall = this.tezos.wallet.batch()
    batchCall = batchCall.withContractCall(governanceTokenContract.methods.claim(null))

    if (!(await this.isGovernanceTokenOperatorSet(this.REWARD_POOL_ADDRESS))) {
      const governanceTokenContract = await this.governanceTokenContractPromise
      batchCall = batchCall.withContractCall(
        governanceTokenContract.methods.update_operators([
          { add_operator: { owner: source, operator: this.REWARD_POOL_ADDRESS, token_id: 0 } }
        ])
      )
    }
    batchCall = batchCall.withContractCall(rewardsPoolContract.methods.deposit(Math.floor(claimableTokenAmount.toNumber()).toString()))

    return this.sendAndAwait(batchCall)
  }

  public async withdrawFromRewardsPool(): Promise<string> {
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    return this.sendAndAwait(rewardsPoolContract.methods.withdraw(null))
  }

  public async depositToSavingsPool(tokenAmount: number): Promise<string> {
    const source = await this.getOwnAddress()
    const savingsPoolContract = await this.savingsV2PoolContractPromise

    let batchCall = this.tezos.wallet.batch()
    if (!(await this.isSyntheticAssetOperatorSet(this.SAVINGS_V2_POOL_ADDRESS))) {
      const tokenContract = await this.tokenContractPromise
      batchCall = batchCall.withContractCall(
        tokenContract.methods.update_operators([
          { add_operator: { owner: source, operator: this.SAVINGS_V2_POOL_ADDRESS, token_id: this.token.tokenId } }
        ])
      )
    }
    batchCall = batchCall.withContractCall(savingsPoolContract.methods.deposit(tokenAmount))

    return this.sendAndAwait(batchCall)
  }

  public async withdrawFromSavingsPool(): Promise<string> {
    if (!this.savingsPoolContractPromise) {
      throw new Error('Savings Pool V1 not defined')
    }

    const savingsPoolContract = await this.savingsPoolContractPromise
    return this.sendAndAwait(savingsPoolContract.methods.withdraw(null))
  }

  public async withdrawFromSavingsPoolV2(): Promise<string> {
    const savingsPoolContract = await this.savingsV2PoolContractPromise
    return this.sendAndAwait(savingsPoolContract.methods.withdraw(null))
  }

  public async withdrawFromVestingPoolV2(): Promise<string> {
    const source = await this.getOwnAddress()
    const vestingContract = await this.savingsV2VestingContractPromise
    return this.sendAndAwait(
      vestingContract.methods.divest([
        {
          locker: this.SAVINGS_V2_POOL_ADDRESS,
          recipient: source
        }
      ])
    )
  }

  public async advertiseIntent(tokenAmount: number): Promise<string> {
    const source = await this.getOwnAddress()
    const optionsListingContract = await this.optionsListingContractPromise

    let batchCall = this.tezos.wallet.batch()
    if (!(await this.isSyntheticAssetOperatorSet(this.OPTIONS_LISTING_ADDRESS))) {
      const tokenContract = await this.tokenContractPromise
      batchCall = batchCall.withContractCall(
        tokenContract.methods.update_operators([
          {
            add_operator: {
              owner: source,
              operator: this.OPTIONS_LISTING_ADDRESS,
              token_id: this.token.tokenId
            }
          }
        ])
      )
    }
    batchCall = batchCall.withContractCall(optionsListingContract.methods.advertise_intent(tokenAmount))
    return this.sendAndAwait(batchCall)
  }

  public async removeIntent(): Promise<string> {
    const optionsListingContract = await this.optionsListingContractPromise
    return this.sendAndAwait(optionsListingContract.methods.remove_intent(null))
  }

  @cache()
  public async getIntentPayoutAmount(tokenAmount: number): Promise<BigNumber> {
    const marketPriceAmount = (await this.getTargetPrice()).multipliedBy(tokenAmount)
    return marketPriceAmount
      .minus(marketPriceAmount.dividedBy(2 ** 4) /* taking away the 6.25% fee */)
      .shiftedBy(-1 * this.getDecimalsWorkaround()) // TODO: Fix decimals
  }

  public async fulfillIntent(intentOwner: string, tokenAmount: number): Promise<string> {
    const payoutAmount = await this.getIntentPayoutAmount(tokenAmount)
    if (this.activeCollateral.token.symbol === 'tez') {
      return await this.fulfillIntentTez(intentOwner, payoutAmount)
    } else {
      return await this.fulfillIntentToken(intentOwner, payoutAmount)
    }
  }

  public async fulfillIntentTez(intentOwner: string, tezAmount: BigNumber): Promise<string> {
    const optionsListingContract = await this.optionsListingContractPromise

    return this.sendAndAwait(
      this.tezos.wallet.batch().withTransfer(
        optionsListingContract.methods.fulfill_intent(intentOwner).toTransferParams({
          amount: Math.floor(tezAmount.toNumber()),
          mutez: true
        })
      )
    )
  }

  protected async fulfillIntentToken(intentOwner: string, tokenAmount: BigNumber): Promise<string> {
    const optionsListingContract = await this.optionsListingContractPromise

    let shiftAmountBy = 6 // TODO: This was hardcoded, it should probably be dynamic depending on asset/collateral pair
    if (this.activeCollateral.token.symbol === 'tzbtc') {
      shiftAmountBy = 0
    }

    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withContractCall(await this.prepareAddTokenOperator(this.activeCollateral.token, this.OPTIONS_LISTING_ADDRESS))
        .withContractCall(
          optionsListingContract.methods.fulfill_intent(intentOwner, Math.floor(tokenAmount.shiftedBy(shiftAmountBy).toNumber()))
        )
        .withContractCall(await this.prepareRemoveTokenOperator(this.activeCollateral.token, this.OPTIONS_LISTING_ADDRESS))
    )
  }

  public async executeIntent(vaults: { vaultOwner: string; tokenAmount: number }[]): Promise<string> {
    const optionsListingContract = await this.optionsListingContractPromise

    const batch = this.tezos.wallet.batch()

    for (let vault of vaults) {
      batch.withContractCall(optionsListingContract.methods.execute_intent(vault.vaultOwner, vault.tokenAmount))
    }

    return this.sendAndAwait(batch)
  }

  public async bailout(tokenAmount: number): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.bailout(tokenAmount))
  }

  //Quipo Actions start here
  protected async governanceTokenToTezSwap(tokenAmount: BigNumber, minimumReceived: BigNumber): Promise<string> {
    return new QuipuswapExchange(this.tezos, this.contracts.GOVERNANCE_DEX, this.tokens.xtzToken, this.tokens.youToken).token2ToToken1(
      tokenAmount,
      minimumReceived
    )
  }

  protected async tezToGovernanceSwap(amountInMutez: BigNumber, minimumReceived: BigNumber): Promise<string> {
    return new QuipuswapExchange(this.tezos, this.contracts.GOVERNANCE_DEX, this.tokens.xtzToken, this.tokens.youToken).token1ToToken2(
      amountInMutez,
      minimumReceived
    )
  }

  // Values and Numbers start here
  public startChainWatcher() {
    if (this.chainWatcherIntervalId === undefined) {
      this.chainWatcherIntervalId = setInterval(async () => {
        const nodeService = getNodeService()
        const block = await nodeService.getHeader(this.tezos.rpc.getRpcUrl())
        if (block.hash !== this.lastBlockHash) {
          await this.clearCache()
          this.chainUpdateCallbacks.map((callback) => {
            callback()
          })
        }
        this.lastBlockHash = block.hash
      }, 1000 * 10)
    }
  }

  protected async watchChainUpdate(callback: () => void) {
    this.chainUpdateCallbacks.push(callback)
  }

  protected async clearChainUpdateWatchers() {
    this.chainUpdateCallbacks = []
  }

  @cache()
  protected async getSyntheticAssetTotalSupply(): Promise<BigNumber> {
    const tokenContract = await this.tokenContractPromise
    const storage = (await this.getStorageOfContract(tokenContract)) as any
    const supply = await this.getStorageValue(storage, 'total_supply', this.token.tokenId)
    return new BigNumber(supply)
  }

  // TODO: Can we replace this with the Quipuswap class?
  @cache()
  protected async getExchangeRate(dexAddress: string): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    return new BigNumber(storage['storage']['token_pool'])
      .dividedBy(10 ** this.token.decimals)
      .dividedBy(new BigNumber(storage['storage']['tez_pool']).dividedBy(10 ** this.TEZ_DECIMALS))
  }

  // TODO: Can we replace this with the Quipuswap class?
  @cache()
  protected async getExchangeMaximumTokenAmount(dexAddress: string): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTokenPool = new BigNumber(storage['storage']['token_pool'])
    return currentTokenPool.dividedBy(3)
  }

  // TODO: Can we replace this with the Quipuswap class?
  @cache()
  protected async getExchangeMaximumTezAmount(dexAddress: string): Promise<BigNumber> {
    const dexContract = await this.getContractWalletAbstraction(dexAddress)
    const storage = (await this.getStorageOfContract(dexContract)) as any
    const currentTezPool = new BigNumber(storage['storage']['tez_pool'])
    return currentTezPool.dividedBy(3)
  }

  // TODO: Can we replace this with the Quipuswap class?
  @cache()
  protected async getGovernanceTokenExchangeMaximumTezAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTezAmount(this.GOVERNANCE_DEX)
  }

  // TODO: Can we replace this with the Quipuswap class?
  @cache()
  protected async getGovernanceTokenExchangeMaximumTokenAmount(): Promise<BigNumber> {
    return this.getExchangeMaximumTokenAmount(this.GOVERNANCE_DEX)
  }

  @cache()
  protected async getSyntheticAssetExchangeRate(): Promise<BigNumber> {
    if (this.token.symbol === 'uBTC') {
      // Plenty does not open a uusd/btc pool, so we cannot get a direct USD price, instead, we will take the tzbtc / tez price
      return new BigNumber(1).div(
        await new QuipuswapExchange(
          this.tezos,
          'KT1WBLrLE2vG8SedBqiSJFm4VVAZZBytJYHc',
          (this.networkConstants.tokens as any).tzbtcToken,
          (this.networkConstants.tokens as any).xtzToken
        ).getExchangeRate()
      )
    } else if (this.activeCollateral.token.symbol === 'tez') {
      return await new QuipuswapExchange(
        this.tezos,
        (this.contracts.DEX[0] as any).address,
        this.tokens.xtzToken,
        this.token
      ).getExchangeRate()
    } else {
      return new PlentyExchange(
        this.tezos,
        (this.contracts.DEX[1] as any).address,
        this.contracts.DEX[1].token1,
        this.contracts.DEX[1].token2
      ).getExchangeRate()
    }
  }

  @cache()
  protected async getTezUsdExchangeRate(): Promise<BigNumber> {
    const tezuusdExchange = this.networkConstants.dexes.find((dex) => {
      return (
        dex.dexType === DexType.QUIPUSWAP &&
        ((dex.token1.id === this.tokens.xtzToken.id && dex.token2.id === this.tokens.uusdToken.id) ||
          (dex.token1.id === this.tokens.uusdToken.id && dex.token2.id === this.tokens.xtzToken.id))
      )
    })

    if (!tezuusdExchange) {
      console.log('all dexes', this.contracts.DEX)
      throw new Error('No tez <=> uUSD exchange rate found.')
    }

    return await new QuipuswapExchange(
      this.tezos,
      (tezuusdExchange as any).address,
      tezuusdExchange.token1,
      tezuusdExchange.token2
    ).getExchangeRate()
  }

  // TODO: Can we replace this with the Quipuswap class?
  @cache()
  protected async getGovernanceTokenExchangeRate(): Promise<BigNumber> {
    return this.getExchangeRate(this.GOVERNANCE_DEX)
  }

  @cache()
  public async getTokenAssetExchangeInstance(dexType: DexType, dexAddress: string, token1: Token, token2: Token): Promise<Exchange> {
    if (dexType === DexType.QUIPUSWAP) {
      return new QuipuswapExchange(this.tezos, dexAddress, token1, token2)
    } else if (dexType === DexType.PLENTY) {
      return new PlentyExchange(this.tezos, dexAddress, token1, token2)
    } else {
      throw new Error('Unknown DEX')
    }
  }

  @cache()
  protected async getTargetExchangeRate(): Promise<BigNumber> {
    return (await this.getObservedPrice()).dividedBy(await this.getTargetPrice())
  }

  @cache()
  protected async getObservedPrice(): Promise<BigNumber> {
    if (this.ENGINE_TYPE === EngineType.TRACKER_V1) {
      return new BigNumber(1).dividedBy(await this.getSyntheticAssetExchangeRate()).multipliedBy(10 ** 6)
    } else {
      return (await this.getSyntheticAssetExchangeRate()).multipliedBy(10 ** 6)
    }
  }

  @cache()
  public async getTargetPrice(): Promise<BigNumber> {
    return new BigNumber(
      await getPriceFromOracle(
        this.TARGET_ORACLE_ADDRESS,
        this.tezos,
        this.networkConstants.fakeAddress,
        this.networkConstants.natViewerCallback
      )
    ).shiftedBy(
      -1 *
        (this.activeCollateral.TARGET_ORACLE_DECIMALS -
          6) /* 6 was the default, so if it's 6 we don't shift, if it's not 6, we need to shift. TODO: This should be changed so all numbers in the SDK are normalised. */
    )
  }

  @cache()
  public async getMaxMintableAmount(amountInMutez: BigNumber | number): Promise<BigNumber> {
    const targetPrice = await this.getTargetPrice()

    return new BigNumber(amountInMutez)
      .dividedBy(this.activeCollateral.collateralTarget)
      .dividedBy(new BigNumber(targetPrice))
      .shiftedBy(
        this.activeCollateral.token.symbol === 'tez'
          ? this.token.decimals
          : this.activeCollateral.token.symbol === 'xtztzbtc'
          ? 6 + 12
          : this.activeCollateral.token.symbol === 'tzbtc'
          ? this.activeCollateral.token.decimals + 2
          : 6 // TODO: Fix decimals
      )
  }

  @cache()
  protected async getAccountMaxMintableAmount(account: string): Promise<BigNumber> {
    const balance = await this.getCollateralTokenWalletBalance(account)
    return this.getMaxMintableAmount(balance)
  }

  @cache()
  protected async getOwnMaxMintableAmount(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getAccountMaxMintableAmount(source)
  }

  @cache()
  @trycatch(new BigNumber(0))
  protected async getVaultMaxMintableAmount(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    const engineContract = await this.engineContractPromise

    const storage = (await this.getStorageOfContract(engineContract)) as any

    const vaultContext = await this.getStorageValue(storage, 'vault_contexts', source)
    if (this.activeCollateral.token.symbol === 'tez') {
      if (!vaultContext.address) {
        throw new Error('No Vault address!')
      }
    }

    return this.getMaxMintableAmount(vaultContext.balance)
  }

  @cache()
  protected async getVaultCollateralisation(): Promise<BigNumber> {
    return (await this.getVaultMaxMintableAmount()).dividedBy(await this.getMintedSyntheticAsset())
  }

  @cache()
  protected async getCollateralisationUsage(): Promise<BigNumber> {
    return new BigNumber(1).dividedBy(await this.getVaultCollateralisation())
  }

  @cache()
  protected async getExpectedWeeklyGovernanceRewards(mintedAmount: number): Promise<BigNumber> {
    const targetPrice = await this.getTargetPrice()

    const governanceTokenContract = await this.governanceTokenContractPromise
    const governanceTokenStorage: GovernanceTokenStorage = (await this.getStorageOfContract(governanceTokenContract)) as any
    const totalStake = new BigNumber(governanceTokenStorage.total_stake)
    const weight = new BigNumber(targetPrice).multipliedBy(mintedAmount).dividedBy(totalStake.plus(mintedAmount))

    return (await this.getWeeklyGovernanceTokenIssuance()).multipliedBy(weight)
  }

  @cache()
  protected async getWeeklyGovernanceTokenIssuance(): Promise<BigNumber> {
    return new BigNumber(40000 * 10 ** this.governanceToken.decimals)
  }

  @cache()
  protected async getGovernanceTokenTotalSupply(): Promise<BigNumber> {
    const governanceTokenContract = await this.governanceTokenContractPromise
    const governanceTokenStorage: GovernanceTokenStorage = (await this.getStorageOfContract(governanceTokenContract)) as any
    const timedelta = (new Date().getTime() - Date.parse(governanceTokenStorage['epoch_start_timestamp'])) / 1000
    return new BigNumber(timedelta * this.GOVERNANCE_TOKEN_ISSUANCE_RATE).times(1.125) // 1.125 for the 5k YOU that go to us
  }

  @cache()
  public async getGovernanceMintedPercentage(): Promise<BigNumber> {
    const governanceTokenTotalSupply = await this.getGovernanceTokenTotalSupply()
    return governanceTokenTotalSupply
      .shiftedBy(-1 * this.governanceToken.decimals)
      .div(4_680_000)
      .times(100)
  }

  @cache()
  protected async getYearlyLiabilityInterestRate(): Promise<BigNumber> {
    return (await this.getYearlyAssetInterestRate()).plus(await this.getYearlySpreadInterestRate()).minus(1)
  }

  @cache()
  protected async getYearlyAssetInterestRate(): Promise<BigNumber> {
    const engineContract = await this.engineContractPromise
    const engineStorage: EngineStorage = (await this.getStorageOfContract(engineContract)) as any
    return new BigNumber(
      new BigNumber(engineStorage.reference_interest_rate).plus(this.PRECISION_FACTOR).dividedBy(this.PRECISION_FACTOR).toNumber() **
        (60 * 60 * 24 * 365)
    )
  }

  @cache()
  protected async getYearlySpreadInterestRate(): Promise<BigNumber> {
    return new BigNumber(
      new BigNumber(this.SECONDS_INTEREST_SPREAD).plus(this.PRECISION_FACTOR).dividedBy(this.PRECISION_FACTOR).toNumber() **
        (60 * 60 * 24 * 365)
    )
  }

  protected async getClaimableGovernanceToken(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    const governanceTokenContract = await this.governanceTokenContractPromise
    const governanceTokenStorage: GovernanceTokenStorage = (await this.getStorageOfContract(governanceTokenContract)) as any

    let currentDistFactor = new BigNumber(governanceTokenStorage['dist_factor'])
    const ownStake = new BigNumber(await this.getStorageValue(governanceTokenStorage, 'stakes', source))
    const ownDistFactor = new BigNumber(await this.getStorageValue(governanceTokenStorage, 'dist_factors', source))
    const timedelta = (new Date().getTime() - Date.parse(governanceTokenStorage['last_update_timestamp'])) / 1000
    const totalStake = new BigNumber(governanceTokenStorage['total_stake'])
    currentDistFactor = currentDistFactor.plus(
      new BigNumber(timedelta * this.GOVERNANCE_TOKEN_ISSUANCE_RATE * this.GOVERNANCE_TOKEN_PRECISION_FACTOR).dividedBy(totalStake)
    )

    return ownStake.multipliedBy(currentDistFactor.minus(ownDistFactor)).dividedBy(this.GOVERNANCE_TOKEN_PRECISION_FACTOR)
  }

  @cache()
  protected async getClaimableRewards(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    const rewardsPoolStorage: RewardsPoolStorage = (await this.getStorageOfContract(rewardsPoolContract)) as any

    let currentDistFactor = new BigNumber(rewardsPoolStorage['dist_factor'])
    const ownStake = new BigNumber(await this.getStorageValue(rewardsPoolStorage, 'stakes', source))
    const ownDistFactor = new BigNumber(await this.getStorageValue(rewardsPoolStorage, 'dist_factors', source))

    return ownStake.multipliedBy(currentDistFactor.minus(ownDistFactor)).dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  protected async getClaimableSavingsPayout(): Promise<BigNumber | undefined> {
    const source = await this.getOwnAddress()
    const savingsPoolContract = await this.savingsV2PoolContractPromise
    const savingsPoolStorage: SavingsPoolStorage = (await this.getStorageOfContract(savingsPoolContract)) as any

    let currentDistFactor = new BigNumber(savingsPoolStorage['dist_factor'])

    const ownStake: BigNumber | undefined = new BigNumber(await this.getStorageValue(savingsPoolStorage, 'stakes', source))
    const ownDistFactor: BigNumber | undefined = new BigNumber(await this.getStorageValue(savingsPoolStorage, 'dist_factors', source))

    return ownStake.multipliedBy(currentDistFactor.minus(ownDistFactor)).dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  public async getVestedSavings(): Promise<VestingLedgerValue> {
    const source = await this.getOwnAddress()
    const vestingContract = await this.savingsV2VestingContractPromise
    const vestingStorage: VestingStorage = (await this.getStorageOfContract(vestingContract)) as any
    const ownVested: VestingLedgerValue = await this.getStorageValue(vestingStorage, 'ledger', {
      owner: source,
      locker: this.SAVINGS_V2_POOL_ADDRESS
    })

    return ownVested
  }

  @cache()
  protected async getRequiredCollateral(): Promise<BigNumber> {
    const targetPrice = await this.getTargetPrice()
    return (await this.getMintedSyntheticAsset())
      .multipliedBy(new BigNumber(targetPrice))
      .multipliedBy(this.activeCollateral.collateralTarget)
      .shiftedBy(
        -1 * this.getDecimalsWorkaround() // TODO: Fix decimals
      )
  }

  @cache()
  public async getVaultContext(tzAddress: string): Promise<VaultContext> {
    const engineContract = await this.engineContractPromise
    const storage = (await this.getStorageOfContract(engineContract)) as any
    const vaultContext: VaultContext = await this.getStorageValue(storage, 'vault_contexts', tzAddress)

    return vaultContext
  }

  @cache()
  protected async getOwnVaultContext(): Promise<VaultContext> {
    const source = await this.getOwnAddress()

    return await this.getVaultContext(source)
  }

  @cache()
  @trycatch(new BigNumber(0))
  protected async getMintedSyntheticAsset(address?: string): Promise<BigNumber> {
    if (!address) {
      address = await this.getOwnAddress()
    }

    const engineContract = await this.engineContractPromise
    const storage = (await this.getStorageOfContract(engineContract)) as any

    return new BigNumber((await this.getVaultContext(address)).minted)
      .multipliedBy(new BigNumber(storage['compound_interest_rate']))
      .dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  protected async getWithdrawableCollateral(): Promise<BigNumber> {
    return (await this.getOwnVaultBalance()).minus(await this.getRequiredCollateral())
  }

  @cache()
  @trycatch(new BigNumber(0))
  protected async getMintableAmount(): Promise<BigNumber> {
    const maxMintable = await this.getVaultMaxMintableAmount()
    const res = maxMintable.minus(await this.getMintedSyntheticAsset())
    return res
  }

  @cache()
  protected async getVaultDelegate(): Promise<string | null> {
    return this.getDelegate((await this.getOwnVaultContext()).address)
  }

  @cache()
  @trycatch(new BigNumber(0))
  public async getCompoundInterestRate(): Promise<BigNumber> {
    const engineContract = await this.engineContractPromise
    const storage = (await this.getStorageOfContract(engineContract)) as any

    return new BigNumber(storage['compound_interest_rate']).dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  protected async getAllowsSettlement(): Promise<boolean | undefined> {
    if (this.ENGINE_TYPE !== EngineType.TRACKER_V2) {
      return true
    } else {
      return this.getFromStorageOrPersist(StorageKey.ALLOWS_SETTLEMENT, async () => {
        const source = await this.getOwnAddress()
        const engineContract = await this.engineContractPromise
        const storage = (await this.getStorageOfContract(engineContract)) as any
        const vaultContext = await this.getStorageValue(storage, 'vault_contexts', source)

        if (!vaultContext) {
          throw new Error('Account does not have a Vault yet!')
        }

        return vaultContext.allows_settlement
      })
    }
  }

  @cache()
  protected async isOperatorSet(tokenContractAddress: string, operator: string, tokenId: number): Promise<boolean> {
    const source = await this.getOwnAddress()
    const tokenContract = await this.tezos.wallet.at(tokenContractAddress)
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const isOperatorSet = await this.getStorageValue(tokenStorage, 'operators', {
      owner: source,
      operator: operator,
      token_id: tokenId
    })
    return isOperatorSet !== undefined
  }

  @cache()
  protected async isSyntheticAssetOperatorSet(operator: string): Promise<boolean> {
    return this.isOperatorSet(this.token.contractAddress, operator, Number(this.token.tokenId))
  }

  @cache()
  protected async isGovernanceTokenOperatorSet(operator: string): Promise<boolean> {
    return this.isOperatorSet(this.governanceToken.contractAddress, operator, Number(this.governanceToken.tokenId))
  }

  @cache()
  protected async getTokenFA1p2Amount(tokenContractAddress: string, owner: string): Promise<BigNumber> {
    return new BigNumber(
      (await getFA1p2Balance(
        owner,
        tokenContractAddress,
        this.tezos,
        this.networkConstants.fakeAddress,
        this.networkConstants.natViewerCallback
      )) ?? 0
    )
  }

  @cache()
  protected async getTokenAmount(tokenContractAddress: string, owner: string, tokenId: number): Promise<BigNumber> {
    const tokenContract = await this.tezos.wallet.at(tokenContractAddress)
    const tokenStorage = (await this.getStorageOfContract(tokenContract)) as any
    const tokenAmount = await this.getStorageValue(tokenStorage, 'ledger', {
      owner: owner,
      token_id: tokenId
    })
    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  @cache()
  protected async getOwnCollateralTokenWalletBalance(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getCollateralTokenWalletBalance(source)
  }

  @cache()
  protected async getCollateralTokenWalletBalance(address: string): Promise<BigNumber> {
    if (this.activeCollateral.token.type === TokenType.NATIVE) {
      return this.getTezWalletBalance(address)
    } else if (this.activeCollateral.token.type === TokenType.FA2) {
      return this.getTokenAmount(this.activeCollateral.token.contractAddress, address, this.activeCollateral.token.tokenId)
    }
    return this.getTokenFA1p2Amount(this.activeCollateral.token.contractAddress, address)
  }

  @cache()
  protected async getOwnSyntheticAssetTokenAmount(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getTokenAmount(this.token.contractAddress, source, Number(this.token.tokenId))
  }

  @cache()
  protected async getOwnGovernanceTokenAmount(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    return this.getTokenAmount(this.governanceToken.contractAddress, source, Number(this.governanceToken.tokenId))
  }

  // @cache()
  // protected async getSavingsPoolYearlyInterestRate(): Promise<BigNumber> {
  //   const syntheticAssetTotalSupply = await this.getSyntheticAssetTotalSupply()

  //   return syntheticAssetTotalSupply
  //     .multipliedBy((await this.getYearlyAssetInterestRate()).minus(1))
  //     .dividedBy(await this.getTokenAmount(this.token.contractAddress, this.SAVINGS_V2_POOL_ADDRESS, Number(this.token.tokenId)))
  // }

  @cache()
  protected async getSavingsPoolYearlyInterestRate(): Promise<BigNumber> {
    const savingsPoolTotalStake = await this.getTotalSavingsPoolStake()

    const fromDate = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
    const toDate = new Date()

    const weeklyValue = await this.youvesIndexer.getTransferAggregateOverTime(
      this.SAVINGS_V2_POOL_ADDRESS,
      this.token,
      fromDate,
      toDate,
      'tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU' /* Burn address */
    )

    const yearlyFactor = new BigNumber(this.YEAR_MILLIS / (toDate.getTime() - fromDate.getTime()))

    return calculateAPR(
      savingsPoolTotalStake,
      weeklyValue,
      yearlyFactor,
      new BigNumber(1), // Pool and rewards are the same asset, no conversion required
      new BigNumber(1) // Pool and rewards are the same asset, no conversion required
    )
  }

  @cache()
  protected async getSavingsPoolTokenAmount(): Promise<BigNumber> {
    return this.getTokenAmount(this.token.contractAddress, this.SAVINGS_V2_POOL_ADDRESS, Number(this.token.tokenId))
  }

  @cache()
  protected async getRewardsPoolTokenAmount(): Promise<BigNumber> {
    return this.getTokenAmount(this.governanceToken.contractAddress, this.REWARD_POOL_ADDRESS, Number(this.governanceToken.tokenId))
  }

  @cache()
  public async getExpectedYearlySavingsPoolReturn(tokenAmount: number): Promise<BigNumber> {
    return (await this.getSavingsPoolYearlyInterestRate()).multipliedBy(tokenAmount)
  }

  @cache()
  public async getFutureExpectedYearlySavingsPoolReturn(oldAmount: number, newAmount: number): Promise<BigNumber> {
    const ratio = await this.getFutureSavingsPoolRatio(new BigNumber(oldAmount), new BigNumber(newAmount))

    return ratio.times(await this.getTotalExpectedYearlySavingsPoolReturn())
  }

  @cache()
  protected async getTotalExpectedYearlySavingsPoolReturn(): Promise<BigNumber> {
    const fromDate = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
    const toDate = new Date()

    const weeklyValue = await this.youvesIndexer.getTransferAggregateOverTime(
      this.SAVINGS_V2_POOL_ADDRESS,
      this.token,
      fromDate,
      toDate,
      'tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU' /* Burn address */
    )

    return weeklyValue.times(52)
  }

  @cache()
  protected async getExpectedYearlyRewardPoolReturn(tokenAmount: number): Promise<BigNumber> {
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    const rewardsPoolStorage: RewardsPoolStorage = (await this.getStorageOfContract(rewardsPoolContract)) as any
    return (await this.getTotalExpectedYearlyRewardPoolReturn())
      .multipliedBy(tokenAmount)
      .dividedBy(new BigNumber(rewardsPoolStorage['total_stake']))
  }

  @cache()
  public async getFutureExpectedYearlyRewardPoolReturn(oldAmount: number, newAmount: number): Promise<BigNumber> {
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    const rewardsPoolStorage: RewardsPoolStorage = (await this.getStorageOfContract(rewardsPoolContract)) as any
    return (await this.getTotalExpectedYearlyRewardPoolReturn())
      .multipliedBy(new BigNumber(oldAmount).plus(newAmount))
      .dividedBy(new BigNumber(rewardsPoolStorage['total_stake']).plus(newAmount))
  }

  @cache()
  protected async getTotalExpectedYearlyRewardPoolReturn(): Promise<BigNumber> {
    const fromDate = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
    const toDate = new Date()

    const weeklyValue = await this.youvesIndexer.getTransferAggregateOverTime(this.REWARD_POOL_ADDRESS, this.token, fromDate, toDate)

    return weeklyValue.times(52)
  }

  @cache()
  public async getOwnRewardPoolStake(): Promise<BigNumber> {
    const source = await this.getOwnAddress()
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    const rewardsPoolStorage: RewardsPoolStorage = (await this.getStorageOfContract(rewardsPoolContract)) as any
    return new BigNumber(await this.getStorageValue(rewardsPoolStorage, 'stakes', source))
  }

  @cache()
  protected async getTotalRewardPoolStake(): Promise<BigNumber> {
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    const rewardsPoolStorage: RewardsPoolStorage = (await this.getStorageOfContract(rewardsPoolContract)) as any
    const totalStake = rewardsPoolStorage['total_stake']
    return new BigNumber(totalStake)
  }
  @cache()
  protected async getRewardsPoolRatio(amount?: BigNumber): Promise<BigNumber> {
    const totalRewardPoolStake = await this.getTotalRewardPoolStake()
    const ownRewardPoolStake = amount ?? (await this.getOwnRewardPoolStake())
    const ratio = ownRewardPoolStake.dividedBy(totalRewardPoolStake)
    return new BigNumber(ratio)
  }
  /**
   * This method will calculate the pool ratio for an amount that will be added to the pool
   */
  @cache()
  public async getFutureRewardsPoolRatio(oldAmount: BigNumber, newAmount: BigNumber): Promise<BigNumber> {
    const totalFutureRewardPoolStake = (await this.getTotalRewardPoolStake()).plus(newAmount)
    const ratio = oldAmount.plus(newAmount).dividedBy(totalFutureRewardPoolStake)
    return new BigNumber(ratio)
  }

  @cache()
  public async getOwnSavingsV1PoolStake(): Promise<BigNumber | undefined> {
    if (!this.savingsPoolContractPromise) {
      return new BigNumber(0)
    }

    if (this.symbol !== 'uUSD') {
      return new BigNumber(0)
    }

    const source = await this.getOwnAddress()
    const savingsPoolContract = await this.savingsPoolContractPromise
    const savingsPoolStorage: SavingsPoolStorage = (await this.getStorageOfContract(savingsPoolContract)) as any
    const stakes = await this.getStorageValue(savingsPoolStorage, 'stakes', source)

    if (!stakes) {
      return new BigNumber(0)
    }

    return new BigNumber(stakes).multipliedBy(new BigNumber(savingsPoolStorage['disc_factor'])).dividedBy(this.PRECISION_FACTOR)
  }
  @cache()
  public async getOwnSavingsV2PoolStake(): Promise<BigNumber | undefined> {
    const source = await this.getOwnAddress()
    const savingsPoolContract = await this.savingsV2PoolContractPromise
    const savingsPoolStorage: SavingsPoolStorage = (await this.getStorageOfContract(savingsPoolContract)) as any
    const stakes = await this.getStorageValue(savingsPoolStorage, 'stakes', source)

    if (!stakes) {
      return new BigNumber(0)
    }

    return new BigNumber(stakes).multipliedBy(new BigNumber(savingsPoolStorage['disc_factor'])).dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  protected async getTotalSavingsPoolStake(): Promise<BigNumber> {
    const savingsPoolContract = await this.savingsV2PoolContractPromise
    const savingsPoolStorage: SavingsPoolStorage = (await this.getStorageOfContract(savingsPoolContract)) as any
    const totalStake = savingsPoolStorage['total_stake']
    return new BigNumber(totalStake).multipliedBy(new BigNumber(savingsPoolStorage['disc_factor'])).dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  protected async getSavingsPoolRatio(amount?: BigNumber): Promise<BigNumber | undefined> {
    const savingsPoolTokenAmount = await this.getSavingsPoolTokenAmount()
    const ownSavingsPoolStake = amount ?? (await this.getOwnSavingsV2PoolStake())
    const ratio = ownSavingsPoolStake ? ownSavingsPoolStake.dividedBy(savingsPoolTokenAmount) : undefined
    return ratio ? new BigNumber(ratio) : undefined
  }

  /**
   * This method will calculate the pool ratio for an amount that will be added to the pool
   */
  @cache()
  public async getFutureSavingsPoolRatio(oldAmount: BigNumber, newAmount: BigNumber): Promise<BigNumber> {
    const savingsPoolTokenAmount = (await this.getSavingsPoolTokenAmount()).plus(newAmount)
    const ratio = oldAmount.plus(newAmount).dividedBy(savingsPoolTokenAmount)
    return new BigNumber(ratio)
  }

  @cache()
  protected async getSavingsAvailableTokens(): Promise<BigNumber> {
    const savingsPoolContract = await this.savingsV2PoolContractPromise
    const savingsPoolStorage: SavingsPoolStorage = (await this.getStorageOfContract(savingsPoolContract)) as any
    return new BigNumber(savingsPoolStorage['total_stake'])
      .multipliedBy(new BigNumber(savingsPoolStorage['disc_factor']))
      .dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  protected async getIntent(intentOwner: string): Promise<Intent> {
    const optionsListingContract = await this.optionsListingContractPromise
    const optionsListingStorage: OptionsListingStroage = (await this.getStorageOfContract(optionsListingContract)) as any
    const intent = await this.getStorageValue(optionsListingStorage, 'intents', intentOwner)
    intent.owner = intentOwner
    return intent
  }

  @cache()
  protected async getOwnIntent(): Promise<Intent> {
    const source = await this.getOwnAddress()
    return this.getIntent(source)
  }

  @cache()
  protected async getOwnIntentTokenAmount(): Promise<BigNumber> {
    return new BigNumber((await this.getOwnIntent()).token_amount)
  }

  @cache()
  protected async getOwnIntentAdvertisementStart(): Promise<Date> {
    return new Date(Date.parse((await this.getOwnIntent()).start_timestamp))
  }

  @cache()
  protected async getTotalBalanceInVaults(): Promise<BigNumber> {
    return this.youvesIndexer.getTotalBalanceInVaultsForEngine(this.ENGINE_ADDRESS)
  }

  @cache()
  protected async getVaultCount(): Promise<BigNumber> {
    return this.youvesIndexer.getVaultCountForEngine(this.ENGINE_ADDRESS)
  }

  @cache()
  protected async getTotalMinted(): Promise<BigNumber> {
    const minted = await this.youvesIndexer.getTotalMintedForEngine(this.ENGINE_ADDRESS)

    const engineContract = await this.engineContractPromise
    const storage = (await this.getStorageOfContract(engineContract)) as any
    return minted.multipliedBy(new BigNumber(storage['compound_interest_rate'])).dividedBy(this.PRECISION_FACTOR)
  }

  @cache()
  protected async getMintedInTimeRange(from: Date, to: Date): Promise<BigNumber> {
    return this.youvesIndexer.getMintedInTimeRangeForEngine(this.ENGINE_ADDRESS, from, to)
  }

  @cache()
  protected async getBurntInTimeRange(from: Date, to: Date): Promise<BigNumber> {
    return this.youvesIndexer.getBurntInTimeRangeForEngine(this.ENGINE_ADDRESS, from, to)
  }

  @cache()
  public async getRewardPoolAPY(from: Date, to: Date): Promise<BigNumber> {
    const totalStake = await this.getTotalRewardPoolStake()

    const weeklyValue = await this.youvesIndexer.getTransferAggregateOverTime(this.REWARD_POOL_ADDRESS, this.token, from, to)

    const yearlyFactor = new BigNumber(this.YEAR_MILLIS / (to.getTime() - from.getTime()))

    let assetExchangeRate = await this.getSyntheticAssetExchangeRate()
    let govExchangeRate = new BigNumber(1).div(await this.getGovernanceTokenExchangeRate())

    // The "exchange rate" doesn't always target the same symbol, so we need to make sure we have the same base symbol for the calculations.
    // By default, the exchange rates are:
    // uusd => tez
    // udefi => uusd
    // ubtc => tez
    // you => tez
    // So in case of udefi, we have to add the conversion from uusd to tez.
    if (this.token.symbol === 'uDEFI') {
      assetExchangeRate = assetExchangeRate.div(await this.getTezUsdExchangeRate())
    }
    if (this.token.symbol === 'uUSD') {
      assetExchangeRate = new BigNumber(1).div(assetExchangeRate)
    }

    return calculateAPR(totalStake, weeklyValue, yearlyFactor, govExchangeRate, assetExchangeRate)
  }

  @cache()
  protected async getMintingPoolAPY(): Promise<BigNumber> {
    const requiredMutezPerSynthetic = new BigNumber(this.activeCollateral.collateralTarget).multipliedBy(await this.getTargetPrice())
    const expectedYearlyGovernanceToken = (
      await this.getExpectedWeeklyGovernanceRewards(this.GOVERNANCE_TOKEN_PRECISION_FACTOR)
    ).multipliedBy(52)
    return expectedYearlyGovernanceToken
      .dividedBy(await this.getGovernanceTokenExchangeRate())
      .dividedBy(requiredMutezPerSynthetic)
      .dividedBy(10 ** 6)
  }

  @cache()
  protected async getTotalCollateralRatio(): Promise<BigNumber> {
    return (await this.getTotalBalanceInVaults())
      .dividedBy(await this.getTargetPrice())
      .dividedBy(await this.getTotalMinted())
      .shiftedBy(this.getDecimalsWorkaround()) // TODO: Fix decimals
  }

  @cache()
  protected async getVaultCollateralRatio(): Promise<BigNumber> {
    return (await this.getOwnVaultBalance())
      .dividedBy(await this.getTargetPrice())
      .dividedBy(await this.getMintedSyntheticAsset())
      .shiftedBy(this.getDecimalsWorkaround()) // TODO: Fix decimals
  }

  @cache()
  public async getOwnLiquidationPrice(): Promise<BigNumber> {
    const emergency = this.activeCollateral.collateralEmergency
    return (await this.getOwnVaultBalance())
      .dividedBy((await this.getMintedSyntheticAsset()).times(emergency))
      .shiftedBy(this.getDecimalsWorkaround()) // TODO: Fix decimals
  }

  @cache()
  public async getLiquidationPrice(balance: BigNumber, minted: BigNumber): Promise<BigNumber> {
    const emergency = this.activeCollateral.collateralEmergency
    return balance.dividedBy(minted.times(emergency)).shiftedBy(this.getDecimalsWorkaround()) // TODO: Fix decimals
  }

  @cache()
  protected async getIntents(dateThreshold: Date = new Date(0), tokenAmountThreshold: BigNumber = new BigNumber(0)): Promise<Intent[]> {
    return this.youvesIndexer.getIntentsForEngine(this.ENGINE_ADDRESS, dateThreshold, tokenAmountThreshold)
  }

  @cache()
  public async getActivity(vaultAddress: string, orderKey: string = 'created', orderDirection: string = 'desc'): Promise<Activity[]> {
    return this.youvesIndexer.getActivityForEngine(this.ENGINE_ADDRESS, vaultAddress, orderKey, orderDirection)
  }

  @cache()
  public async getExecutableVaults(): Promise<Vault[]> {
    return this.youvesIndexer.getExecutableVaultsForEngine(this.ENGINE_ADDRESS)
  }

  @cache()
  protected async getFullfillableIntents(): Promise<Intent[]> {
    if (this.token.symbol === 'uBTC' || this.activeCollateral.token.symbol === 'tzbtc') {
      // Because uBTC and tzbtc has smaller values, we have to lower the threshold
      return this.getIntents(new Date(Date.now() - 48 * 3600 * 1000), new BigNumber(0))
    } else {
      return this.getIntents(new Date(Date.now() - 48 * 3600 * 1000), new BigNumber(1_000_000_000))
    }
  }

  public async clearCache() {
    globalPromiseCache.clear()
  }

  @cache()
  protected async getContractWalletAbstraction(address: string): Promise<ContractAbstraction<Wallet>> {
    return this.tezos.wallet.at(address)
  }

  @cache()
  protected async getStorageOfContract(contract: ContractAbstraction<Wallet>) {
    return contract.storage()
  }

  @cache()
  protected async getStorageValue(storage: any, key: string, source: any) {
    return storage[key].get(source)
  }

  protected async getFromStorageOrPersist(storageKey: StorageKey, method: <K extends StorageKey>() => Promise<StorageKeyReturnType[K]>) {
    const key: any = `${this.symbol}-${this.activeCollateral.token.symbol}-${storageKey}`
    const storage = await this.storage.get(key)
    if (storage) {
      return storage
    }

    const result = await method()

    this.storage.set(key, result)

    return result! // TODO: handle undefined
  }

  public getDecimalsWorkaround(): number {
    /**
     * TODO: FIX
     *
     * This method was introduced because since the beginning (or the introduction of a second collateral), the decimal place is wrong in some places. There was no time to properly fix it, so this switch case was introduced to handle the different cases. This should be removed ASAP and all numbers should be normalised.
     */

    return this.activeCollateral.token.symbol === 'tez'
      ? this.token.decimals
      : this.activeCollateral.token.symbol === 'tzbtc'
      ? 10
      : this.activeCollateral.token.symbol === 'xtztzbtc'
      ? 6 + 12
      : 6
  }
}
