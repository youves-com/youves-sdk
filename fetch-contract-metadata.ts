const fs = require('fs')
const { TezosToolkit } = require('@taquito/taquito')
const Tezos = new TezosToolkit('https://mainnet.smartpy.io')

const CONTRACTS_FILE = './src/contracts/contracts.ts'
const exportPrefix = 'export const contractInfo = '

const getDataForContracts = async (
  old: Record<string, { script: Object; entrypoints: Object }>,
  contracts: string[]
): Promise<Record<string, { script: Object; entrypoints: Object }>> => {
  // TODO: Filter out contracts from obj that are no longer needed.

  const obj: Record<string, { script: Object; entrypoints: Object }> = {}

  for (let contract of contracts) {
    if (old[contract]) {
      obj[contract] = old[contract]
      continue
    }
    try {
      console.log('loading', contract)
      const script: { code: any[]; storage: any[] } = await Tezos.rpc.getScript(contract)
      const entrypoints = await Tezos.rpc.getEntrypoints(contract)

      obj[contract] = {
        script,
        entrypoints
      }
    } catch (e) {
      console.log(e)
      throw new Error('ERROR')
    }
  }

  return obj
}

const object: Record<string, { script: string; entrypoints: string }> = (() => {
  try {
    return JSON.parse(fs.readFileSync(CONTRACTS_FILE, 'utf-8').substr(exportPrefix.length))
  } catch (e) {
    console.log('err', e)
    return {}
  }
})()

const indexPage: string[] = [
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT1UDZNYC4twtgeN2WatoEjzjjANnRgsK3hD',
  'KT1Lz5S39TMHEA7izhQn8Z1mQoddm6v1jTwH',
  'KT1M8asPmVQhFG6yujzttGonznkghocEkbFk',
  'KT1TMfRfmJ5mkJEXZGRCsqLHn2rgnV1SdUzb',
  'KT1A1VNTvyqJYZN2FypF2kiTBPdoRvG9sCA7',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1FFE2LC5JpVakVjHm5mM36QVp2p3ZzH4hH',
  'KT1EtjRRCBC2exyCRXz8UfV7jz7svnkqi7di',
  'KT1TnrLFrdemNZ1AnnWNfi21rXg7eknS484C',
  'KT1ESueqJziqKEgoePd1FMemk5XDiKhjczd6',
  'KT1FzcHaNhmpdYPNTgfb8frYXx7B5pvVyowu',
  'KT1TFPn4ZTzmXDzikScBrWnHkoqTA7MBt9Gi',
  'KT1Kvg5eJVuYfTC1bU1bwWyn4e1PRGKAf6sy',
  'KT1BLLj2GZN6VuiM1Vg8LNsPWzoZTUa3mYqq',
  'KT1Wqc19pqbYfzM3pVMZ35YdSxUvECwFfpVo',
  'KT1B2GSe47rcMCZTRk294havTpyJ36JbgdeB',
  'KT1EAw8hL5zseB3SLpJhBqPQfP9aWrWh8iMW',
  'KT1H8sJY2VzrbiX4pYeUVsoMUd4iGw2DV7XH',
  'KT19bkpis4NSDnt6efuh65vYxMaMHBoKoLEw',
  'KT1KNbtEBKumoZoyp5uq6A4v3ETN7boJ9ArF',
  'KT1Pcv7VbgSFFRU9ykc1dwGHM3VjfWmfZqfB',
  'KT1M9rKvjNGdyHnrbxjrLhW9HCsAwtfY13Fn',
  'KT1VjQoL5QvyZtm9m1voQKNTNcQLi5QiGsRZ',
  'KT1WBLrLE2vG8SedBqiSJFm4VVAZZBytJYHc',
  'KT18ePgHFBVBSLJD7uJoX2w5aZY3SvtV9xGP',
  'KT1NFWUqr9xNvVsz2LXCPef1eRcexJz5Q2MH',
  'KT1JeWiS8j1kic4PHx7aTnEr9p4xVtJNzk5b',
  'KT1T974a8qau4xP3RAAWPYCZM9xtwU9FLjPS',
  'KT1XvH5f2ja2jzdDbv6rxPmecZFU7s3obquN',
  'KT1AVbWyM8E7DptyBCu4B5J5B7Nswkq7Skc6',
  'KT1Xbx9pykNd38zag4yZvnmdSNBknmCETvQV',
  'KT1HxgqnVjGy7KsSUTEsQ6LgpD5iKSGu7QpA',
  'KT1Txa8RdTnNjX7E3RqVzUNA5ZyHVgHB96ta',
  'KT1LQcsXGpmLXnwrfftuQdCLNvLRLUAuNPCV',
  'KT1BjNkpfeb5gWQqMTB8Px1z3EXE4F3Tpkat',
  'KT1E45AvpSr7Basw2bee3g8ri2LK2C2SV2XG',
  'KT1UyfqcrxAmBqTbaVGbVUDSy6yLUxCUYmEw',
  'KT1UZcNDxTdkn33Xx5HRkqQoZedc3mEs11yV', // Unified Staking

  'KT18bG4ctcB6rh7gPEPjNsWF8XkQXL2Y1pJe', // Unified Savings

  'KT1CP1C8afHqdNfBsSE3ggQhzM2iMHd4cRyt',
  'KT1TCLpFRB6xiRmeupUCz9yFf7JiEvbLe1aS',
  'KT1J217QyWoPSE8EtAySMyJjr8ptTsakBszP',
  'KT1CeZvxMXqEjf2tQ7a5Ex7S9wVRLJWYaSUu',
  'KT1KpFkAKgrAJNXZxhahFaTduTAoEc8jFpmQ',
  'KT1DHndgk8ah1MLfciDnCV2zPJrVbnnAH9fd',
  'KT1H4h1VunWkVE9Cuq1QDVy9xRNLBSbqXsr9',
  'KT1DP7rtzCGotqwgmZP8vViTVGz22mBwGGTT',
  'KT1F6Amndd62P8yySM5NkyF4b1Kz27Ft4QeT',
  'KT1G6RzVX25YnoU55Xb7Vve3zvuZKmouf24a',
  'KT1QDWxfzptWPooyqmf1pjsjGkGcfu8dM32z',
  'KT1F1JMgh6SfqBCK6T6o7ggRTdeTLw91KKks',
  'KT1V9Rsc4ES3eeQTr4gEfJmNhVbeHrAZmMgC',
  'KT1CpXvNd293VvHkY7M9krjBvwEFuvura65Q',
  'KT1M9T11hrSuDXWDqjTUC2iNPCyypA3BsMrm',
  'KT1USKq4gHFVs7WJSVsqKn8j8P4tmqZcgSbd',
  'KT1X7NYegSr27zrCfHEWHBfzv2QJXtiyD2a2',

  'KT1XnTn74bUtxHfDtBmm2bGZAQfhPbvKWR8o',
  'KT1XM1vtYnMkDFxUqy4uHCbXMw9h2qJZojWq',
  'KT1V4UcdgjuirVxeZcTrFXvDRCyhMqnqBeLX',
  'KT1UJBvm4hv11Uvu6r4c8zE5K2EfmwiRVgsm',
  'KT1JmfujyCYTw5krfu9bSn7YbLYuz2VbNaje',

  'KT1LwikDGBoBmrwCZbk2LrfV7ZBj26hNLGy6',
  'KT1R6XgLEtpWt4bUqG5aJzd8Pe2o1a4kHfKz',
  'KT1HYJRBNCekoangcEPppaRMUFhbb4WNvEt3',
  'KT1AY8xaXU3M3XnaUxa6teLENU5Ku6z3YDbW',
  'KT1MPUDs1CSo5QzxtittccisyR32S4EZ7NiV',
  'KT1WZY3DEBy6yTeXBe5BmMxMSV7RhDKDeS81',
  'KT1CHzk4vojAF1gakAjB1mXa2nVrtyoe57v6',
  'KT1LD2mastMrAJVUubKdtMXoi9UdfSFJ9axd',
  'KT1CkpDuwCFrnoqTam6upYiPBiFNsSEVbBei',
  'KT1NgbaaYhtXh3MwJoYYxrrKUwG3RX5LYVL6'
]

