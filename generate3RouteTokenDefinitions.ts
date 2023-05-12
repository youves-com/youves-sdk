import axios, { AxiosResponse } from 'axios'
import { promisify } from 'util'
import * as fs from 'fs'

interface Token {
  id: number
  symbol: string
  standard: string
  contract: string
  tokenId: string
  decimals: number
}

interface ContractResponse {
  id: number
  contract: {
    alias: string
    address: string
  }
  tokenId: string
  standard: string
  firstMinter: {
    address: string
  }
  firstLevel: number
  firstTime: string
  lastLevel: number
  lastTime: string
  transfersCount: number
  balancesCount: number
  holdersCount: number
  totalMinted: string
  totalBurned: string
  totalSupply: string
  metadata: {
    name: string
    symbol: string
    decimals: string
    thumbnailUri: string
  }
}

export enum TokenType {
  NATIVE = 0,
  FA1p2 = 1,
  FA2 = 2
}

interface TokenDefinition {
  id: string
  type: TokenType
  name: string
  shortName: string
  decimals: number
  symbol: string
  targetSymbol: string
  unit: string
  impliedPrice: number
  tokenId: number
  decimalPlaces: number
  inputDecimalPlaces: number
  _3RouteId: number
}

const CURRENT_LATEST_ID = 126
const LOGOS_DIR = './logos/'
const OUTPUT_DEFINITIONS_FILE = 'generatedTokenDefinitions.ts'
const OUTPUT_LIST_FILE = 'generatedTokenList.ts'
const OUTPUT_MAINNETTOKENS_FILE = 'generatedMainnetTokens.ts'
const IMAGES_NOT_FOUND: string[] = []

const ENABLE_IMAGE_DONWLOAD = true
const ENABLE_TOKEN_DEFINITIONS = true
const ENABLE_TOKEN_LIST = true
const ENABLE_TOKEN_MAINNET = true

async function fetchContractInfo(token: Token): Promise<ContractResponse[]> {
  const url = `https://api.tzkt.io/v1/tokens?contract=${token.contract}`
  const response: AxiosResponse<ContractResponse[]> = await axios.get(url)
  return response.data
}

async function downloadImage(symbol: string, url: string) {
  // check if url exists
  if (url === undefined) {
    IMAGES_NOT_FOUND.push(symbol)
    return
  }
  const isIpfs = url.includes('ipfs://')
  if (isIpfs) {
    url = url.replace('ipfs://', 'https://ipfs.io/ipfs/')
    // Retrieve raw binary data from IPFS
    const response = await axios.get(url, { responseType: 'arraybuffer' })
    const buffer = Buffer.from(response.data)

    // Determine file type based on magic bytes
    const signature = buffer.slice(0, 4).toString('hex')
    //console.log('👀', symbol, signature, url)
    let imageExtension = ''
    switch (signature) {
      case '89504e47':
        imageExtension = 'png'
        break
      case '47494638':
        imageExtension = 'gif'
        break
      case 'ffd8ffe0':
      case 'ffd8ffe1':
      case 'ffd8ffe2':
        imageExtension = 'jpg'
        break
      case '49492a00':
        imageExtension = 'tif'
        break
      case '3c3f786d6c':
      case '3c3f786d':
      case '3c737667':
        imageExtension = 'svg'
        break
      default:
        console.error(`Error determining file type for image with IPFS URL ${url}`)
        return
    }
    const filePath = `${LOGOS_DIR}${symbol.toLowerCase()}.svg`

    if (imageExtension === 'svg') {
      const response = await axios.get(url, { responseType: 'stream' })
      response.data.pipe(fs.createWriteStream(filePath))
    } else {
      const base64 = buffer.toString('base64')
      const svgContent = `<?xml version="1.0" encoding="utf-8"?>
      <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
         viewBox="0 0 300 300" style="enable-background:new 0 0 300 300;" xml:space="preserve">
      <image style="overflow:visible;" width="300" height="300" xlink:href="data:image/${imageExtension};base64,${base64}">
      </image>
      </svg>`
      fs.writeFileSync(filePath, svgContent)
    }
  } else {
    const isSvg = url.endsWith('.svg')
    const imageExtension = isSvg ? 'svg' : url.split('.').pop()
    const filePath = `${LOGOS_DIR}${symbol.toLowerCase()}.svg`

    //console.log('👀', symbol, imageExtension, url)
    try {
      if (isSvg) {
        const response = await axios.get(url, { responseType: 'stream' })
        response.data.pipe(fs.createWriteStream(filePath))
      } else {
        const response = await axios.get(url, { responseType: 'arraybuffer' })
        const buffer = Buffer.from(response.data)
        const base64 = buffer.toString('base64')
        const svgContent = `<?xml version="1.0" encoding="utf-8"?>
        <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
           viewBox="0 0 300 300" style="enable-background:new 0 0 300 300;" xml:space="preserve">
        <image style="overflow:visible;" width="300" height="300" xlink:href="data:image/${imageExtension};base64,${base64}">
        </image>
        </svg>`
        fs.writeFileSync(filePath, svgContent)
      }
    } catch (error: any) {
      // Explicitly typing the error parameter as 'any'
      IMAGES_NOT_FOUND.push(symbol)
      if (error.response && error.response.status === 404) {
        console.error(`Image not found for symbol ${symbol}`)
      } else {
        console.error(`Error downloading image for symbol ${symbol}: ${error.message}`)
      }
    }
  }
}

