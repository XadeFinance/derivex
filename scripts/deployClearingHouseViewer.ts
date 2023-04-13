import { ethers } from "hardhat";
import * as Addresses from "../deployedAdd.json";

async function main() {
    const clearingHouseViewer = await ethers.getContractFactory("ClearingHouseViewer");
    const ClearingHouseViewer = await clearingHouseViewer.deploy(Addresses.ClearingHouseProxy);

    await ClearingHouseViewer.deployed();

    console.log(ClearingHouseViewer.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