const earnPage = [
  'KT1TkNadQ9Cw5ZNRyS4t9SKmUbmAMkqY8bkV',
  'KT1KGfEyxBeCU873RfuwrU1gy8sjC1s82WZV',
  'KT1HaWDWv7XPsZ54JbDquXV6YgyazQr9Jkp3',
  'KT1JFsKh3Wcnd4tKzF6EwugwTVGj3XfGPfeZ',
  'KT1Ug9wWbRuUs1XXRuK11o6syWdTFZQsmvw3',
  'KT1Goz5Dsi8Hf7fqjx5nSEcjp6osD9ufECB2',
  'KT1W78rDHfwp3CKev7u7dWRJTBqLdwYVcPg9',
  'KT1RLGwCgeq2ab92yznQnJinpqy9kG13dFh2',
  'KT18x3gGRMKyhzcBnKYSRrfqjnzu4fPE1Lzy',
  'KT1CuqpjqPPvcZCrvzJunCvHvPaujASdmFJZ',
  'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn',

  'KT1NZt7NTYs7m3VhB8rrua7WwVQ9uhKgpgCN',
  'KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV',
  'KT1Toztq42271zT2wXDnu2hFVVdJJ8qWrETu',
  'KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9'
]

const swapPage = ['KT1Exm6UTCNEbBHANZ7S53t7QN8NJFwAytxg', 'KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ']

// Add contract addresses here

// De-duplicate all entries
const allContracts: Set<string> = new Set()

indexPage.forEach((contract) => allContracts.add(contract))
earnPage.forEach((contract) => allContracts.add(contract))
swapPage.forEach((contract) => allContracts.add(contract))

const ghostnetContracts = [
  'KT1JsCFDiQpFPRwgRkKRPfyxyEE4M7b1tTyq',
  'KT1VsjbfCo3PUm4ePzG59Zy7Rxwk6wecCMQy',
  'KT1CrNkK2jpdMycfBdPpvTLSLCokRBhZtMq7',
  'KT1XXUzvauzUBz3c7YuKSF5x5aBjRyVa4tXi',
  'KT19uLXFNyvGuiKUwkoh4a5Rz3xP5dDYQf5i',
  'KT1J4CiyWPmtFPXAjpgBezM5hoVHXHNzWBHK',
  'KT1T7Rx3uzj5wwvFVrCnHxo64RvFtS8awJK7',
  'KT1B2JKsRMGocer8jVLGmZdJshEaReyNpEGd',
  'KT1U7vd5DLjFGuK94Q4jUqPzzQdsyWA38DUH',
  'KT1XXUzvauzUBz3c7YuKSF5x5aBjRyVa4tXi',
  'KT1PFrFXJV484NtSta3UCnNGzRDnymdz2SPE',
  'KT1Q4qRd8mKS7eWUgTfJzCN8RC6h9CzzjVJb'
]

const allContractsArray = Array.from(allContracts.values())

console.log(`Storing ${allContractsArray.length} contracts`)

getDataForContracts(object, allContractsArray).then((newObject) => {
  console.log(newObject)
  fs.writeFileSync(CONTRACTS_FILE, `${exportPrefix}${JSON.stringify(newObject)}`)
})
