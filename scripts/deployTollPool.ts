import { ethers, upgrades } from "hardhat";

async function getImplementation(proxyAddr: string) {
		const proxyAdmin = await upgrades.admin.getInstance();

		return proxyAdmin.getProxyImplementation(proxyAddr)
}

async function main() {
		const tollPool = await ethers.getContractFactory("TollPool");
		const TollPool = await upgrades.deployProxy(tollPool, {initializer : "initialize" });
		await TollPool.deployed();

		const impAddr = await getImplementation(TollPool.address);

		console.log("FeePool deployed to: Proxy=> ",TollPool.address, "Implementation=>", impAddr);
}

main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
});