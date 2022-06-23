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
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT1Lz5S39TMHEA7izhQn8Z1mQoddm6v1jTwH',
  'KT1M8asPmVQhFG6yujzttGonznkghocEkbFk',
  'KT1TMfRfmJ5mkJEXZGRCsqLHn2rgnV1SdUzb',
  'KT1A1VNTvyqJYZN2FypF2kiTBPdoRvG9sCA7',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1TnrLFrdemNZ1AnnWNfi21rXg7eknS484C',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT1Lz5S39TMHEA7izhQn8Z1mQoddm6v1jTwH',
  'KT1M8asPmVQhFG6yujzttGonznkghocEkbFk',
  'KT1TMfRfmJ5mkJEXZGRCsqLHn2rgnV1SdUzb',
  'KT1A1VNTvyqJYZN2FypF2kiTBPdoRvG9sCA7',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1ESueqJziqKEgoePd1FMemk5XDiKhjczd6',
  'KT1FzcHaNhmpdYPNTgfb8frYXx7B5pvVyowu',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT1TFPn4ZTzmXDzikScBrWnHkoqTA7MBt9Gi',
  'KT1Kvg5eJVuYfTC1bU1bwWyn4e1PRGKAf6sy',
  'KT1BLLj2GZN6VuiM1Vg8LNsPWzoZTUa3mYqq',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1Wqc19pqbYfzM3pVMZ35YdSxUvECwFfpVo',
  'KT1B2GSe47rcMCZTRk294havTpyJ36JbgdeB',
  'KT1EAw8hL5zseB3SLpJhBqPQfP9aWrWh8iMW',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT1TFPn4ZTzmXDzikScBrWnHkoqTA7MBt9Gi',
  'KT1Kvg5eJVuYfTC1bU1bwWyn4e1PRGKAf6sy',
  'KT1BLLj2GZN6VuiM1Vg8LNsPWzoZTUa3mYqq',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1H8sJY2VzrbiX4pYeUVsoMUd4iGw2DV7XH',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT1TFPn4ZTzmXDzikScBrWnHkoqTA7MBt9Gi',
  'KT1Kvg5eJVuYfTC1bU1bwWyn4e1PRGKAf6sy',
  'KT1BLLj2GZN6VuiM1Vg8LNsPWzoZTUa3mYqq',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT19bkpis4NSDnt6efuh65vYxMaMHBoKoLEw',
  'KT1KNbtEBKumoZoyp5uq6A4v3ETN7boJ9ArF',
  'KT1Pcv7VbgSFFRU9ykc1dwGHM3VjfWmfZqfB',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1M9rKvjNGdyHnrbxjrLhW9HCsAwtfY13Fn',
  'KT1VjQoL5QvyZtm9m1voQKNTNcQLi5QiGsRZ',
  'KT1WBLrLE2vG8SedBqiSJFm4VVAZZBytJYHc',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT19bkpis4NSDnt6efuh65vYxMaMHBoKoLEw',
  'KT1KNbtEBKumoZoyp5uq6A4v3ETN7boJ9ArF',
  'KT1Pcv7VbgSFFRU9ykc1dwGHM3VjfWmfZqfB',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT18ePgHFBVBSLJD7uJoX2w5aZY3SvtV9xGP',
  'KT1NFWUqr9xNvVsz2LXCPef1eRcexJz5Q2MH',
  'KT1JeWiS8j1kic4PHx7aTnEr9p4xVtJNzk5b',
  'KT1T974a8qau4xP3RAAWPYCZM9xtwU9FLjPS',
  'KT1XvH5f2ja2jzdDbv6rxPmecZFU7s3obquN',
  'KT1AVbWyM8E7DptyBCu4B5J5B7Nswkq7Skc6',
  'KT1Xbx9pykNd38zag4yZvnmdSNBknmCETvQV',
  // 'KT1RkQaK5X84deBAT6sXJ2VLs7zN4pM7Y3si',
  // 'KT1UAuApZKc1UrbKL27xa5B6XWxUgahLZpnX',

  'KT1A1VNTvyqJYZN2FypF2kiTBPdoRvG9sCA7',
  'KT1A1VNTvyqJYZN2FypF2kiTBPdoRvG9sCA7',
  'KT1A1VNTvyqJYZN2FypF2kiTBPdoRvG9sCA7',
  'KT1Pcv7VbgSFFRU9ykc1dwGHM3VjfWmfZqfB',
  'KT1Pcv7VbgSFFRU9ykc1dwGHM3VjfWmfZqfB',
  'KT1XvH5f2ja2jzdDbv6rxPmecZFU7s3obquN',
  'KT1Xbx9pykNd38zag4yZvnmdSNBknmCETvQV',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL',
  'KT1Lz5S39TMHEA7izhQn8Z1mQoddm6v1jTwH',
  'KT1Lz5S39TMHEA7izhQn8Z1mQoddm6v1jTwH',
  'KT1Lz5S39TMHEA7izhQn8Z1mQoddm6v1jTwH',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1PL1YciLdwMbydt21Ax85iZXXyGSrKT2BE',
  'KT1TMfRfmJ5mkJEXZGRCsqLHn2rgnV1SdUzb',
  'KT1TMfRfmJ5mkJEXZGRCsqLHn2rgnV1SdUzb',
  'KT1TMfRfmJ5mkJEXZGRCsqLHn2rgnV1SdUzb',
  'KT1EtjRRCBC2exyCRXz8UfV7jz7svnkqi7di',
  'KT1M8asPmVQhFG6yujzttGonznkghocEkbFk',
  'KT1M8asPmVQhFG6yujzttGonznkghocEkbFk',
  'KT1M8asPmVQhFG6yujzttGonznkghocEkbFk',
  'KT19bkpis4NSDnt6efuh65vYxMaMHBoKoLEw',
  'KT19bkpis4NSDnt6efuh65vYxMaMHBoKoLEw',
  'KT1Wqc19pqbYfzM3pVMZ35YdSxUvECwFfpVo',
  'KT1ESueqJziqKEgoePd1FMemk5XDiKhjczd6',
  'KT1BLLj2GZN6VuiM1Vg8LNsPWzoZTUa3mYqq',
  'KT1BLLj2GZN6VuiM1Vg8LNsPWzoZTUa3mYqq',
  'KT1BLLj2GZN6VuiM1Vg8LNsPWzoZTUa3mYqq',
  'KT18ePgHFBVBSLJD7uJoX2w5aZY3SvtV9xGP',
  'KT1M9rKvjNGdyHnrbxjrLhW9HCsAwtfY13Fn',
  'KT1KNbtEBKumoZoyp5uq6A4v3ETN7boJ9ArF',
  'KT1KNbtEBKumoZoyp5uq6A4v3ETN7boJ9ArF',
  'KT1JeWiS8j1kic4PHx7aTnEr9p4xVtJNzk5b',
  'KT1T974a8qau4xP3RAAWPYCZM9xtwU9FLjPS',
  'KT1Kvg5eJVuYfTC1bU1bwWyn4e1PRGKAf6sy',
  'KT1Kvg5eJVuYfTC1bU1bwWyn4e1PRGKAf6sy',
  'KT1Kvg5eJVuYfTC1bU1bwWyn4e1PRGKAf6sy',
  'KT1EAw8hL5zseB3SLpJhBqPQfP9aWrWh8iMW',
  'KT1TFPn4ZTzmXDzikScBrWnHkoqTA7MBt9Gi',
  'KT1TFPn4ZTzmXDzikScBrWnHkoqTA7MBt9Gi',
  'KT1TFPn4ZTzmXDzikScBrWnHkoqTA7MBt9Gi',
  'KT1H8sJY2VzrbiX4pYeUVsoMUd4iGw2DV7XH',
  'KT1WBLrLE2vG8SedBqiSJFm4VVAZZBytJYHc',
  'KT1AVbWyM8E7DptyBCu4B5J5B7Nswkq7Skc6',
  'KT1FFE2LC5JpVakVjHm5mM36QVp2p3ZzH4hH',
  'KT1NFWUqr9xNvVsz2LXCPef1eRcexJz5Q2MH',
  'KT1B2GSe47rcMCZTRk294havTpyJ36JbgdeB',
  'KT1VjQoL5QvyZtm9m1voQKNTNcQLi5QiGsRZ',
  'KT1TnrLFrdemNZ1AnnWNfi21rXg7eknS484C',
  'KT1FzcHaNhmpdYPNTgfb8frYXx7B5pvVyowu',
  'KT1HxgqnVjGy7KsSUTEsQ6LgpD5iKSGu7QpA',
  'KT1Txa8RdTnNjX7E3RqVzUNA5ZyHVgHB96ta',
  'KT1LQcsXGpmLXnwrfftuQdCLNvLRLUAuNPCV',
  'KT1BjNkpfeb5gWQqMTB8Px1z3EXE4F3Tpkat',
  'KT1E45AvpSr7Basw2bee3g8ri2LK2C2SV2XG',
  'KT1UyfqcrxAmBqTbaVGbVUDSy6yLUxCUYmEw',

  'KT1UZcNDxTdkn33Xx5HRkqQoZedc3mEs11yV' // Unified Staking
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
  'KT1TkNadQ9Cw5ZNRyS4t9SKmUbmAMkqY8bkV',
  'KT1KGfEyxBeCU873RfuwrU1gy8sjC1s82WZV',
  'KT1HaWDWv7XPsZ54JbDquXV6YgyazQr9Jkp3',
  'KT1JFsKh3Wcnd4tKzF6EwugwTVGj3XfGPfeZ',
  'KT1Ug9wWbRuUs1XXRuK11o6syWdTFZQsmvw3',
  'KT1Goz5Dsi8Hf7fqjx5nSEcjp6osD9ufECB2',
  'KT1W78rDHfwp3CKev7u7dWRJTBqLdwYVcPg9',
  'KT1RLGwCgeq2ab92yznQnJinpqy9kG13dFh2',
  'KT18x3gGRMKyhzcBnKYSRrfqjnzu4fPE1Lzy',
  'KT1TkNadQ9Cw5ZNRyS4t9SKmUbmAMkqY8bkV',
  'KT1KGfEyxBeCU873RfuwrU1gy8sjC1s82WZV',
  'KT1HaWDWv7XPsZ54JbDquXV6YgyazQr9Jkp3',
  'KT1JFsKh3Wcnd4tKzF6EwugwTVGj3XfGPfeZ',
  'KT1Ug9wWbRuUs1XXRuK11o6syWdTFZQsmvw3',
  'KT1Goz5Dsi8Hf7fqjx5nSEcjp6osD9ufECB2',
  'KT1W78rDHfwp3CKev7u7dWRJTBqLdwYVcPg9',
  'KT1RLGwCgeq2ab92yznQnJinpqy9kG13dFh2',
  'KT18x3gGRMKyhzcBnKYSRrfqjnzu4fPE1Lzy',
  'KT1HaWDWv7XPsZ54JbDquXV6YgyazQr9Jkp3',
  'KT1W78rDHfwp3CKev7u7dWRJTBqLdwYVcPg9',
  'KT1TkNadQ9Cw5ZNRyS4t9SKmUbmAMkqY8bkV',
  'KT1JFsKh3Wcnd4tKzF6EwugwTVGj3XfGPfeZ',
  'KT1KGfEyxBeCU873RfuwrU1gy8sjC1s82WZV',
  'KT1Ug9wWbRuUs1XXRuK11o6syWdTFZQsmvw3',
  'KT1Goz5Dsi8Hf7fqjx5nSEcjp6osD9ufECB2',
  'KT18x3gGRMKyhzcBnKYSRrfqjnzu4fPE1Lzy',
  'KT1CuqpjqPPvcZCrvzJunCvHvPaujASdmFJZ',
  'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn',
  'KT1CuqpjqPPvcZCrvzJunCvHvPaujASdmFJZ',
  'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn',

  'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn',
  'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn',
  'KT1NZt7NTYs7m3VhB8rrua7WwVQ9uhKgpgCN',
  'KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV',
  'KT1NZt7NTYs7m3VhB8rrua7WwVQ9uhKgpgCN',
  'KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV',
  'KT1Toztq42271zT2wXDnu2hFVVdJJ8qWrETu',
  'KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9',
  'KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9',
  'KT1Toztq42271zT2wXDnu2hFVVdJJ8qWrETu',
  'KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9',
  'KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV',
  'KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV',
  'KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9',
  'KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9',
  'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn',
  'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn',
  'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn',
  'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn',
  'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn',
  'KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn',
  'KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV',
  'KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV',
  'KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9',
  'KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9',
  'KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9',
  'KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9'
]

const swapPage = ['KT1Exm6UTCNEbBHANZ7S53t7QN8NJFwAytxg', 'KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ']

// Add contract addresses here

// De-duplicate all entries
const allContracts: Set<string> = new Set()

indexPage.forEach((contract) => allContracts.add(contract))
earnPage.forEach((contract) => allContracts.add(contract))
swapPage.forEach((contract) => allContracts.add(contract))

const allContractsArray = Array.from(allContracts.values())

console.log(`Storing ${allContractsArray.length} contracts`)

getDataForContracts(object, allContractsArray).then((newObject) => {
  console.log(newObject)
  fs.writeFileSync(CONTRACTS_FILE, `${exportPrefix}${JSON.stringify(newObject)}`)
})
