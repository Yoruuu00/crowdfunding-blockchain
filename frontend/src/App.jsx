import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS } from "./contracts/contractAddress";
import CrowdfundingContract from "./contracts/CrowdfundingContract.json";

function App() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDuration, setNewDuration] = useState("");

  // Investment State per campaign
  const [investAmounts, setInvestAmounts] = useState({});

  // Show status toasts
  const showToast = useCallback((title, msg, type = "info") => {
    setToast({ title, msg, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Format address for UI
  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Format index string (e.g. 1 -> #001)
  const formatIndex = (index) => {
    return `#${String(index + 1).padStart(3, "0")}`;
  };

  // Connect MetaMask Wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      showToast("METAMASK NOT FOUND", "Please install MetaMask extension in your browser.", "error");
      return;
    }
    try {
      setLoading(true);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(accounts[0]);
      setBalance(ethers.formatEther(bal));
      
      showToast("WALLET CONNECTED", `Account: ${formatAddress(accounts[0])}`, "success");
      loadCampaigns();
    } catch (error) {
      console.error(error);
      showToast("CONNECTION FAILED", error.message || "Failed to connect wallet.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Load campaigns from contract
  const loadCampaigns = useCallback(async () => {
    try {
      const provider = window.ethereum 
        ? new ethers.BrowserProvider(window.ethereum)
        : new ethers.JsonRpcProvider("http://127.0.0.1:8545");

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingContract.abi, provider);
      
      const list = await contract.semuaCampaign();
      
      const formattedList = list.map((c) => ({
        id: Number(c.id),
        judul: c.judul,
        deskripsi: c.deskripsi,
        pemilik: c.pemilik,
        targetDana: ethers.formatEther(c.targetDana),
        danaTerkumpul: ethers.formatEther(c.danaTerkumpul),
        deadline: Number(c.deadline),
        aktif: c.aktif,
      }));
      
      setCampaigns(formattedList);
    } catch (error) {
      console.error("Error loading campaigns:", error);
    }
  }, []);

  // Handle account & network changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const provider = new ethers.BrowserProvider(window.ethereum);
          provider.getBalance(accounts[0]).then((bal) => {
            setBalance(ethers.formatEther(bal));
          });
        } else {
          setAccount("");
          setBalance("0");
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }

    loadCampaigns();
  }, [loadCampaigns]);

  // Create a new campaign
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!account) {
      showToast("WALLET REQUIRED", "Please connect your wallet first.", "error");
      return;
    }

    if (!newTitle || !newDescription || !newTarget || !newDuration) {
      showToast("VALIDATION ERROR", "Please fill in all input fields.", "error");
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingContract.abi, signer);

      const targetInWei = ethers.parseEther(newTarget);
      const durationInDays = BigInt(newDuration);

      const tx = await contract.buatCampaign(newTitle, newDescription, targetInWei, durationInDays);
      showToast("TX SUBMITTED", "Deploying record to local ledger... please wait.", "info");
      
      await tx.wait();
      
      showToast("LEDGER UPDATED", "Campaign record written to blockchain successfully.", "success");
      
      // Clear inputs
      setNewTitle("");
      setNewDescription("");
      setNewTarget("");
      setNewDuration("");
      
      // Refresh
      loadCampaigns();
      const bal = await provider.getBalance(account);
      setBalance(ethers.formatEther(bal));
    } catch (error) {
      console.error(error);
      showToast("TX REVERTED", error.reason || error.message || "Failed to create campaign.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Invest/Contribute to a campaign
  const handleInvest = async (campaignId) => {
    if (!account) {
      showToast("WALLET REQUIRED", "Please connect your wallet first.", "error");
      return;
    }

    const amount = investAmounts[campaignId];
    if (!amount || parseFloat(amount) <= 0) {
      showToast("INVALID VALUE", "Please specify a positive ETH value.", "error");
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingContract.abi, signer);

      const amountInWei = ethers.parseEther(amount);

      const tx = await contract.investasi(campaignId, { value: amountInWei });
      showToast("TX SUBMITTED", "Broadcasting asset contribution...", "info");
      
      await tx.wait();
      
      showToast("LEDGER UPDATED", "Investment contribution finalized.", "success");
      
      // Clear amount
      setInvestAmounts(prev => ({ ...prev, [campaignId]: "" }));
      
      // Refresh
      loadCampaigns();
      const bal = await provider.getBalance(account);
      setBalance(ethers.formatEther(bal));
    } catch (error) {
      console.error(error);
      showToast("TX REVERTED", error.reason || error.message || "Transaction reverted.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Withdraw funds from a completed campaign
  const handleWithdraw = async (campaignId) => {
    if (!account) {
      showToast("WALLET REQUIRED", "Please connect your wallet first.", "error");
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingContract.abi, signer);

      const tx = await contract.tarikDana(campaignId);
      showToast("TX SUBMITTED", "Broadcasting withdrawal instruction...", "info");
      
      await tx.wait();
      
      showToast("LEDGER UPDATED", "Funds transferred to campaign owner account.", "success");
      
      loadCampaigns();
      const bal = await provider.getBalance(account);
      setBalance(ethers.formatEther(bal));
    } catch (error) {
      console.error(error);
      showToast("TX REVERTED", error.reason || error.message || "Transaction reverted.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInvestAmountChange = (campaignId, val) => {
    setInvestAmounts(prev => ({ ...prev, [campaignId]: val }));
  };

  return (
    <div className="grid-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`alert-toast toast-${toast.type}`}>
          <div className="toast-title">{toast.title}</div>
          <div className="toast-msg">{toast.msg}</div>
        </div>
      )}

      {/* Header */}
      <header>
        <div className="logo-section">
          <span className="logo-icon">CF</span>
          <span className="logo-text">CHAINFUND</span>
        </div>

        {account ? (
          <div className="wallet-badge">
            <span className="wallet-indicator"></span>
            <span>{formatAddress(account)}</span>
            <span style={{ color: "var(--text-muted)", marginLeft: "0.25rem" }}>
              [{parseFloat(balance).toFixed(4)} ETH]
            </span>
          </div>
        ) : (
          <button className="btn-connect" onClick={connectWallet} disabled={loading}>
            {loading ? <div className="loading-spinner"></div> : "[ CONNECT WALLET ]"}
          </button>
        )}
      </header>

      {/* Ledger Statistics Banner */}
      <section className="stats-banner">
        <div className="stat-card">
          <span className="stat-label">01 / TOTAL RECORDED</span>
          <span className="stat-value">{campaigns.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">02 / ACTIVE CAMPAIGNS</span>
          <span className="stat-value">
            {campaigns.filter((c) => c.aktif && c.deadline * 1000 > Date.now()).length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">03 / CUMULATIVE VALUE</span>
          <span className="stat-value">
            {campaigns.reduce((acc, c) => acc + parseFloat(c.danaTerkumpul), 0).toFixed(3)} ETH
          </span>
        </div>
      </section>

      {/* Main layout */}
      <main className="main-layout">
        {/* Left Side: Ledger/Active Entries */}
        <section className="panel-left">
          <h2 className="panel-title">
            <span className="number">INDEX</span> LEDGER ENTRIES
          </h2>
          
          {campaigns.length === 0 ? (
            <div className="empty-state">
              <h3>NO ENTRIES DETECTED</h3>
              <p>THE LEDGER IS EMPTY. INITIATE A NEW CROWDFUNDING ENTRY FROM THE CONTROL PANEL TO BEGIN RECORDING METRICS.</p>
            </div>
          ) : (
            <div className="campaign-grid">
              {campaigns.map((c, index) => {
                const isDeadlinePassed = c.deadline * 1000 < Date.now();
                const isCompleted = parseFloat(c.danaTerkumpul) >= parseFloat(c.targetDana);
                const progressPercentage = Math.min(
                  ((parseFloat(c.danaTerkumpul) / parseFloat(c.targetDana)) * 100),
                  100
                );
                const dateObj = new Date(c.deadline * 1000);
                const isUserOwner = account && account.toLowerCase() === c.pemilik.toLowerCase();

                return (
                  <div className="campaign-card" key={c.id}>
                    <div className="campaign-meta-line">
                      <span className="campaign-index">{formatIndex(index)}</span>
                      <span className={`campaign-status ${c.aktif && !isDeadlinePassed ? "status-active" : "status-closed"}`}>
                        {c.aktif && !isDeadlinePassed ? "active" : "closed"}
                      </span>
                    </div>

                    <div className="campaign-title-row">
                      <h3 className="campaign-title">{c.judul}</h3>
                    </div>

                    <p className="campaign-desc">{c.deskripsi}</p>

                    <div className="owner-row">
                      <span className="label">ORIGIN:</span>
                      <span title={c.pemilik}>{isUserOwner ? "[YOU]" : c.pemilik}</span>
                    </div>

                    {/* Monospace Progress */}
                    <div className="progress-container">
                      <div className="progress-text">
                        <span>LEDGER METRIC PROGRESS</span>
                        <span>{progressPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="progress-track">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Metadata Table */}
                    <div className="ledger-details">
                      <div className="ledger-cell">
                        <span className="ledger-cell-label">COLLECTED VALUE</span>
                        <span className="ledger-cell-value">{c.danaTerkumpul} ETH</span>
                      </div>
                      <div className="ledger-cell">
                        <span className="ledger-cell-label">TARGET REQUIREMENT</span>
                        <span className="ledger-cell-value">{c.targetDana} ETH</span>
                      </div>
                      <div className="ledger-cell">
                        <span className="ledger-cell-label">LEDGER CLOSURE</span>
                        <span className="ledger-cell-value">{dateObj.toLocaleDateString()}</span>
                      </div>
                      <div className="ledger-cell">
                        <span className="ledger-cell-label">STATUS CODE</span>
                        <span className="ledger-cell-value">{c.aktif ? "0x01 / ACTIVE" : "0x00 / TERMINATED"}</span>
                      </div>
                    </div>

                    {/* Owner Withdrawal Notification / Button */}
                    {isUserOwner && c.aktif && isCompleted && (
                      <div className="action-box">
                        <div className="action-box-text">TARGET CRITERIA MET. UNLOCKED FOR SETTLEMENT.</div>
                        <button 
                          className="btn-action" 
                          onClick={() => handleWithdraw(c.id)}
                          disabled={loading}
                        >
                          {loading ? "PENDING..." : "SETTLE FUNDS"}
                        </button>
                      </div>
                    )}

                    {/* Investment Forms */}
                    {c.aktif && !isDeadlinePassed && (
                      <div className="contribution-row">
                        <div className="input-mono-wrapper">
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            placeholder="0.10" 
                            className="form-input"
                            value={investAmounts[c.id] || ""}
                            onChange={(e) => handleInvestAmountChange(c.id, e.target.value)}
                            disabled={loading}
                          />
                          <span className="input-suffix">ETH</span>
                        </div>
                        <button 
                          className="btn-secondary"
                          onClick={() => handleInvest(c.id)}
                          disabled={loading}
                        >
                          CONTRIBUTE
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Side: Ledger Registry Inputs */}
        <section className="panel-right">
          <h2 className="panel-title">
            <span className="number">REG</span> INITIALIZE ENTRY
          </h2>
          
          <form onSubmit={handleCreateCampaign}>
            <div className="form-group">
              <label className="form-label">ENTRY IDENTIFIER / TITLE</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="PROPOSAL IDENTIFIER"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">LEDGER MEMORANDUM / DESCRIPTION</label>
              <textarea 
                className="form-input" 
                placeholder="DETAILED INSTRUCTIONS AND PARAMETERS..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">FUNDING LIMIT (ETH)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0.001" 
                className="form-input" 
                placeholder="1.00"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">REGISTRY LIFESPAN (DAYS)</label>
              <input 
                type="number" 
                min="1" 
                className="form-input" 
                placeholder="30"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <div className="loading-spinner"></div> : "PUBLISH ENTRY TO LEDGER"}
            </button>
          </form>
        </section>
      </main>

      {/* Bottom stamp */}
      <footer className="legal-notice">
        CHAINFUND DECENTRALIZED PROTOCOL // VERSION 1.0.0 // LOCAL HOST NETWORK
      </footer>
    </div>
  );
}

export default App;
