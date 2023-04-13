import { BigNumber } from "ethers/lib/ethers";
import { ethers, upgrades } from "hardhat";
import * as Addresses from  "../deployedAdd.json";

async function getImplementation(proxyAddr: string) {
    const proxyAdmin = await upgrades.admin.getInstance();

    return proxyAdmin.getProxyImplementation(proxyAddr)
}

const Default_digits = BigNumber.from(10).pow(18);
const initMarginRatio = BigNumber.from(10).mul(Default_digits).div(100);
const maintenanceMarginRatio = BigNumber.from(625).mul(Default_digits).div(10000);
const liquidationFeeRatio = BigNumber.from(125).mul(Default_digits).div(10000);

async function main(){
    const clearinghouse = await ethers.getContractFactory("ClearingHouse");

    const ClearingHouse = await upgrades.deployProxy(clearinghouse, [initMarginRatio, maintenanceMarginRatio, liquidationFeeRatio, Addresses.InsuranceFundProxy, Addresses.TollPoolProxy], {initializer : "initialize" });

    await ClearingHouse.deployed();

    const impAddr = await getImplementation(ClearingHouse.address);

    console.log("Implementation address: ", impAddr);
    console.log("Proxy address: ",ClearingHouse.address);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });