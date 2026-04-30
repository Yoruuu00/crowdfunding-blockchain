const hre = require("hardhat");

async function main() {
  console.log("Deploying CrowdfundingContract...");

  const CrowdfundingContract = await hre.ethers.getContractFactory(
    "CrowdfundingContract"
  );

  const contract = await CrowdfundingContract.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("Contract deployed to:", address);
  console.log("Simpan address ini! Kasih ke Orang 2 dan 3.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });