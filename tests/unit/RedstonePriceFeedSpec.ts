import { web3 } from "hardhat"
import { expectEvent, expectRevert } from "@openzeppelin/test-helpers"
import BN from "bn.js"
import { expect, use } from "chai"
import { PriceFeedL2FakeInstance, RedstonePriceFeedInstance } from "../../types/truffle-contracts"
import { deployPriceFeedL2, deployRedstonePriceFeed } from "../helper/contract"
import { assertionHelper } from "../helper/assertion-plugin"

use(assertionHelper)

describe("RedstonePriceFeedSpec", () => {
    let addresses: string[]
    let admin: string
    let PriceFeedL2: PriceFeedL2FakeInstance
    let RedstonePriceFeed: RedstonePriceFeedInstance
    const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000"

    beforeEach(async () => {
        addresses = await web3.eth.getAccounts()
        admin = addresses[0]
        PriceFeedL2 = await deployPriceFeedL2()
        RedstonePriceFeed = await deployRedstonePriceFeed()

        PriceFeedL2.setOracle(RedstonePriceFeed.address)
        RedstonePriceFeed.setPriceFeedL2(PriceFeedL2.address)
    })

    function stringToBytes32(str: string): string {
        return web3.utils.asciiToHex(str)
    }

    function fromBytes32(str: string): string {
        return web3.utils.hexToUtf8(str)
    }

    describe("setPriceFeedL2() / setSigner()", () => {
        beforeEach(async () => {
            RedstonePriceFeed = await deployRedstonePriceFeed()
        })

        it("should set PriceFeedL2", async () => {
            await RedstonePriceFeed.setPriceFeedL2(PriceFeedL2.address)
            expect(await RedstonePriceFeed.PriceFeedL2()).to.eq(PriceFeedL2.address)
        })

        it("should set signer", async () => {
            await RedstonePriceFeed.setSigner(addresses[1])
            expect(await RedstonePriceFeed.signer()).to.eq(addresses[1])
        })

        it("isSignerAuthorized()", async () => {
            await RedstonePriceFeed.setSigner(addresses[1])
            expect(await RedstonePriceFeed.isSignerAuthorized(addresses[1])).to.eq(true)
        })

        it("force error, PriceFeedL2 cannot be zero address", async () => {
            await expectRevert(await RedstonePriceFeed.setPriceFeedL2(EMPTY_ADDRESS), "PriceFeedL2 cannot be zero address")
        })

        it("force error, signer cannot be zero address", async () => {
            await expectRevert(await RedstonePriceFeed.setSigner(EMPTY_ADDRESS), "Signer cannot be zero address")
        })
    })
})