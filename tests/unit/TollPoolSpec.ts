import { artifacts, web3 } from "hardhat"
import { expectEvent, expectRevert } from "@openzeppelin/test-helpers"
import { use, expect } from "chai"
import { 
    ERC20FakeInstance, 
    InsuranceFundFakeInstance,
    InflationMonitorFakeContract,
    InflationMonitorFakeInstance,
    TollPoolInstance 
} from "../../types/truffle-contracts"
import { assertionHelper } from "../helper/assertion-plugin"
import {
    deployErc20Fake,
    deployTollPool,
    deployInsuranceFund,
} from "../helper/contract"
import { toFullDigit } from "../helper/number"
import BN from "bn.js"

use(assertionHelper)

const InflationMonitor = artifacts.require("InflationMonitorFake") as InflationMonitorFakeContract

const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000"

describe("tollPoolSpec", () => {
    let admin: string
    let alice: string
    let tollPoolOperator: string
    let tollPool: TollPoolInstance
    let usdt: ERC20FakeInstance
    let usdc: ERC20FakeInstance
    let insuranceFund: InsuranceFundFakeInstance
    let inflationMonitor: InflationMonitorFakeInstance

    beforeEach(async () => {

        const addresses = await web3.eth.getAccounts()
        admin = addresses[0]
        alice = addresses[1]
        tollPoolOperator = addresses[2]

        usdt = await deployErc20Fake(toFullDigit(2000000))
        usdc = await deployErc20Fake(toFullDigit(2000000))

        tollPool = await deployTollPool()
        insuranceFund = await deployInsuranceFund() 

        
        inflationMonitor = await InflationMonitor.new()
        await inflationMonitor.initialize(tollPool.address)

        await usdt.approve(tollPool.address, toFullDigit(2000000))
        await usdc.approve(tollPool.address, toFullDigit(2000000))
    })

    describe("transferToTollPoolOperator()", () => {
        it("can't add empty token", async () => {
            await expectRevert(tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)}), "invalid input")
        })

        it("should withdraw specific amount of specific token", async () => {
            await tollPool.setTollPoolOperator(tollPoolOperator)
            await tollPool.notifyTokenAmount(usdc.address, {d: 10 })
            await tollPool.notifyTokenAmount(usdt.address, {d: 10 })

            await usdt.transfer(tollPool.address, toFullDigit(1000))
            await usdc.transfer(tollPool.address, toFullDigit(2000))

            const receipt = await tollPool.withdraw(usdc.address, {d: 10 })

            expectEvent.inTransaction(receipt.tx, tollPool, "Withdrawn", {
                token: usdc.address,
                amount: toFullDigit(500),
            })
            expect(await usdc.balanceOf(tollPoolOperator)).to.eq(toFullDigit(500))
            expect(await usdc.balanceOf(tollPool.address)).to.eq(toFullDigit(500))
        })

        it("should receive all the balance of one token in the tollPool contract", async () => {
            await tollPool.setTollPoolOperator(tollPoolOperator)
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})

            await usdt.transfer(tollPool.address, toFullDigit(1000))
            const receipt = await tollPool.transferToTollPoolOperator({ from: admin })
            expectEvent.inTransaction(receipt.tx, tollPool, "Withdrawn")
            expect(await usdt.balanceOf(tollPoolOperator)).to.eq(toFullDigit(1000))
        })

        it("should receive all the balances of tokens in the tollPool contract", async () => {
            await tollPool.setTollPoolOperator(tollPoolOperator)
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})

            await usdt.transfer(tollPool.address, toFullDigit(1000))
            await usdc.transfer(tollPool.address, toFullDigit(2000))

            const receipt = await tollPool.transferToTollPoolOperator({ from: admin })
            expectEvent.inTransaction(receipt.tx, tollPool, "Withdrawn", {
                token: usdt.address,
                amount: toFullDigit(1000),
            })
            expectEvent.inTransaction(receipt.tx, tollPool, "TokenTransferred", {
                token: usdc.address,
                amount: toFullDigit(2000),
            })
            expect(await usdt.balanceOf(tollPoolOperator)).to.eq(toFullDigit(1000))
            expect(await usdc.balanceOf(tollPoolOperator)).to.eq(toFullDigit(2000))
        })

        it("should receive usdc but not usdt, since the balance of usdt is 0", async () => {
            await tollPool.setTollPoolOperator(tollPoolOperator)
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})

            await usdc.transfer(tollPool.address, toFullDigit(1000))
            await tollPool.transferToTollPoolOperator({ from: admin })
            expect(await usdc.balanceOf(tollPoolOperator)).to.eq(toFullDigit(1000))
            expect(await usdt.balanceOf(tollPoolOperator)).to.eq(toFullDigit(0))
        })

        it("force error, tollPoolOperator not yet set", async () => {
            await expectRevert(tollPool.transferToTollPoolOperator(), "tollPoolOperator not yet set")
        })

        it("force error, feeTokens not yet set", async () => {
            await tollPool.setTollPoolOperator(tollPoolOperator)
            await expectRevert(tollPool.transferToTollPoolOperator(), "feeTokens not set yet")
        })

        it("force error, the amount of all registered token is zero", async () => {
            await tollPool.setTollPoolOperator(tollPoolOperator)
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})
            await expectRevert(tollPool.transferToTollPoolOperator(), "fee is now zero")
        })
    })

    describe("setTollPoolOperator()", () => {
        it("tollPoolOperator should be set", async () => {
            await tollPool.setTollPoolOperator(tollPoolOperator)
            expect(await tollPool.tollPoolOperator()).to.eq(tollPoolOperator)
        })

        it("tollPoolOperator should be updated", async () => {
            await tollPool.setTollPoolOperator(tollPoolOperator)
            await tollPool.setTollPoolOperator(alice)
            expect(await tollPool.tollPoolOperator()).to.eq(alice)
        })

        it("force error, onlyOwner", async () => {
            await expectRevert(
                tollPool.setTollPoolOperator(EMPTY_ADDRESS, { from: alice }),
                "XadeOwnableUpgrade: caller is not the owner",
            )
        })

        it("force error, input is zero address", async () => {
            await expectRevert(tollPool.setTollPoolOperator(EMPTY_ADDRESS), "invalid input")
        })

        it("force error, feeTokenPoolDispatcher already existed", async () => {
            await tollPool.setTollPoolOperator(tollPoolOperator)
            await expectRevert(
                tollPool.setTollPoolOperator(tollPoolOperator),
                "input is the same as the current one",
            )
        })
    })

    describe("addFeeToken()", () => {
        it("feeTokens should be set", async () => {
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})
            expect(await tollPool.feeTokens(0)).to.eq(usdt.address)
            expect(await tollPool.feeTokens(1)).to.eq(usdc.address)
            expect(await tollPool.isFeeTokenExisted(usdt.address)).to.eq(true)
            expect(await tollPool.isFeeTokenExisted(usdc.address)).to.eq(true)
        })

        it("force error, onlyOwner", async () => {
            await expectRevert(
                tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)},  { from: alice }),
                "XadeOwnableUpgrade: caller is not the owner",
            )
        })

        it("force error, token is already existed", async () => {
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})
            await expectRevert(tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)}), "invalid input")
        })

        it("force error, input is zero address", async () => {
            await expectRevert(tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)}), "invalid input")
        })
    })

    describe("removeFeeToken()", () => {
        it("feeTokens should be removed", async () => {
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})
            await tollPool.removeFeeToken(usdc.address)
            expect(await tollPool.isFeeTokenExisted(usdc.address)).to.eq(false)
            expect(await tollPool.getFeeTokenLength()).to.eq(0)
        })

        it("feeTokens should be removed and can be added again", async () => {
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})

            await tollPool.removeFeeToken(usdt.address)
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})
            expect(await tollPool.feeTokens(0)).to.eq(usdc.address)
            expect(await tollPool.feeTokens(1)).to.eq(usdt.address)
        })

        it("should transfer to tollPoolOperator before removeFeeToken", async () => {
            await tollPool.setTollPoolOperator(tollPoolOperator)
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})
            await usdt.transfer(tollPool.address, 1)
            // let's use ethers/waffle when writing new unit test. it's hard to write unit test without mock lib
            await tollPool.removeFeeToken(usdt.address)
            expect(await usdt.balanceOf(tollPool.address)).to.eq(0)
            expect(await usdt.balanceOf(tollPoolOperator)).to.eq(1)
        })

        it("force error, onlyOwner", async () => {
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})
            await expectRevert(
                tollPool.removeFeeToken(usdt.address, { from: alice }),
                "XadeOwnableUpgrade: caller is not the owner",
            )
        })

        it("force error, token does not exist", async () => {
            await expectRevert(tollPool.removeFeeToken(usdt.address), "token does not exist")
        })

        it("force error, input is zero address", async () => {
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})
            await expectRevert(tollPool.removeFeeToken(EMPTY_ADDRESS), "token does not exist")
        })
    })

    describe("getPoolBalance", () => {
        it("should get correct pool balance", async () => {
            await tollPool.notifyTokenAmount(usdc.address, {d: new BN(10)})
            await tollPool.notifyTokenAmount(usdt.address, {d: new BN(10)})
            await usdc.transfer(tollPool.address, 10)
            await usdt.transfer(tollPool.address, 15)

            expect(await tollPool.poolBalance()).to.equal(25)
        })

        it("no tokens in the pool, should return 0", async () => {
            expect(await tollPool.poolBalance()).to.equal(0)
        })
    })

    describe("set insuranceFund and inflationMonitor", () => {
        it("should set insuranceFund", async () => {
            await tollPool.setInsuranceFund(insuranceFund.address)

            expect(await tollPool.InsuranceFund()).to.equal(insuranceFund.address)
        })

        it("should set inflationMonitor", async () => {
            await tollPool.setInflationMonitor(inflationMonitor.address)

            expect(await tollPool.inflationMonitor()).to.equal(inflationMonitor.address)
        })
    })
})
