import { TezosToolkit } from "@taquito/taquito";
import { importKey } from "@taquito/signer";
import { Youves } from "./contracts";

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

test("should create a vault", async () => {
  const youves = new Youves(toolkit)
  const amount = 10*6 //pay 1 tez
  const mintAmount = 10*12 //mint 1 uUSD
  const result = await youves.createVault(amount, mintAmount)
  expect(result.length).toBe(51)
}, TIMEOUT)

test("should transfer minted tokens", async () => {
  const youves = new Youves(toolkit)
  const tokenAmount = 10*11 //pay 1 tez
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
  const result = await youves.depositToRewardsPool(10**8)
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