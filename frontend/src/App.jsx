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

  // Connect MetaMask Wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      showToast("MetaMask Not Found", "Please install MetaMask extension in your browser.", "error");
      return;
    }
    try {
      setLoading(true);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(accounts[0]);
      setBalance(ethers.formatEther(bal));
      
      showToast("Wallet Connected", `Successfully connected to ${formatAddress(accounts[0])}`, "success");
      loadCampaigns();
    } catch (error) {
      console.error(error);
      showToast("Connection Failed", error.message || "Failed to connect wallet.", "error");
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
  }, [showToast]);

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
      showToast("Wallet Required", "Please connect your wallet first.", "error");
      return;
    }

    if (!newTitle || !newDescription || !newTarget || !newDuration) {
      showToast("Validation Error", "Please fill in all input fields.", "error");
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
      showToast("Transaction Sent", "Creating campaign... please wait.", "info");
      
      await tx.wait();
      
      showToast("Campaign Created", "Your crowdfunding campaign has been launched successfully!", "success");
      
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
      showToast("Launch Failed", error.reason || error.message || "Failed to create campaign.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Invest/Contribute to a campaign
  const handleInvest = async (campaignId) => {
    if (!account) {
      showToast("Wallet Required", "Please connect your wallet first.", "error");
      return;
    }

    const amount = investAmounts[campaignId];
    if (!amount || parseFloat(amount) <= 0) {
      showToast("Invalid Amount", "Please specify a positive ETH amount.", "error");
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingContract.abi, signer);

      const amountInWei = ethers.parseEther(amount);

      const tx = await contract.investasi(campaignId, { value: amountInWei });
      showToast("Transaction Sent", "Processing investment contribution...", "info");
      
      await tx.wait();
      
      showToast("Contribution Successful", "Thank you for supporting this project!", "success");
      
      // Clear amount
      setInvestAmounts(prev => ({ ...prev, [campaignId]: "" }));
      
      // Refresh
      loadCampaigns();
      const bal = await provider.getBalance(account);
      setBalance(ethers.formatEther(bal));
    } catch (error) {
      console.error(error);
      showToast("Investment Failed", error.reason || error.message || "Transaction reverted.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Withdraw funds from a completed campaign
  const handleWithdraw = async (campaignId) => {
    if (!account) {
      showToast("Wallet Required", "Please connect your wallet first.", "error");
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingContract.abi, signer);

      const tx = await contract.tarikDana(campaignId);
      showToast("Transaction Sent", "Withdrawing funds to your wallet...", "info");
      
      await tx.wait();
      
      showToast("Withdrawal Successful", "Funds successfully transferred to your wallet!", "success");
      
      loadCampaigns();
      const bal = await provider.getBalance(account);
      setBalance(ethers.formatEther(bal));
    } catch (error) {
      console.error(error);
      showToast("Withdrawal Failed", error.reason || error.message || "Transaction reverted.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Helper to handle input change for investment amount
  const handleInvestAmountChange = (campaignId, val) => {
    setInvestAmounts(prev => ({ ...prev, [campaignId]: val }));
  };

  return (
    <div className="app-container">
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
          <span className="logo-icon">🌱</span>
          <span className="logo-text">ChainFund</span>
        </div>

        {account ? (
          <div className="wallet-badge">
            <span className="wallet-indicator"></span>
            <span>{formatAddress(account)}</span>
            <span style={{ color: "var(--text-muted)", marginLeft: "0.25rem" }}>
              ({parseFloat(balance).toFixed(4)} ETH)
            </span>
          </div>
        ) : (
          <button className="btn-connect" onClick={connectWallet} disabled={loading}>
            {loading ? <div className="loading-spinner" style={{ width: "16px", height: "16px" }}></div> : "Connect MetaMask"}
          </button>
        )}
      </header>

      {/* Dashboard Stats */}
      <section className="stats-banner">
        <div className="stat-card">
          <span className="stat-label">Total Campaigns</span>
          <span className="stat-value">{campaigns.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Campaigns</span>
          <span className="stat-value">
            {campaigns.filter((c) => c.aktif && c.deadline * 1000 > Date.now()).length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Funded Value</span>
          <span className="stat-value">
            {campaigns.reduce((acc, c) => acc + parseFloat(c.danaTerkumpul), 0).toFixed(3)} ETH
          </span>
        </div>
      </section>

      {/* Main layout */}
      <main className="main-layout">
        {/* Left Side: Campaign Lists */}
        <section>
          <h2 className="panel-title" style={{ marginBottom: "1.5rem" }}>
            📢 Active Crowdfunding Campaigns
          </h2>
          
          {campaigns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <h3>No Campaigns Created Yet</h3>
              <p>Be the first one to pitch an idea and raise funds on the blockchain!</p>
            </div>
          ) : (
            <div className="campaign-grid">
              {campaigns.map((c) => {
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
                    <div className="campaign-header">
                      <h3 className="campaign-title">{c.judul}</h3>
                      <span className={`campaign-badge ${c.aktif && !isDeadlinePassed ? "badge-active" : "badge-ended"}`}>
                        {c.aktif && !isDeadlinePassed ? "Active" : "Closed"}
                      </span>
                    </div>

                    <p className="campaign-desc">{c.deskripsi}</p>

                    <div className="owner-pill">
                      <span>Owner:</span>
                      <span className="owner-address" title={c.pemilik}>
                        {isUserOwner ? "You" : formatAddress(c.pemilik)}
                      </span>
                    </div>

                    <div className="campaign-progress-bar">
                      <div 
                        className="campaign-progress-fill" 
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>

                    <div className="campaign-details-grid">
                      <div className="detail-item">
                        <span className="detail-label">Progress</span>
                        <span className="detail-val">{progressPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Collected</span>
                        <span className="detail-val">{c.danaTerkumpul} ETH</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Target Goal</span>
                        <span className="detail-val">{c.targetDana} ETH</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Deadline</span>
                        <span className="detail-val" style={{ fontSize: "0.95rem" }}>
                          {dateObj.toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Owner Withdraw Panel */}
                    {isUserOwner && c.aktif && isCompleted && (
                      <div style={{ marginTop: "1rem" }}>
                        <button 
                          className="btn-withdraw" 
                          onClick={() => handleWithdraw(c.id)}
                          disabled={loading}
                        >
                          {loading ? "Processing..." : "Withdraw Target Funds"}
                        </button>
                      </div>
                    )}

                    {/* Contribution Input (only for active, not closed) */}
                    {c.aktif && !isDeadlinePassed && (
                      <div className="contribution-form" style={{ marginTop: "1.25rem" }}>
                        <div className="input-eth-wrapper">
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            placeholder="0.1" 
                            className="form-input"
                            value={investAmounts[c.id] || ""}
                            onChange={(e) => handleInvestAmountChange(c.id, e.target.value)}
                            disabled={loading}
                          />
                          <span className="eth-suffix">ETH</span>
                        </div>
                        <button 
                          className="btn-invest"
                          onClick={() => handleInvest(c.id)}
                          disabled={loading}
                        >
                          Invest
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Side: Create Campaign Form */}
        <section>
          <div className="glass-panel">
            <h2 className="panel-title">🌱 Start a New Campaign</h2>
            
            <form onSubmit={handleCreateCampaign}>
              <div className="form-group">
                <label className="form-label">Campaign Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Build Solar Powered Water Well"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-input" 
                  placeholder="Explain what your project is about and how funds will be used..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Funding (ETH)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0.001" 
                  className="form-input" 
                  placeholder="0.5"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Campaign Duration (Days)</label>
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
                {loading ? <div className="loading-spinner" style={{ width: "20px", height: "20px" }}></div> : "Deploy to Blockchain"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
