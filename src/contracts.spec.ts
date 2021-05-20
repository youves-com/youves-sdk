import { TezosToolkit } from "@taquito/taquito";
import { importKey } from "@taquito/signer";
import { Youves } from "./contracts";
import BigNumber from "bignumber.js";

const TIMEOUT = 1000*60*2 // 2 min timeout, because 1 min blocktime
const DEFAULT_RECIPIENT = "tz1gv18W9YahanAkMdXAygntRuVM2C8EF8Hw"
const toolkit = new TezosToolkit("https://florence-tezos.giganode.io/");

const FAUCET_KEY = {
  mnemonic: [
    "cart",
    "will",
    "page",
    "bench",
    "notice",
    "leisure",
    "penalty",
    "medal",
    "define",
    "odor",
    "ride",
    "devote",
    "cannon",
    "setup",
    "rescue",
  ],
  secret: "35f266fbf0fca752da1342fdfc745a9c608e7b20",
  amount: "4219352756",
  pkh: "tz1YBMFg1nLAPxBE6djnCPbMRH5PLXQWt8Mg",
  password: "Fa26j580dQ",
  email: "jxmjvauo.guddusns@tezos.example.org",
};

importKey(
  toolkit,
  FAUCET_KEY.email,
  FAUCET_KEY.password,
  FAUCET_KEY.mnemonic.join(" "),
  FAUCET_KEY.secret
).catch((e) => console.error(e));

if(false){
test("should create a vault", async () => {
  const youves = new Youves(toolkit)
  const amount = 20*10**6 //pay 1 tez
  const mintAmount = 10**12 //mint 1 uUSD
  const result = await youves.createVault(amount, mintAmount)
  expect(result.length).toBe(51)
}, TIMEOUT)

test("should fund vault", async () => {
  const youves = new Youves(toolkit)
  const amount = 1*10**6 //pay 1 tez
  const result = await youves.fundVault(amount)
  expect(result.length).toBe(51)
}, TIMEOUT)

test("should mint", async () => {
  const youves = new Youves(toolkit)
  const mintAmount = 10**12 
  const result = await youves.mint(mintAmount)
  expect(result.length).toBe(51)
}, TIMEOUT)

test("should transfer minted tokens", async () => {
  const youves = new Youves(toolkit)
  const tokenAmount = 10**11 //pay 1 tez
  const result = await youves.transferSyntheticToken(DEFAULT_RECIPIENT, tokenAmount)
  expect(result.length).toBe(51)
}, TIMEOUT)

test("should claim governance tokens", async () => {
  const youves = new Youves(toolkit)
  const result = await youves.claimGovernanceToken()
  expect(result.length).toBe(51)
}, TIMEOUT)

test("should add staking pool as governance token operator", async () => {
  const youves = new Youves(toolkit)
  const result = await youves.addGovernanceTokenOperator(youves.REWARD_POOL_ADDRESS)
  expect(result.length).toBe(51)
}, TIMEOUT)

test("should deposit to rewards pool", async () => {
  const youves = new Youves(toolkit)
  const result = await youves.depositToRewardsPool(89222)
  expect(result.length).toBe(51)
}, TIMEOUT)

test("should claim staking rewards", async () => {
  const youves = new Youves(toolkit)
  const result = await youves.claimRewards()
  expect(result.length).toBe(51)
}, TIMEOUT)

test("should withdraw from rewards pool", async () => {
  const youves = new Youves(toolkit)
  const result = await youves.withdrawFromRewardsPool()
  expect(result.length).toBe(51)
}, TIMEOUT)

test("should add synthetic token operator", async () => {
  const youves = new Youves(toolkit)
  const result = await youves.addSynthenticTokenOperator(youves.SAVINGS_POOL_ADDRESS)
  expect(result.length).toBe(51)
}, TIMEOUT)

test("should deposit to savings pool", async () => {
  const youves = new Youves(toolkit)
  const result = await youves.depositToSavingsPool(10**11)
  expect(result.length).toBe(51)
}, TIMEOUT)

test("should withdraw from savings pool", async () => {
  const youves = new Youves(toolkit)
  const result = await youves.withdrawFromSavingsPool()
  expect(result.length).toBe(51)
}, TIMEOUT)


// quipo tests
test("should trade tez for synthetic token", async () => {
  const youves = new Youves(toolkit)
  const result = await youves.tezToSyntheticSwap(10**5,1)
  expect(result.length).toBe(51)
}, TIMEOUT*2)

test("should trade synthetic token for tez", async () => {
  const youves = new Youves(toolkit)
  const result = await youves.syntheticAssetToTezSwap(10**3,1)
  expect(result.length).toBe(51)
}, TIMEOUT*2)
}

async function verifyBigNumberGteZero(result: Promise<BigNumber>):Promise<Boolean>{
  const awaitedResult = await result
  console.log(awaitedResult.toString())
  expect(awaitedResult.toNumber()).toBeGreaterThan(0)
  return true
}

test("should get the required numbers", async () => {
  const youves = new Youves(toolkit)
  await verifyBigNumberGteZero(youves.getTotalSyntheticAssetSupply())
  await verifyBigNumberGteZero(youves.getSyntheticAssetExchangeRate())
  await verifyBigNumberGteZero(youves.getGovernanceTokenExchangeRate())
  await verifyBigNumberGteZero(youves.getTargetExchangeRate())
  await verifyBigNumberGteZero(youves.getAccountMaxMintableAmount())
  await verifyBigNumberGteZero(youves.getVaultMaxMintableAmount())
  await verifyBigNumberGteZero(youves.getClaimableGovernanceToken())
  await verifyBigNumberGteZero(youves.getYearlyLiabilityInterestRate())
  await verifyBigNumberGteZero(youves.getGovernanceTokenTotalSupply())
  await verifyBigNumberGteZero(youves.getExpectedWeeklyGovernanceRewards(10))
  await verifyBigNumberGteZero(youves.getCollateralisationUsage())
  await verifyBigNumberGteZero(youves.getVaultCollateralisation())
  await verifyBigNumberGteZero(youves.getRequiredCollateral())
  await verifyBigNumberGteZero(youves.getMintedSyntheticAsset())
  await verifyBigNumberGteZero(youves.getWithdrawableCollateral())
  await verifyBigNumberGteZero(youves.getMintableAmount())
  
}, TIMEOUT)