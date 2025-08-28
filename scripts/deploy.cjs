const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const LazaiDAT = await hre.ethers.getContractFactory("LazaiDAT");
  const lazaiDAT = await LazaiDAT.deploy(deployer.address);

  await lazaiDAT.waitForDeployment();

  const contractAddress = await lazaiDAT.getAddress();
  console.log(`LazaiDAT contract deployed to: ${contractAddress}`);

  // Save the contract's address to .env and ABI to the src folder
  const contractsDir = __dirname + "/../src";
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  // Save the ABI
  const artifact = hre.artifacts.readArtifactSync("LazaiDAT");
  fs.writeFileSync(
    contractsDir + "/lazaiDAT.json",
    JSON.stringify(artifact, null, 2)
  );

  // Update the .env file
  const envPath = __dirname + "/../.env";
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  const lines = envContent.split("\n");
  const key = "VITE_CONTRACT_ADDRESS";
  let keyFound = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(key + "=")) {
      lines[i] = `${key}=${contractAddress}`;
      keyFound = true;
      break;
    }
  }

  if (!keyFound) {
    lines.push(`${key}=${contractAddress}`);
  }

  fs.writeFileSync(envPath, lines.join("\n"));

  console.log(`Contract address saved to ${envPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
