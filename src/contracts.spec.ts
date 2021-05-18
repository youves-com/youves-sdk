import { TezosToolkit } from "@taquito/taquito";
import { importKey } from "@taquito/signer";
import { Youves } from "./contracts";

const toolkit = new TezosToolkit("https://tezos-node.prod.gke.papers.tech");

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
  const youves = new Youves(toolkit);

  const result = await youves.getBalance(
    "tz1h3rQ8wBxFd8L9B3d7Jhaawu6Z568XU3xY"
  );

  expect(result.toString(10)).toBe("1676148");
});

test("should create a vault", async () => {
  const youves = new Youves(toolkit);

  const result = await youves.transfer(
    "tz1h3rQ8wBxFd8L9B3d7Jhaawu6Z568XU3xY",
    1
  );

  expect(result).toBe("1676148");
});

test("should create a vault", async () => {
  const youves = new Youves(toolkit);

  const result = await youves.createVault();

  expect(result.toString(10)).toBe("1676148");
});
