import { ContractAbstraction, TezosToolkit, Wallet } from '@taquito/taquito'

import BigNumber from 'bignumber.js'
import { Contracts } from './networks'
import { Storage } from './storage/Storage'
import { StorageKey, StorageKeyReturnType } from './storage/types'

type VaultContext = {
  address: string
  balance: BigNumber
  is_being_liquidated: boolean
  minted: string
}

type Intent = {
  token_amount: string
  start_timestamp: string
}

export class Youves {
  public TARGET_ORACLE_ADDRESS: string
  public OBSERVED_ORACLE_ADDRESS: string
  public TOKEN_ADDRESS: string
  public ENGINE_ADDRESS: string
  public GOVERNANCE_TOKEN_ADDRESS: string
  public OPTIONS_LISTING_ADDRESS: string
  public REWARD_POOL_ADDRESS: string
  public SAVINGS_POOL_ADDRESS: string
  public VIEWER_CALLBACK_ADDRESS: string
  public SYNTHETIC_DEX: string
  public GOVERNANCE_DEX: string

  public WEEKLY_INTERENT_SPREAD = 191538231
  public TOKEN_DECIMALS = 12
  public TEZ_DECIMALS = 6
  public PRECISION_FACTOR = 10 ** this.TOKEN_DECIMALS
  public ONE_TOKEN = 10 ** this.TOKEN_DECIMALS
  public GOVERNANCE_TOKEN_ISSUANCE_RATE = 66137566137

  public tokenContractPromise: Promise<ContractAbstraction<Wallet>>
  public governanceTokenContractPromise: Promise<ContractAbstraction<Wallet>>
  public rewardsPoolContractPromise: Promise<ContractAbstraction<Wallet>>
  public savingsPoolContractPromise: Promise<ContractAbstraction<Wallet>>
  public optionsListingContractPromise: Promise<ContractAbstraction<Wallet>>
  public engineContractPromise: Promise<ContractAbstraction<Wallet>>
  public targetOracleContractPromise: Promise<ContractAbstraction<Wallet>>
  public observedOracleContractPromise: Promise<ContractAbstraction<Wallet>>

  constructor(private readonly tezos: TezosToolkit, contracts: Contracts, private readonly storage: Storage) {
    this.TARGET_ORACLE_ADDRESS = contracts.TARGET_ORACLE_ADDRESS
    this.OBSERVED_ORACLE_ADDRESS = contracts.OBSERVED_ORACLE_ADDRESS
    this.TOKEN_ADDRESS = contracts.TOKEN_ADDRESS
    this.ENGINE_ADDRESS = contracts.ENGINE_ADDRESS
    this.GOVERNANCE_TOKEN_ADDRESS = contracts.GOVERNANCE_TOKEN_ADDRESS
    this.OPTIONS_LISTING_ADDRESS = contracts.OPTIONS_LISTING_ADDRESS
    this.REWARD_POOL_ADDRESS = contracts.REWARD_POOL_ADDRESS
    this.SAVINGS_POOL_ADDRESS = contracts.SAVINGS_POOL_ADDRESS
    this.VIEWER_CALLBACK_ADDRESS = contracts.VIEWER_CALLBACK_ADDRESS
    this.SYNTHETIC_DEX = contracts.SYNTHETIC_DEX
    this.GOVERNANCE_DEX = contracts.GOVERNANCE_DEX

    this.tokenContractPromise = this.tezos.wallet.at(this.TOKEN_ADDRESS)
    this.governanceTokenContractPromise = this.tezos.wallet.at(this.GOVERNANCE_TOKEN_ADDRESS)
    this.rewardsPoolContractPromise = this.tezos.wallet.at(this.REWARD_POOL_ADDRESS)
    this.savingsPoolContractPromise = this.tezos.wallet.at(this.SAVINGS_POOL_ADDRESS)
    this.optionsListingContractPromise = this.tezos.wallet.at(this.OPTIONS_LISTING_ADDRESS)
    this.engineContractPromise = this.tezos.wallet.at(this.ENGINE_ADDRESS)
    this.targetOracleContractPromise = this.tezos.wallet.at(this.TARGET_ORACLE_ADDRESS)
    this.observedOracleContractPromise = this.tezos.wallet.at(this.OBSERVED_ORACLE_ADDRESS)
  }