function getTokenTypeString(type: TokenType): string {
  switch (type) {
    case TokenType.NATIVE:
      return 'TokenType.NATIVE'
    case TokenType.FA1p2:
      return 'TokenType.FA1p2'
    case TokenType.FA2:
      return 'TokenType.FA2'
    default:
      throw new Error(`Unknown TokenType value: ${type}`)
  }
}

async function main() {
  if (!fs.existsSync(LOGOS_DIR)) {
    fs.mkdirSync(LOGOS_DIR)
  }

  const tokenListUrl = 'https://youves.3route.io/tokens'
  const response: AxiosResponse<Token[]> = await axios.get(tokenListUrl)
  const tokens = response.data.slice(CURRENT_LATEST_ID + 1).map((x) => {
    return {
      ...x,
      tokenId: x.tokenId == null ? '0' : x.tokenId
    }
  })
  //console.log(tokens)
  //converting nulls to 0

  const contractInfoByToken: { [key: string]: ContractResponse[] } = {}

  for (const token of tokens) {
    try {
      const contractInfo = await fetchContractInfo(token)
      //console.log(contractInfo)
      contractInfoByToken[token.contract] = contractInfo
    } catch (error) {
      console.error(`Error fetching contract info for ${token.contract}:`, error)
    }
  }

  const tokenDefinitions: TokenDefinition[] = []

  for (const token of tokens) {
    //console.log(contractInfoByToken[token.contract], token.tokenId)
    //console.log(contractInfoByToken[token.contract], token)
    const contractInfo = contractInfoByToken[token.contract].find((x) => x.tokenId === token.tokenId)
    if (contractInfo === undefined) break
    if (ENABLE_IMAGE_DONWLOAD) await downloadImage(contractInfo.metadata.symbol, contractInfo.metadata.thumbnailUri)
    const tokenDefinition: TokenDefinition = {
      id: contractInfo.metadata.symbol,
      type: token.standard === 'fa2' ? TokenType.FA2 : token.standard === 'fa12' ? TokenType.FA1p2 : TokenType.NATIVE,
      name: contractInfo.metadata.name,
      shortName: contractInfo.metadata.symbol,
      decimals: parseInt(contractInfo.metadata.decimals),
      symbol: contractInfo.metadata.symbol,
      targetSymbol: contractInfo.metadata.symbol,
      unit: contractInfo.metadata.symbol,
      impliedPrice: 1,
      tokenId: parseInt(contractInfo.tokenId),
      decimalPlaces: 2,
      inputDecimalPlaces: 4,
      _3RouteId: token.id
    }
    tokenDefinitions.push(tokenDefinition)
  }

  //LOG DEFINITIONS TO CONSOLE
  // for (const tokenDefinition of tokenDefinitions) {
  //   console.log(`export const ${tokenDefinition.id}: Omit<Token, 'contractAddress'> = ${JSON.stringify(tokenDefinition, null, 2)};\n`)
  // }

  //GENERATED TOKEN DEFINITIONS TO ADD TO NETWORK.BASE.TS
  if (ENABLE_TOKEN_DEFINITIONS) {
    const output = tokenDefinitions
      .map((tokenDefinition) => {
        const typeString = getTokenTypeString(tokenDefinition.type)
        return `export const ${tokenDefinition.id.toLowerCase()}Token: Omit<Token, 'contractAddress'> = {\n  id: '${
          tokenDefinition.id
        }',\n  type: ${typeString},\n  name: '${tokenDefinition.name}',\n  shortName: '${tokenDefinition.shortName}',\n  decimals: ${
          tokenDefinition.decimals
        },\n  symbol: '${tokenDefinition.symbol}',\n  targetSymbol: '${tokenDefinition.targetSymbol}',\n  unit: '${
          tokenDefinition.unit
        }',\n  impliedPrice: ${tokenDefinition.impliedPrice},\n  tokenId: ${tokenDefinition.tokenId},\n  decimalPlaces: ${
          tokenDefinition.decimalPlaces
        },\n  inputDecimalPlaces: ${tokenDefinition.inputDecimalPlaces},\n  _3RouteId: ${tokenDefinition._3RouteId}\n};\n\n`
      })
      .join('')
    await promisify(fs.writeFile)(OUTPUT_DEFINITIONS_FILE, output, { flag: 'w+' })
  }

  //GENERATE TOKEN LIST TO ADD TO THE TOKEN.TS in the TokenSymbol
  if (ENABLE_TOKEN_LIST) {
    const formattedList = tokenDefinitions.map((token) => `  | '${token.id}'`).join('\n')
    await promisify(fs.writeFile)(OUTPUT_LIST_FILE, `export type TokenSymbol =\n${formattedList}\n`, { flag: 'w+' })
  }

  //GENERATE TOKEN LIST TO ADD TO THE mainnetTokens in networks.mainnent.ts
  if (ENABLE_TOKEN_MAINNET) {
    const tokenImports = tokens.map((token) => `${token.symbol.toLowerCase()}Token,`).join('\n')
    const mainnetTokens = tokens
      .map(
        (token) => `${token.symbol.toLowerCase()}Token: { ...${token.symbol.toLowerCase()}Token, contractAddress: '${token.contract}' },`
      )
      .join('\n')
    await promisify(fs.writeFile)(
      OUTPUT_MAINNETTOKENS_FILE,
      `import {\n${tokenImports}\n}  from './networks.base'\n\nexport const mainnetTokens: Record<string, Token> = {\n${mainnetTokens}\n}`,
      {
        flag: 'w+'
      }
    )
  }

  console.log('\n')
  console.log('in generatedTokenDefinitions.ts you can find the definitions to add to networks.base.ts')
  console.log('in generatedTokenList.ts you can find the symbols to add to the TokenSymbol type in token.ts')
  console.log('in the ' + LOGOS_DIR + ' directory you can find the logos tha need to be added to assets/img/symbols in the main app')
  if (IMAGES_NOT_FOUND.length > 0)
    console.log('🚨 WARNING: The images for these tokens were not found. Need to add manually \n', IMAGES_NOT_FOUND)
}

main().catch((error) => console.error('Error occurred:', error))
