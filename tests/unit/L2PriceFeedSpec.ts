import { web3 } from "hardhat"
import { expect } from "chai"
import { expectEvent, expectRevert } from "@openzeppelin/test-helpers"
import BN from "bn.js"
import { PriceFeedL2FakeInstance } from "../../types/truffle-contracts"
import { deployPriceFeedL2 } from "../helper/contract"
import { toFullDigit } from "../helper/number"

describe("PriceFeedL2 Spec", () => {
    let addresses: string[]
    let admin: string
    let PriceFeedL2: PriceFeedL2FakeInstance

    beforeEach(async () => {
        addresses = await web3.eth.getAccounts()
        admin = addresses[0]
        PriceFeedL2 = await deployPriceFeedL2()
    })

    function toBytes32(str: string): string {
        const paddingLen = 32 - str.length
        const hex = web3.utils.asciiToHex(str)
        return hex + "00".repeat(paddingLen)
    }

    function fromBytes32(str: string): string {
        return web3.utils.hexToUtf8(str)
    }

    describe("addAggregator", () => {
        it("addAggregator", async () => {
            await PriceFeedL2.addAggregator(toBytes32("ETH"))
            expect(fromBytes32(await PriceFeedL2.priceFeedKeys(0))).eq("ETH")
        })

        it("add multi aggregators", async () => {
            await PriceFeedL2.addAggregator(toBytes32("ETH"))
            await PriceFeedL2.addAggregator(toBytes32("BTC"))
            await PriceFeedL2.addAggregator(toBytes32("LINK"))
            expect(fromBytes32(await PriceFeedL2.priceFeedKeys(0))).eq("ETH")
            expect(fromBytes32(await PriceFeedL2.priceFeedKeys(2))).eq("LINK")
        })
    })

    describe("removeAggregator", () => {
        it("remove 1 aggregator when there's only 1", async () => {
            await PriceFeedL2.addAggregator(toBytes32("ETH"))
            await PriceFeedL2.removeAggregator(toBytes32("ETH"))

            // cant use expectRevert because the error message is different between CI and local env
            let error
            try {
                await PriceFeedL2.priceFeedKeys(0)
            } catch (e) {
                error = e
            }
            expect(error).not.eq(undefined)
        })

        it("remove 1 aggregator when there're 2", async () => {
            await PriceFeedL2.addAggregator(toBytes32("ETH"))
            await PriceFeedL2.addAggregator(toBytes32("BTC"))
            await PriceFeedL2.removeAggregator(toBytes32("ETH"))
            expect(fromBytes32(await PriceFeedL2.priceFeedKeys(0))).eq("BTC")
            expect(await PriceFeedL2.getPriceFeedLength(toBytes32("ETH"))).eq(0)
        })
    })

    describe("setLatestData/getPrice/getLatestTimestamp", () => {
        beforeEach(async () => {
            await PriceFeedL2.addAggregator(toBytes32("ETH"))
            await PriceFeedL2.setOracle(addresses[1])
            await PriceFeedL2.mockSetMsgSender(addresses[1])
        })

        it("setLatestData", async () => {
            const currentTime = await PriceFeedL2.mock_getCurrentTimestamp()
            const dataTimestamp = currentTime.addn(15)
            const r = await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(400), dataTimestamp)
            await expectEvent.inTransaction(r.tx, PriceFeedL2, "PriceFeedDataSet", {
                key: new BN(toBytes32("ETH")),
                price: toFullDigit(400),
                timestamp: dataTimestamp
            })
            expect(await PriceFeedL2.getPriceFeedLength(toBytes32("ETH"))).eq(1)

            const price = await PriceFeedL2.getPrice(toBytes32("ETH"))
            expect(price).eq(toFullDigit(400))
            const timestamp = await PriceFeedL2.getLatestTimestamp(toBytes32("ETH"))
            expect(timestamp).eq(dataTimestamp)
        })

        it("set multiple data", async () => {
            const currentTime = await PriceFeedL2.mock_getCurrentTimestamp()

            await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(400), currentTime.addn(15))
            await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(410), currentTime.addn(30))
            const r = await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(420), currentTime.addn(45))
            await expectEvent.inTransaction(r.tx, PriceFeedL2, "PriceFeedDataSet")
            expect(await PriceFeedL2.getPriceFeedLength(toBytes32("ETH"))).eq(3)

            const price = await PriceFeedL2.getPrice(toBytes32("ETH"))
            expect(price).eq(toFullDigit(420))
            const timestamp = await PriceFeedL2.getLatestTimestamp(toBytes32("ETH"))
            expect(timestamp).eq(currentTime.addn(45))
        })

        it("getPrice after remove the aggregator", async () => {
            await PriceFeedL2.mockSetMsgSender(admin)
            await PriceFeedL2.addAggregator(toBytes32("BTC"), { from: admin })

            const currentTime = await PriceFeedL2.mock_getCurrentTimestamp()

            await PriceFeedL2.mockSetMsgSender(addresses[1])
            await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(400), currentTime.addn(15))
            await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(410), currentTime.addn(30))
            await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(420), currentTime.addn(45))

            await PriceFeedL2.mockSetMsgSender(admin)
            await PriceFeedL2.removeAggregator(toBytes32("ETH"))

            await expectRevert(PriceFeedL2.getPrice(toBytes32("ETH")), "key not existed")
            await expectRevert(PriceFeedL2.getLatestTimestamp(toBytes32("ETH")), "key not existed")
        })

        it("force error, get data with no price feed data", async () => {
            await PriceFeedL2.mockSetMsgSender(admin)
            expect(await PriceFeedL2.getPriceFeedLength(toBytes32("ETH"))).eq(0)
            expect(await PriceFeedL2.getLatestTimestamp(toBytes32("ETH"))).eq(0)

            await expectRevert(PriceFeedL2.getPrice(toBytes32("ETH")), "no price data")
            await expectRevert(PriceFeedL2.getTwapPrice(toBytes32("ETH"), 1), "Not enough history")
            await expectRevert(PriceFeedL2.getPreviousPrice(toBytes32("ETH"), 0), "Not enough history")
            await expectRevert(PriceFeedL2.getPreviousTimestamp(toBytes32("ETH"), 0), "Not enough history")
        })

        it("force error, aggregator should be set first", async () => {
            await expectRevert(
                PriceFeedL2.setLatestData(toBytes32("BTC"), toFullDigit(400), 1000),
                "key not existed",
            )
        })

        it("force error, timestamp should be larger", async () => {
            await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(400), 1000)
            await expectRevert(
                PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(400), 999, 101),
                "incorrect timestamp",
            )
        })

        it("force error, timestamp can't be the same", async () => {
            await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(400), 1000)
            await expectRevert(
                PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(400), 1000),
                "incorrect timestamp",
            )
        })
    })

    describe("twap", () => {
        beforeEach(async () => {
            await PriceFeedL2.addAggregator(toBytes32("ETH"))
            await PriceFeedL2.mockSetMsgSender(addresses[1])

            const currentTime = await PriceFeedL2.mock_getCurrentTimestamp()
            await PriceFeedL2.mock_setBlockTimestamp(currentTime.addn(15))
            await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(400), currentTime.addn(15))
            await PriceFeedL2.mock_setBlockTimestamp(currentTime.addn(30))
            await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(405), currentTime.addn(30))
            await PriceFeedL2.mock_setBlockTimestamp(currentTime.addn(45))
            await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(410), currentTime.addn(45))
            await PriceFeedL2.mock_setBlockTimestamp(currentTime.addn(60))
        })

        // aggregator's answer
        // timestamp(base + 0)  : 400
        // timestamp(base + 15) : 405
        // timestamp(base + 30) : 410
        // now = base + 45
        //
        //  --+------+-----+-----+-----+-----+-----+
        //          base                          now

        it("twap price", async () => {
            const price = await PriceFeedL2.getTwapPrice(toBytes32("ETH"), 45)
            expect(price).to.eq(toFullDigit(405))
        })

        it("asking interval more than aggregator has", async () => {
            const price = await PriceFeedL2.getTwapPrice(toBytes32("ETH"), 46)
            expect(price).to.eq(toFullDigit(405))
        })

        it("asking interval less than aggregator has", async () => {
            const price = await PriceFeedL2.getTwapPrice(toBytes32("ETH"), 44)
            expect(price).to.eq("405113636363636363636")
        })

        it("given variant price period", async () => {
            const currentTime = await PriceFeedL2.mock_getCurrentTimestamp()
            await PriceFeedL2.mock_setBlockTimestamp(currentTime.addn(30))
            await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(420), currentTime.addn(30))
            await PriceFeedL2.mock_setBlockTimestamp(currentTime.addn(50))

            // twap price should be (400 * 15) + (405 * 15) + (410 * 45) + (420 * 20) / 95 = 409.74
            const price = await PriceFeedL2.getTwapPrice(toBytes32("ETH"), 95)
            expect(price).to.eq("409736842105263157894")
        })

        it("latest price update time is earlier than the request, return the latest price", async () => {
            const currentTime = await PriceFeedL2.mock_getCurrentTimestamp()
            await PriceFeedL2.mock_setBlockTimestamp(currentTime.addn(100))

            // latest update time is base + 30, but now is base + 145 and asking for (now - 45)
            // should return the latest price directly
            const price = await PriceFeedL2.getTwapPrice(toBytes32("ETH"), 45)
            expect(price).to.eq(toFullDigit(410))
        })

        it("get 0 while interval is zero", async () => {
            await expectRevert(PriceFeedL2.getTwapPrice(toBytes32("ETH"), 0), "interval can't be 0")
        })
    })

    describe("getPreviousPrice/getPreviousTimestamp", () => {
        let baseTimestamp: BN
        beforeEach(async () => {
            await PriceFeedL2.addAggregator(toBytes32("ETH"))
            await PriceFeedL2.mockSetMsgSender(addresses[1])

            const currentTime = await PriceFeedL2.mock_getCurrentTimestamp()
            baseTimestamp = currentTime
            await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(400), currentTime.addn(15))
            await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(405), currentTime.addn(30))
            await PriceFeedL2.setLatestData(toBytes32("ETH"), toFullDigit(410), currentTime.addn(45))
            await PriceFeedL2.mock_setBlockTimestamp(currentTime.addn(60))
        })

        it("get previous price (latest)", async () => {
            const price = await PriceFeedL2.getPreviousPrice(toBytes32("ETH"), 0)
            expect(price).to.eq(toFullDigit(410))
            const timestamp = await PriceFeedL2.getPreviousTimestamp(toBytes32("ETH"), 0)
            expect(timestamp).to.eq(baseTimestamp.addn(45))
        })

        it("get previous price", async () => {
            const price = await PriceFeedL2.getPreviousPrice(toBytes32("ETH"), 2)
            expect(price).to.eq(toFullDigit(400))
            const timestamp = await PriceFeedL2.getPreviousTimestamp(toBytes32("ETH"), 2)
            expect(timestamp).to.eq(baseTimestamp.addn(15))
        })

        it("force error, get previous price", async () => {
            await expectRevert(PriceFeedL2.getPreviousPrice(toBytes32("ETH"), 3), "Not enough history")
            await expectRevert(PriceFeedL2.getPreviousTimestamp(toBytes32("ETH"), 3), "Not enough history")
        })
    })
})