  public async getBalance(address: string): Promise<BigNumber> {
    return this.tezos.tz.getBalance(address)
  }

  public async getDelegate(address: string): Promise<string | null> {
    return this.tezos.tz.getDelegate(address)
  }

  public async getAccountBalance(): Promise<BigNumber> {
    const source = await this.tezos.wallet.pkh()
    return this.getBalance(source)
  }

  public async getVaultBalance(): Promise<BigNumber> {
    const source = await this.tezos.wallet.pkh()
    const engineContract = await this.engineContractPromise
    const storage = (await engineContract.storage()) as any
    const vaultContext = await storage['vault_contexts'].get(source)
    return new BigNumber(vaultContext.balance)
  }

  public async transfer(address: string, amount: number): Promise<string> {
    return new Promise((resolve) => {
      this.tezos.contract
        .transfer({ to: address, amount: amount })
        .then((op) => {
          console.log(`Waiting for ${op.hash} to be confirmed...`)
          return op.confirmation(1).then(() => op.hash)
        })
        .then((hash) => resolve(hash))
    })
  }

  async sendAndAwait(walletOperation: any): Promise<string> {
    const batchOp = await walletOperation.send()
    await batchOp.confirmation()
    return batchOp.opHash
  }

  public async createVault(amountInMutez: number, mintAmountInuUSD: number, baker?: string): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withTransfer(
          engineContract.methods
            .create_vault(baker ? baker : null, this.VIEWER_CALLBACK_ADDRESS)
            .toTransferParams({ amount: amountInMutez, mutez: true })
        )
        .withContractCall(engineContract.methods.mint(mintAmountInuUSD))
    )
  }

  public async getOwnVaultAddress(): Promise<string> {
    return this.getFromStorageOrPersist(StorageKey.OWN_VAULT_ADDRESS, async () => {
      const source = await this.tezos.wallet.pkh()
      const engineContract = await this.engineContractPromise
      const storage = (await engineContract.storage()) as any
      const vaultContext = await storage['vault_contexts'].get(source)

      return vaultContext.address
    })
  }

  public async fundVault(amountInMutez: number): Promise<string> {
    return this.sendAndAwait(
      this.tezos.wallet.transfer({
        to: await this.getOwnVaultAddress(),
        amount: amountInMutez,
        mutez: true
      })
    )
  }

  public async setDeletage(delegate: string | null): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.set_vault_delegate(delegate))
  }

  public async mint(mintAmount: number): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.mint(mintAmount))
  }

  public async burn(burnAmount: number): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.burn(burnAmount))
  }

  public async withdrawCollateral(amountInMutez: number): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.withdraw(amountInMutez))
  }

  public async liquidate(tokenAmount: number, vaultOwner: string): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.liquidate(tokenAmount, vaultOwner))
  }

  public async transferToken(tokenAddress: string, recipient: string, tokenAmount: number, tokenId: number): Promise<string> {
    const source = await this.tezos.wallet.pkh()
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
    return this.transferToken(this.TOKEN_ADDRESS, recipient, tokenAmount, 0)
  }

  public async transferGovernanceToken(recipient: string, tokenAmount: number): Promise<string> {
    return this.transferToken(this.GOVERNANCE_TOKEN_ADDRESS, recipient, tokenAmount, 0)
  }

  public async addTokenOperator(tokenAddress: string, operator: string, tokenId: number): Promise<string> {
    const source = await this.tezos.wallet.pkh()
    const tokenContract = await this.tezos.wallet.at(tokenAddress)
    return this.sendAndAwait(
      tokenContract.methods.update_operators([
        {
          add_operator: {
            owner: source,
            operator: operator,
            token_id: tokenId
          }
        }
      ])
    )
  }

  public async addSynthenticTokenOperator(operator: string): Promise<string> {
    return this.addTokenOperator(this.TOKEN_ADDRESS, operator, 0)
  }

  public async addGovernanceTokenOperator(operator: string): Promise<string> {
    return this.addTokenOperator(this.GOVERNANCE_TOKEN_ADDRESS, operator, 0)
  }

  public async claimGovernanceToken(): Promise<string> {
    const governanceTokenContract = await this.governanceTokenContractPromise
    return this.sendAndAwait(governanceTokenContract.methods.claim(null))
  }

  public async depositToRewardsPool(tokenAmount: number): Promise<string> {
    const source = await this.tezos.wallet.pkh()
    const rewardsPoolContract = await this.rewardsPoolContractPromise

    let batchCall = this.tezos.wallet.batch()
    if (!(await this.isGovernanceTokenOperatorSet(this.REWARD_POOL_ADDRESS))) {
      const governanceTokenContract = await this.governanceTokenContractPromise
      batchCall = batchCall.withContractCall(
        governanceTokenContract.methods.update_operators([
          { add_operator: { owner: source, operator: this.REWARD_POOL_ADDRESS, token_id: 0 } }
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

  public async withdrawFromRewardsPool(): Promise<string> {
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    return this.sendAndAwait(rewardsPoolContract.methods.withdraw(null))
  }

  public async depositToSavingsPool(tokenAmount: number): Promise<string> {
    const source = await this.tezos.wallet.pkh()
    const savingsPoolContract = await this.savingsPoolContractPromise

    let batchCall = this.tezos.wallet.batch()
    if (!(await this.isSyntheticAssetOperatorSet(this.SAVINGS_POOL_ADDRESS))) {
      const tokenContract = await this.tokenContractPromise
      batchCall = batchCall.withContractCall(
        tokenContract.methods.update_operators([{ add_operator: { owner: source, operator: this.SAVINGS_POOL_ADDRESS, token_id: 0 } }])
      )
    }
    batchCall = batchCall.withContractCall(savingsPoolContract.methods.deposit(tokenAmount))

    return this.sendAndAwait(batchCall)
  }

  public async withdrawFromSavingsPool(): Promise<string> {
    const savingsPoolContract = await this.savingsPoolContractPromise
    return this.sendAndAwait(savingsPoolContract.methods.withdraw(null))
  }

  public async advertiseIntent(tokenAmount: number): Promise<string> {
    const source = await this.tezos.wallet.pkh()
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
              token_id: 0
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

  public async fulfillIntent(intentOwner: string, tokenAmount: number): Promise<string> {
    const optionsListingContract = await this.optionsListingContractPromise
    const marketPriceAmount = (await this.getTargetPrice()).multipliedBy(tokenAmount)
    const payoutAmount = marketPriceAmount.minus(marketPriceAmount.dividedBy(2 ** 4)).dividedBy(this.PRECISION_FACTOR) // taking away the 6% fee

    return this.sendAndAwait(
      this.tezos.wallet.batch().withTransfer(
        optionsListingContract.methods.fulfill_intent(intentOwner, tokenAmount).toTransferParams({
          amount: Math.floor(payoutAmount.toNumber()),
          mutez: true
        })
      )
    )
  }

  public async executeIntent(vaultOwner: string, tokenAmount: number): Promise<string> {
    const optionsListingContract = await this.optionsListingContractPromise
    return this.sendAndAwait(optionsListingContract.methods.execute_intent(tokenAmount, vaultOwner))
  }

  public async bailout(tokenAmount: number): Promise<string> {
    const engineContract = await this.engineContractPromise
    return this.sendAndAwait(engineContract.methods.bailout(tokenAmount))
  }

  //Quipo Actions start here
  public async tezToTokenSwap(dexAddress: string, amountInMutez: number, minimumReceived: number): Promise<string> {
    const source = await this.tezos.wallet.pkh()
    const dexContract = await this.tezos.wallet.at(dexAddress)
    return this.sendAndAwait(
      this.tezos.wallet
        .batch()
        .withTransfer(
          dexContract.methods.tezToTokenPayment(minimumReceived, source).toTransferParams({ amount: amountInMutez, mutez: true })
        )
    )
  }

  public async tokenToTezSwap(dexAddress: string, tokenAmount: number, minimumReceived: number): Promise<string> {
    const source = await this.tezos.wallet.pkh()
    const dexContract = await this.tezos.wallet.at(dexAddress)
    const dexStorage = (await dexContract.storage()) as any
    const tokenContract = await this.tezos.wallet.at(dexStorage['storage']['token_address'])
    const tokenStorage = (await tokenContract.storage()) as any
    const isOperatorSet = await tokenStorage['operators'].get({
      owner: source,
      operator: dexAddress,
      token_id: dexStorage['storage']['token_id']
    })

    if (isOperatorSet === undefined) {
      await this.addTokenOperator(dexStorage['storage']['token_address'], dexAddress, dexStorage['storage']['token_id'])
    }

    return this.sendAndAwait(dexContract.methods.tokenToTezPayment(tokenAmount, minimumReceived, source))
  }

  public async syntheticAssetToTezSwap(tokenAmount: number, minimumReceived: number): Promise<string> {
    return this.tokenToTezSwap(this.SYNTHETIC_DEX, tokenAmount, minimumReceived)
  }

  public async governanceTokenToTezSwap(tokenAmount: number, minimumReceived: number): Promise<string> {
    return this.tokenToTezSwap(this.GOVERNANCE_DEX, tokenAmount, minimumReceived)
  }

  public async tezToGovernanceSwap(amountInMutez: number, minimumReceived: number): Promise<string> {
    return this.tezToTokenSwap(this.GOVERNANCE_DEX, amountInMutez, minimumReceived)
  }

  public async tezToSyntheticSwap(amountInMutez: number, minimumReceived: number): Promise<string> {
    return this.tezToTokenSwap(this.SYNTHETIC_DEX, amountInMutez, minimumReceived)
  }

  // Values and Numbers start here
  public async getTotalSyntheticAssetSupply(): Promise<BigNumber> {
    const engineContract = await this.engineContractPromise
    const storage = (await engineContract.storage()) as any
    return new BigNumber(storage['total_supply'])
  }

  public async getExchangeRate(dexAddress: string): Promise<BigNumber> {
    const dexContract = await this.tezos.wallet.at(dexAddress)
    const storage = (await dexContract.storage()) as any
    return new BigNumber(storage['storage']['token_pool'])
      .dividedBy(10 ** this.TOKEN_DECIMALS)
      .dividedBy(new BigNumber(storage['storage']['tez_pool']).dividedBy(10 ** this.TEZ_DECIMALS))
  }

  public async getSyntheticAssetExchangeRate(): Promise<BigNumber> {
    return this.getExchangeRate(this.SYNTHETIC_DEX)
  }

  public async getGovernanceTokenExchangeRate(): Promise<BigNumber> {
    return this.getExchangeRate(this.GOVERNANCE_DEX)
  }

  public async getTargetExchangeRate(): Promise<BigNumber> {
    return (await this.getObservedPrice()).dividedBy(await this.getTargetPrice())
  }

  public async getObservedPrice(): Promise<BigNumber> {
    const observedOracleContract = await this.observedOracleContractPromise
    const observedPrice = (await observedOracleContract.storage()) as any
    return new BigNumber(observedPrice)
  }

  public async getTargetPrice(): Promise<BigNumber> {
    const targetOracleContract = await this.targetOracleContractPromise
    const targetPrice = (await targetOracleContract.storage()) as any
    return new BigNumber(targetPrice)
  }

  public async getMaxMintableAmount(account: string): Promise<BigNumber> {
    const targetOracleContract = await this.targetOracleContractPromise
    const targetPrice = (await targetOracleContract.storage()) as any
    const balance = await this.getBalance(account)
    return new BigNumber(balance).dividedBy(3).dividedBy(new BigNumber(targetPrice)).multipliedBy(this.ONE_TOKEN)
  }

  public async getAccountMaxMintableAmount(): Promise<BigNumber> {
    const source = await this.tezos.wallet.pkh()
    return this.getMaxMintableAmount(source)
  }

  public async getVaultMaxMintableAmount(): Promise<BigNumber> {
    const source = await this.tezos.wallet.pkh()
    const engineContract = await this.engineContractPromise
    const storage = (await engineContract.storage()) as any
    const vaultContext = await storage['vault_contexts'].get(source)
    return this.getMaxMintableAmount(vaultContext.address)
  }

  public async getVaultCollateralisation(): Promise<BigNumber> {
    return (await this.getVaultMaxMintableAmount()).dividedBy(await this.getMintedSyntheticAsset())
  }

  public async getCollateralisationUsage(): Promise<BigNumber> {
    return new BigNumber(1).dividedBy(await this.getVaultCollateralisation())
  }

  public async getExpectedWeeklyGovernanceRewards(mintedAmount: number): Promise<BigNumber> {
    const targetOracleContract = await this.targetOracleContractPromise
    const targetPrice = (await targetOracleContract.storage()) as any

    const governanceTokenContract = await this.governanceTokenContractPromise
    const governanceTokenStorage = (await governanceTokenContract.storage()) as any
    const totalStake = new BigNumber(governanceTokenStorage.total_stake)
    const weight = new BigNumber(targetPrice).multipliedBy(mintedAmount).dividedBy(totalStake.plus(mintedAmount))

    return (await this.getWeeklyGovernanceTokenIssuance()).multipliedBy(weight)
  }

  public async getWeeklyGovernanceTokenIssuance(): Promise<BigNumber> {
    return new BigNumber(40000 * 10 ** this.TOKEN_DECIMALS)
  }

  public async getGovernanceTokenTotalSupply(): Promise<BigNumber> {
    const governanceTokenContract = await this.governanceTokenContractPromise
    const governanceTokenStorage = (await governanceTokenContract.storage()) as any
    const timedelta = (new Date().getTime() - Date.parse(governanceTokenStorage['epoch_start_timestamp'])) / 1000
    return new BigNumber(timedelta * this.GOVERNANCE_TOKEN_ISSUANCE_RATE)
  }

  public async getYearlyLiabilityInterestRate(): Promise<BigNumber> {
    const engineContract = await this.engineContractPromise
    const engineStorage = (await engineContract.storage()) as any
    return new BigNumber(engineStorage.reference_interest_rate)
      .plus(this.WEEKLY_INTERENT_SPREAD)
      .plus(this.ONE_TOKEN)
      .dividedBy(this.ONE_TOKEN)
      .exponentiatedBy(52)
  }

  public async getYearlyAssetInterestRate(): Promise<BigNumber> {
    const engineContract = await this.engineContractPromise
    const engineStorage = (await engineContract.storage()) as any
    return new BigNumber(engineStorage.reference_interest_rate).plus(this.ONE_TOKEN).dividedBy(this.ONE_TOKEN).exponentiatedBy(52)
  }

  public async getYearlySpreadInterestRate(): Promise<BigNumber> {
    return new BigNumber(this.WEEKLY_INTERENT_SPREAD).plus(this.ONE_TOKEN).dividedBy(this.ONE_TOKEN).exponentiatedBy(52)
  }

  public async getClaimableGovernanceToken(): Promise<BigNumber> {
    const source = await this.tezos.wallet.pkh()
    const governanceTokenContract = await this.governanceTokenContractPromise
    const governanceTokenStorage = (await governanceTokenContract.storage()) as any

    let currentDistFactor = new BigNumber(governanceTokenStorage['current_dist_factor'])
    const ownStake = new BigNumber(await governanceTokenStorage['stakes'].get(source))
    const ownDistFactor = new BigNumber(await governanceTokenStorage['dist_factors'].get(source))
    const timedelta = (new Date().getTime() - Date.parse(governanceTokenStorage['last_update_timestamp'])) / 1000
    const totalStake = new BigNumber(governanceTokenStorage['total_stake'])
    currentDistFactor = currentDistFactor.plus(
      new BigNumber(timedelta * this.GOVERNANCE_TOKEN_ISSUANCE_RATE * this.PRECISION_FACTOR).dividedBy(totalStake)
    )
    return ownStake.multipliedBy(currentDistFactor.minus(ownDistFactor)).dividedBy(this.PRECISION_FACTOR)
  }

  public async getClaimableRewards(): Promise<BigNumber> {
    const source = await this.tezos.wallet.pkh()
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    const rewardsPoolStorage = (await rewardsPoolContract.storage()) as any

    let currentDistFactor = new BigNumber(rewardsPoolStorage['current_dist_factor'])
    const ownStake = new BigNumber(await rewardsPoolStorage['stakes'].get(source))
    const ownDistFactor = new BigNumber(await rewardsPoolStorage['dist_factors'].get(source))

    return ownStake.multipliedBy(currentDistFactor.minus(ownDistFactor)).dividedBy(this.PRECISION_FACTOR)
  }

  public async getRequiredCollateral(): Promise<BigNumber> {
    const targetOracleContract = await this.targetOracleContractPromise
    const targetPrice = (await targetOracleContract.storage()) as any
    return (await this.getMintedSyntheticAsset()).multipliedBy(new BigNumber(targetPrice)).multipliedBy(3).dividedBy(this.PRECISION_FACTOR)
  }

  public async getVaultContext(): Promise<VaultContext> {
    const source = await this.tezos.wallet.pkh()
    const engineContract = await this.engineContractPromise
    const storage = (await engineContract.storage()) as any
    const vaultContext = await storage['vault_contexts'].get(source)
    return vaultContext
  }

  public async getMintedSyntheticAsset(): Promise<BigNumber> {
    const engineContract = await this.engineContractPromise
    const storage = (await engineContract.storage()) as any
    return new BigNumber((await this.getVaultContext()).minted)
      .multipliedBy(new BigNumber(storage['compound_interest_rate']))
      .dividedBy(this.PRECISION_FACTOR)
  }

  public async getWithdrawableCollateral(): Promise<BigNumber> {
    return (await this.getVaultBalance()).minus(await this.getRequiredCollateral())
  }

  public async getMintableAmount(): Promise<BigNumber> {
    return (await this.getVaultMaxMintableAmount()).minus(await this.getMintedSyntheticAsset())
  }

  public async getVaultDelegate(): Promise<string | null> {
    return this.getDelegate((await this.getVaultContext()).address)
  }

  public async isOperatorSet(tokenContractAddress: string, operator: string, tokenId: number): Promise<boolean> {
    const source = await this.tezos.wallet.pkh()
    const tokenContract = await this.tezos.wallet.at(tokenContractAddress)
    const tokenStorage = (await tokenContract.storage()) as any
    const isOperatorSet = await tokenStorage['operators'].get({
      owner: source,
      operator: operator,
      token_id: tokenId
    })
    return isOperatorSet !== undefined
  }

  public async isSyntheticAssetOperatorSet(operator: string): Promise<boolean> {
    return this.isOperatorSet(this.TOKEN_ADDRESS, operator, 0)
  }

  public async isGovernanceTokenOperatorSet(operator: string): Promise<boolean> {
    return this.isOperatorSet(this.GOVERNANCE_TOKEN_ADDRESS, operator, 0)
  }

  public async getTokenAmount(tokenContractAddress: string, owner: string, tokenId: number): Promise<BigNumber> {
    const tokenContract = await this.tezos.wallet.at(tokenContractAddress)
    const tokenStorage = (await tokenContract.storage()) as any
    const tokenAmount = await tokenStorage['ledger'].get({
      owner: owner,
      token_id: tokenId
    })
    return new BigNumber(tokenAmount ? tokenAmount : 0)
  }

  public async getOwnSyntheticAssetTokenAmount(): Promise<BigNumber> {
    const source = await this.tezos.wallet.pkh()
    return this.getTokenAmount(this.TOKEN_ADDRESS, source, 0)
  }

  public async getOwnGovernanceTokenAmount(): Promise<BigNumber> {
    const source = await this.tezos.wallet.pkh()
    return this.getTokenAmount(this.GOVERNANCE_TOKEN_ADDRESS, source, 0)
  }

  public async getSavingsPoolYearlyInterestRate(): Promise<BigNumber> {
    const syntheticAssetTotalSupply = await this.getTotalSyntheticAssetSupply()
    return syntheticAssetTotalSupply
      .multipliedBy(await this.getYearlyAssetInterestRate())
      .dividedBy(await this.getTokenAmount(this.TOKEN_ADDRESS, this.SAVINGS_POOL_ADDRESS, 0))
  }

  public async getExpectedYearlySavingsPoolReturn(tokenAmount: number): Promise<BigNumber> {
    return (await this.getSavingsPoolYearlyInterestRate()).minus(1).multipliedBy(tokenAmount)
  }

  public async getExpectedYearlyRewardPoolReturn(tokenAmount: number): Promise<BigNumber> {
    const syntheticAssetTotalSupply = await this.getTotalSyntheticAssetSupply()
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    const rewardsPoolStorage = (await rewardsPoolContract.storage()) as any
    return syntheticAssetTotalSupply
      .multipliedBy(await this.getYearlySpreadInterestRate())
      .multipliedBy(tokenAmount)
      .dividedBy(new BigNumber(rewardsPoolStorage['total_stake']))
  }

  public async getOwnRewardPoolStake(): Promise<BigNumber> {
    const source = await this.tezos.wallet.pkh()
    const rewardsPoolContract = await this.rewardsPoolContractPromise
    const rewardsPoolStorage = (await rewardsPoolContract.storage()) as any
    return new BigNumber(await rewardsPoolStorage['stakes'].get(source))
  }

  public async getOwnSavingsPoolStake(): Promise<BigNumber> {
    const source = await this.tezos.wallet.pkh()
    const savingsPoolContract = await this.savingsPoolContractPromise
    const savingsPoolStorage = (await savingsPoolContract.storage()) as any
    return new BigNumber(await savingsPoolStorage['disc_stakes'].get(source))
      .multipliedBy(new BigNumber(savingsPoolStorage['disc_factor']))
      .dividedBy(this.PRECISION_FACTOR)
  }

  public async getSavingsAvailableTokens(): Promise<BigNumber> {
    const savingsPoolContract = await this.savingsPoolContractPromise
    const savingsPoolStorage = (await savingsPoolContract.storage()) as any
    return new BigNumber(savingsPoolStorage['total_disc_stake'])
      .multipliedBy(new BigNumber(savingsPoolStorage['disc_factor']))
      .dividedBy(this.PRECISION_FACTOR)
  }

  public async getIntent(intentOwner: string): Promise<Intent> {
    const optionsListingContract = await this.optionsListingContractPromise
    const optionsListingStroage = (await optionsListingContract.storage()) as any
    return optionsListingStroage['intents'].get(intentOwner)
  }

  public async getOwnIntent(): Promise<Intent> {
    const source = await this.tezos.wallet.pkh()
    return this.getIntent(source)
  }

  public async getOwnIntentTokenAmount(): Promise<BigNumber> {
    return new BigNumber((await this.getOwnIntent()).token_amount)
  }

  public async getOwnIntentAdvertisementStart(): Promise<Date> {
    return new Date(Date.parse((await this.getOwnIntent()).start_timestamp))
  }

  private async getFromStorageOrPersist(storageKey: StorageKey, method: <K extends StorageKey>() => Promise<StorageKeyReturnType[K]>) {
    const storage = await this.storage.get(storageKey)
    if (storage) {
      return storage
    }

    const result = await method()

    this.storage.set(storageKey, result)

    return result! // TODO: handle undefined
  }
}
