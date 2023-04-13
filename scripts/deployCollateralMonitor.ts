import { ethers, upgrades } from "hardhat";

async function getImplementation(proxyAddr: string) {
  const proxyAdmin = await upgrades.admin.getInstance();

  return proxyAdmin.getProxyImplementation(proxyAddr)
}

async function main() {
    const collateralMonitor = await ethers.getContractFactory("CollateralMonitor");
    console.log("Deploying CollateralMonitor...");
    const CollateralMonitor = await upgrades.deployProxy(collateralMonitor, ["0x602969FFAddA7d74f5da69B817688E984Ba4EBbD"],{initializer : "initialize" });
    await CollateralMonitor.deployed();

    const impAddr = await getImplementation(CollateralMonitor.address);

    console.log(`PendingPool deployed to => Proxy: ${CollateralMonitor.address}, implementation: ${impAddr}`);

    return CollateralMonitor.address
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
