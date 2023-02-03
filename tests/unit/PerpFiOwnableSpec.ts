import { artifacts, web3 } from "hardhat"
import { expect } from "chai"
import { expectEvent, expectRevert } from "@openzeppelin/test-helpers"
import { XadeOwnableUpgradeFakeContract, XadeOwnableUpgradeFakeInstance } from "../../types/truffle-contracts"

const XadeOwnableUpgradeFake = artifacts.require("XadeOwnableUpgradeFake") as XadeOwnableUpgradeFakeContract

describe("XadeOwnableUpgrade UT", () => {
    let XadeOwnable: XadeOwnableUpgradeFakeInstance

    let addresses: string[]
    let admin: string
    let alice: string

    beforeEach(async () => {
        addresses = await web3.eth.getAccounts()
        admin = addresses[0]
        alice = addresses[1]
        XadeOwnable = (await XadeOwnableUpgradeFake.new()) as XadeOwnableUpgradeFakeInstance
        await XadeOwnable.initialize()
    })

    it("transfer ownership", async () => {
        await XadeOwnable.setOwner(alice)
        const r = await XadeOwnable.updateOwner({ from: alice })
        expectEvent.inTransaction(r.tx, XadeOwnable, "OwnershipTransferred", {
            previousOwner: admin,
            newOwner: alice,
        })
    })

    it("transfer ownership and set owner to another", async () => {
        await XadeOwnable.setOwner(alice)
        const r = await XadeOwnable.updateOwner({ from: alice })
        expectEvent.inTransaction(r.tx, XadeOwnable, "OwnershipTransferred")

        // only owner can set owner, now owner is alice
        await XadeOwnable.setOwner(admin, { from: alice })
        expect(await XadeOwnable.candidate()).eq(admin)
    })

    it("force error, only owner can call setOwner", async () => {
        await expectRevert(
            XadeOwnable.setOwner(alice, { from: alice }),
            "XadeOwnableUpgrade: caller is not the owner",
        )
    })

    it("force error set current owner", async () => {
        await expectRevert(XadeOwnable.setOwner(admin), "XadeOwnableUpgrade: same as original")
    })

    it("force error, update owner but caller not the new owner", async () => {
        await XadeOwnable.setOwner(alice)
        await expectRevert(XadeOwnable.updateOwner({ from: admin }), "XadeOwnableUpgrade: not the new owner")
    })

    it("force error, update owner without set a new owner first", async () => {
        await expectRevert(
            XadeOwnable.updateOwner({ from: admin }),
            "XadeOwnableUpgrade: candidate is zero address",
        )
    })

    it("force error, can not update twice", async () => {
        await XadeOwnable.setOwner(alice)
        const r = await XadeOwnable.updateOwner({ from: alice })
        expectEvent.inTransaction(r.tx, XadeOwnable, "OwnershipTransferred")
        await expectRevert(
            XadeOwnable.updateOwner({ from: alice }),
            "XadeOwnableUpgrade: candidate is zero address",
        )
    })
})
