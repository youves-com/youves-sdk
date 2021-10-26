const fs = require('fs')
const { TezosToolkit } = require('@taquito/taquito')
const Tezos = new TezosToolkit('https://mainnet.smartpy.io')

const getDataForContracts = async (obj: Record<string, { script: Object; entrypoints: Object }>, contracts: string[]) => {
  for (let contract of contracts) {
    try {
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
}

const object: Record<string, { script: string; entrypoints: string }> = {}

const contractAddresses: string[] = [
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1HjoLU8KAgQYszocVigHW8TxUb8ZsdGTog',
  'KT1EZmFNuBx76T8CnTrHeYJ2YeAc7wSGKSRi',
  'KT1FFE2LC5JpVakVjHm5mM36QVp2p3ZzH4hH',
  'KT1RkQaK5X84deBAT6sXJ2VLs7zN4pM7Y3si',
  'KT1Lz5S39TMHEA7izhQn8Z1mQoddm6v1jTwH',
  'KT1M8asPmVQhFG6yujzttGonznkghocEkbFk',
  'KT1TMfRfmJ5mkJEXZGRCsqLHn2rgnV1SdUzb',
  'KT1A1VNTvyqJYZN2FypF2kiTBPdoRvG9sCA7',
  'KT1UAuApZKc1UrbKL27xa5B6XWxUgahLZpnX',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1EtjRRCBC2exyCRXz8UfV7jz7svnkqi7di'
] // Add contract addresses here

getDataForContracts(object, contractAddresses).then(() => {
  console.log(object)
  fs.writeFileSync('./src/contracts/contracts.ts', `export const contractInfo = ${JSON.stringify(object)}`)
})
