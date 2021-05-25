export const storagePrefix = 'youves'

export enum StorageKey {
  OWN_VAULT_ADDRESS = 'own-vault-address'
}

export type StorageKeyReturnDefaults = { [key in StorageKey]: StorageKeyReturnType[key] }

export const defaultStorageValues: StorageKeyReturnDefaults = {
  [StorageKey.OWN_VAULT_ADDRESS]: undefined
}

export interface StorageKeyReturnType {
  [StorageKey.OWN_VAULT_ADDRESS]: string | undefined
}
