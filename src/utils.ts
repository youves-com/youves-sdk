import { OpKind } from '@taquito/rpc'
import axios, { AxiosError } from 'axios'
import BigNumber from 'bignumber.js'

export const sendAndAwait = async (walletOperation: any, clearCacheCallback: () => Promise<void>): Promise<string> => {
  const batchOp = await walletOperation.send()
  await batchOp.confirmation()
  await clearCacheCallback()
  return batchOp.opHash
}

const runOperation = async (node: string, destination: string, parameters: any) => {
  const fakeSignature: string = 'sigUHx32f9wesZ1n2BWpixXz4AQaZggEtchaQNHYGRCoWNAXx45WGW2ua3apUUUAGMLPwAU41QoaFCzVSL61VaessLg4YbbP'
  const fakeAddress: string = 'tz1YZkgk9jfxcBTKWvaFTuh5fPxYEueQGDT8'

  const results = await Promise.all([
    axios.get(`${node}/chains/main/blocks/head/context/contracts/${fakeAddress}/counter`),
    axios.get<{ chain_id: string; hash: string }>(`${node}/chains/main/blocks/head`)
  ])

  const counter = new BigNumber(results[0].data).plus(1).toString(10)
  const block = results[1].data

  const body = {
    chain_id: block.chain_id,
    operation: {
      branch: block.hash,
      contents: [
        {
          source: fakeAddress,
          kind: OpKind.TRANSACTION,
          fee: '999999',
          counter,
          gas_limit: '1040000',
          storage_limit: '60000',
          amount: '0',
          destination,
          parameters
        }
      ],
      signature: fakeSignature // signature will not be checked, so it is ok to always use this one
    }
  }

  const response: any = await axios
    .post(`${node}/chains/main/blocks/head/helpers/scripts/run_operation`, body, {
      headers: { 'Content-Type': 'application/json' }
    })
    .catch((runOperationError: AxiosError) => {
      console.error('runOperationError', runOperationError)
    })

  return response.data
}

export const getPriceFromOracle = async (): Promise<string> => {
  const res = await runOperation('https://tezos-node-youves.prod.gke.papers.tech', 'KT1STKjPTSejiDgJN89EGYnSRhU5zYABd6G3', {
    entrypoint: 'get_price',
    value: {
      string: 'KT1Lj4y492KN1zDyeeKR2HG74SR2j5tcenMV'
    }
  })
  const internalOps: any[] = res.contents[0].metadata.internal_operation_results

  return internalOps.pop().result.storage.int
}

export const getBTCTEZPriceFromOracle = async (): Promise<string> => {
  const res = await runOperation('https://tezos-hangzhounet-node.prod.gke.papers.tech', 'KT1BNjcWowXNfWrzMBFmU8UibeWojx3JeuXB', {
    entrypoint: 'get_price',
    value: {
      string: 'KT1E4MTnEKVv9dX5RovpfW2ND2NRHYHa4RVL%set_nat'
    }
  })

  const internalOps: any[] = res.contents[0].metadata.internal_operation_results
  const op = internalOps.pop()
  const result = op.result.storage.args[1].int

  return result
}

export const round = (number: BigNumber) => {
  return number.decimalPlaces(0, BigNumber.ROUND_DOWN)
}
