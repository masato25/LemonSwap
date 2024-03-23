const hre = require("hardhat");
const { Signer, Wallet } = require('ethers');

async function main() {
  try {
    const accounts = await hre.ethers.getSigners();

    // const mainAccount = await ethers.getImpersonatedSigner(process.env.ETH_PRIVATE_KEY);
    const provider = hre.ethers.provider;
    const signer_wallet = new Wallet(process.env.ETH_PRIVATE_KEY);
    const mainAccount = await signer_wallet.connect(provider);
    // Get the ContractFactory of your LemonSwap
    const LemonSwap = await hre.ethers.getContractFactory("LemonSwap");

    // Deploy the contract
    const contract = await LemonSwap.deploy();
    

    // Wait for the deployment transaction to be mined
    await contract.waitForDeployment();
    const contractAddr = await contract.getAddress();
    console.log(`LemonSwap deployed to: ${await contractAddr}`);
    const contractInstance = LemonSwap.attach(contractAddr);
    await contractInstance.init("0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000");

    const ARBToken = await hre.ethers.getContractAt("IERC20", "0x912CE59144191C1204E64559FE8253a0e49E6548");

    const uniPoolAddr = "0x81c48d31365e6b526f6bbadc5c9aafd822134863";
    const IUniswapV3Pool = await hre.ethers.getContractAt("IUniswapV3Pool", uniPoolAddr);
    const prices = await IUniswapV3Pool.slot0();
    const tickSpacing = await IUniswapV3Pool.tickSpacing();
    const tick = prices.tick;
    console.log(`IUniswapV3Pool slot0: ${tick}, tickSpacing: ${tickSpacing}`);
    let ticketUpper = tick - (tick % tickSpacing) + (tickSpacing * BigInt(2));
    let ticketLower = tick - (tick % tickSpacing) + tickSpacing;
    console.log(`tickerUpper: ${ticketUpper} tickerLower: ${ticketLower}`);
    const balanceAmount = await ARBToken.balanceOf(mainAccount.address);
    console.log(accounts[1], balanceAmount);
    const tx = await ARBToken.connect(mainAccount).approve(contractAddr, balanceAmount);
    const receipt = await tx.wait();
    // console.log(receipt.logs);
    console.log(await ARBToken.allowance(mainAccount.address, contractAddr));
    await contractInstance.connect(mainAccount).openPosition([uniPoolAddr, true, balanceAmount, ticketUpper, ticketLower]);
    console.log(await ARBToken.balanceOf(mainAccount.address));
    const positionId = await contractInstance.connect(mainAccount).userPositionIds(mainAccount.address, 0);
    await contractInstance.connect(mainAccount).closePosition(positionId);
    // await contractInstance.closePosition(positionId);
    console.log(await ARBToken.balanceOf(mainAccount.address));
    console.log(await contractInstance.totalPositions());
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();