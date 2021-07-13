import { MichelsonMap } from '@taquito/michelson-encoder'

export type LedgerKey = {
  owner: string
  token_id: number
}

export type VaultContext = {
  address: string
  balance: string
  is_being_liquidated: boolean
  minted: string
}

export type Intent = {
  owner: string
  token_amount: string
  start_timestamp: string
}

export type Activity = {
  created: string
  event: string
  operation_hash: string
  tez_amount: number
  token_amount: number
  vault: { address: string }
}

export type EngineStorage = {
  accrual_update_timestamp: string
  //administrators: MichelsonMap
  compound_interest_rate: string
  governance_token_contract: string
  last_update_timestamp: string
  observed_price: string
  observed_price_oracle: string
  options_contract: string
  reference_interest_rate: string
  reward_pool_contract: string
  savings_pool_contract: string
  sender: string
  target_price: string
  target_price_oracle: string
  token_contract: string
  token_id: string
  total_supply: string
  vault_contexts: MichelsonMap<string, VaultContext>
  //vault_lookup: MichelsonMap
}

export type GovernanceTokenStorage = {
  admin_contract: string
  dist_factor: string
  dist_factors: MichelsonMap<string, string>
  epoch_start_timestamp: string
  last_update_timestamp: string
  ledger: MichelsonMap<LedgerKey, string>
  //operators: MichelsonMap
  stakes: MichelsonMap<string, string>
  //token_metadata: MichelsonMap
  total_stake: string
  total_supply: MichelsonMap<string, string>
}

export type SyntheticAssetTokenStorage = {
  //administrator_allowmap: MichelsonMap
  //administrators: MichelsonMap
  ledger: MichelsonMap<LedgerKey, string>
  //operators: MichelsonMap
  //token_metadata: MichelsonMap
  total_supply: MichelsonMap<string, string>
}

export type OptionsListingStroage = {
  engine_address: string
  intents: MichelsonMap<string, Intent>
  sender: string
  target_price: string
  target_price_oracle: string
  token_address: string
  token_id: string
}

export type RewardsPoolStorage = {
  dist_factor: string
  current_reward_balance: string
  dist_factors: MichelsonMap<string, string>
  engine_address: string
  last_reward_balance: string
  reward_token_address: string
  reward_token_id: string
  sender: string
  stake_token_address: string
  stake_token_id: string
  stakes: MichelsonMap<string, string>
  total_stake: string
}

export type SavingsPoolStorage = {
  current_balance: string
  disc_factor: string
  disc_stakes: MichelsonMap<string, string>
  dist_factor: string
  dist_factors: MichelsonMap<string, string>
  engine_address: string
  last_balance: string
  sender: string
  token_address: string
  token_id: string
  total_stake: string
}
