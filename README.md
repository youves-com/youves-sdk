## youves-sdk

This library provides methods to interact with the youves.com contracts.

### Installation

```bash
npm i youves-sdk
```

```bash
yarn add youves-sdk
```

### Usage

Most of the functionality is located in the `engine`:

```typescript
import { TezosToolkit } from '@taquito/taquito'
import { createEngine, mainnetContracts, mainnetTokens, mainnetNetworkConstants, Storage } from 'youves-sdk'

const toolkit = new TezosToolkit(RPC_URL)

export class MemoryStorage implements Storage {
  public storage: Map<string, any>

  constructor() {
    this.storage = new Map()
  }
  public async set<K extends StorageKey>(key: K, value: StorageKeyReturnType[K]): Promise<void> {
    this.storage.set(key, value)
  }
  public async get<K extends StorageKey>(key: K): Promise<StorageKeyReturnType[K]> {
    return this.storage.get(key)
  }
  public async delete<K extends StorageKey>(key: K): Promise<void> {
    this.storage.delete(key)
  }
  public async clear() {
    this.storage.clear()
  }
}

const youves = createEngine({
  tezos: toolkit,
  contracts: mainnetContracts[0], // uUSD
  storage: new MemoryStorage(),
  indexerEndpoint: INDEXER_URL,
  tokens: mainnetTokens,
  activeCollateral: mainnetContracts[0].collateralOptions[0], // tez
  networkConstants: mainnetNetworkConstants
})

const result = await youves.getRequiredCollateral()

console.log(result)
```
