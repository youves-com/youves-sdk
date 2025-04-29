# Youves Indexer API Documentation

This document provides an overview of the Youves Indexer API methods available in the YouvesIndexer class.

## Overview

The YouvesIndexer class provides a set of methods to query blockchain data related to Youves operations, including vaults, transfers, activities, and governance. The indexer interacts with a GraphQL API endpoint to retrieve on-chain data in a structured format.

## Connection Status

### `getSyncStatus()`

Checks if the indexer is properly synced with the blockchain.

- **Returns**: `Promise<boolean>` - Indicates if the indexer is in sync

## Transfer Aggregate

### `getTransferAggregateOverTime(farmAddress, token, from, to, sender?, senderFilterType?)`

Gets all transfers of a specific token to a target address within a time window.

- **Use case**: Primarily used for APR calculations
- **Parameters**:
  - `farmAddress` (string): Address receiving the transfers
  - `token` (Token): Token being transferred
  - `from` (Date): Start of time window
  - `to` (Date): End of time window
  - `sender` (string, optional): Address of sender to filter by
  - `senderFilterType` ('\_eq' | '\_neq', default: '\_eq'): Equality operator for sender filter
- **Returns**: `Promise<BigNumber>` - The total amount transferred

## Engine & Vault Methods

### `getIntentsForEngine(engineAddress, dateThreshold?, tokenAmountThreshold?)`

Gets conversion offers (intents) for a specific engine.

- **Parameters**:
  - `engineAddress` (string): Address of the engine
  - `dateThreshold` (Date, optional): Minimum date threshold
  - `tokenAmountThreshold` (BigNumber, optional): Minimum token amount threshold
- **Returns**: `Promise<Intent[]>` - Array of Intent objects where each Intent contains:
  ```typescript
  {
    owner: string // Address of the intent owner
    token_amount: string // Amount of tokens in the intent
    start_timestamp: string // Timestamp when the intent was created
  }
  ```

### `getExecutableVaultsForEngine(engineAddress, property, orderDirection, offset, limit)`

Gets all vaults for a specific engine with sorting options.

- **Parameters**:
  - `engineAddress` (string): Address of the engine
  - `property` ('minted' | 'ratio' | 'balance'): Property to sort by
  - `orderDirection` ('asc' | 'desc'): Sort direction
  - `offset` (number): Number of results to skip
  - `limit` (number): Maximum number of results to return
- **Returns**: `Promise<Vault[]>` - Array of Vault objects where each Vault contains:
  ```typescript
  {
    owner: string // Address of the vault owner
    address: string // Address of the vault contract
    ratio: number // Collateralization ratio
    balance: number // Collateral balance
    minted: number // Amount of synthetic assets minted
  }
  ```

### `getVaultCountForEngine(engineAddress)`

Gets the total number of vaults for an engine.

- **Parameters**:
  - `engineAddress` (string): Address of the engine
- **Returns**: `Promise<BigNumber>` - The count of vaults

### `getTotalMintedForEngine(engineAddress)`

Gets the sum of all minted tokens across all vaults for an engine.

- **Parameters**:
  - `engineAddress` (string): Address of the engine
- **Returns**: `Promise<BigNumber>` - The total minted amount

### `getTotalBalanceInVaultsForEngine(engineAddress)`

Sums the balance in all vaults for an engine.

- **Parameters**:
  - `engineAddress` (string): Address of the engine
- **Returns**: `Promise<BigNumber>` - The total balance


### `getActivityForEngine(engineAddress, vaultAddress, orderKey?, orderDirection?)`

Gets all actions (activities) for a specific vault.

- **Parameters**:
  - `engineAddress` (string): Address of the engine
  - `vaultAddress` (string): Address of the vault
  - `orderKey` (string, default: 'created'): Field to order results by
  - `orderDirection` ('asc' | 'desc', default: 'desc'): Sort direction
- **Returns**: `Promise<Activity[]>` - Array of Activity objects where each Activity contains:
  ```typescript
  {
    created: string // Timestamp when the activity was created
    event: VaultActivityType // Type of activity (CREATE_VAULT, MINT, etc.)
    operation_hash: string // Hash of the operation
    collateral_token_amount: number // Amount of collateral tokens involved
    token_amount: number // Amount of synthetic tokens involved
    vault: {
      address: string
    } // Address of the vault
  }
  ```

### `getBurntInTimeRangeForEngine(engineAddress, from, to)`

Aggregates all burn activities within a time range for an engine.

**Note: this is currently unused in the frontend**

- **Parameters**:
  - `engineAddress` (string): Address of the engine
  - `from` (Date): Start date of time window
  - `to` (Date): End date of time window
- **Returns**: `Promise<BigNumber>` - The total amount burned

### `getMintedInTimeRangeForEngine(engineAddress, from, to)`

Aggregates all mint activities within a time range for an engine.

**Note: this is currently unused in the frontend**

- **Parameters**:
  - `engineAddress` (string): Address of the engine
  - `from` (Date): Start date of time window
  - `to` (Date): End date of time window
- **Returns**: `Promise<BigNumber>` - The total amount minted

## Governance Methods

### `getVotedStakes(voterAddress, currentPollId)`

Gets stakes that have been voted with for a specific voter and poll.

- **Parameters**:
  - `voterAddress` (string): Address of the voter
  - `currentPollId` (number): ID of the current poll
- **Returns**: `Promise<any[]>` - Array of vote objects with stake information

### `getClaimableStakes(voterAddress, lastPollIdInUse)`

Gets stakes that can be claimed by a voter from previous polls.

- **Parameters**:
  - `voterAddress` (string): Address of the voter
  - `lastPollIdInUse` (number): ID of the last poll in use
- **Returns**: `Promise<any[]>` - Array of claimable stake objects

### `getStakeIdsByOwner(ownerAddress)`

Gets all stake IDs owned by a specific address.

- **Parameters**:
  - `ownerAddress` (string): Address of the owner
- **Returns**: `Promise<{id: string}[]>` - Array of objects containing stake IDs