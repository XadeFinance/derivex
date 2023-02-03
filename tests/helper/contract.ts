import BN from "bn.js"
import { artifacts, web3 } from "hardhat"
import {
    CUsdtMockContract,
    CUsdtMockInstance,
    ERC20FakeContract,
    ERC20FakeInstance,
    PriceFeedL2FakeContract,
    PriceFeedL2FakeInstance,
    L2PriceFeedMockContract,
    L2PriceFeedMockInstance,
    RedstonePriceFeedContract,
    RedstonePriceFeedInstance,
    TollPoolContract,
    TollPoolInstance,
} from "../../types/truffle-contracts"
import { Decimal, toFullDigit } from "./number"

const L2PriceFeedMock = artifacts.require("L2PriceFeedMock") as L2PriceFeedMockContract
const ERC20Fake = artifacts.require("ERC20Fake") as ERC20FakeContract
const PriceFeedL2Fake = artifacts.require("PriceFeedL2Fake") as PriceFeedL2FakeContract
const RedstonePriceFeed = artifacts.require("RedstonePriceFeed") as RedstonePriceFeedContract
const CUsdtMock = artifacts.require("CUsdtMock") as CUsdtMockContract
const TollPool = artifacts.require("TollPool") as TollPoolContract


export async function deployErc20Fake(
    initSupply: BN = new BN(0),
    name = "name",
    symbol = "symbol",
    decimal: BN = new BN(18),
): Promise<ERC20FakeInstance> {
    const instance = await ERC20Fake.new()
    await instance.initializeERC20Fake(initSupply, name, symbol, decimal)
    return instance
}

export async function deployInsuranceFund(): 
Promise<InsuranceFundFakeInstance> {
    const instance = await InsuranceFund.new()
    await instance.initialize()
    return instance
}

export async function deployPriceFeedL2(): 
Promise<PriceFeedL2FakeInstance> {
    const instance = await PriceFeedL2Fake.new()
    await instance.initialize()
    return instance
}

export async function deployRedstonePriceFeed(): Promise<RedstonePriceFeedInstance> {
    const instance = await RedstonePriceFeed.new()
    await instance.initialize()
    return instance
}

export async function deployTollPool(): Promise<TollPoolInstance> {
    const instance = await TollPool.new()
    await instance.initialize()
    return instance
}
