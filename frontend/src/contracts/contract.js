import { ethers } from "ethers";
import { CONTRACT_ADDRESS } from "./contractAddress";
import CrowdfundingContract from "./CrowdfundingContract.json";

// Fallback JSON-RPC provider pointing to the local Hardhat node
export const getJsonRpcProvider = () => {
  return new ethers.JsonRpcProvider("http://127.0.0.1:8545");
};

// Browser Provider (MetaMask)
export const getBrowserProvider = () => {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
};

// Get read-only contract instance.
// Fallback to local JsonRpcProvider if MetaMask is not present, allowing users to view campaigns even without a wallet.
export const getReadOnlyContract = () => {
  const provider = getBrowserProvider() || getJsonRpcProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingContract.abi, provider);
};

// Get write contract instance associated with the active signer
export const getWriteContract = async () => {
  const provider = getBrowserProvider();
  if (!provider) {
    throw new Error("MetaMask is not installed or available.");
  }
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingContract.abi, signer);
};

// Utility to fetch basic provider/signer properties
export const getWeb3Details = async () => {
  const provider = getBrowserProvider();
  if (!provider) return { account: null, balance: "0", provider: null, signer: null };

  try {
    const accounts = await provider.send("eth_accounts", []);
    if (accounts.length === 0) {
      return { account: null, balance: "0", provider, signer: null };
    }
    const signer = await provider.getSigner();
    const balanceWei = await provider.getBalance(accounts[0]);
    return {
      account: accounts[0],
      balance: ethers.formatEther(balanceWei),
      provider,
      signer,
    };
  } catch (error) {
    console.error("Error fetching Web3 details:", error);
    return { account: null, balance: "0", provider, signer: null };
  }
};
