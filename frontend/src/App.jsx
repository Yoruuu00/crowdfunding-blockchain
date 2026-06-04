import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { 
  getReadOnlyContract, 
  getWriteContract, 
  getWeb3Details 
} from "./contracts/contract";
import CreateCampaign from "./components/CreateCampaign";
import WithdrawPanel from "./components/WithdrawPanel";
import MyPortfolio from "./components/MyPortfolio";
import CampaignUpdates from "./components/CampaignUpdates";

function App() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [currentTab, setCurrentTab] = useState("ledger");
  const [investAmounts, setInvestAmounts] = useState({});

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [sortOption, setSortOption] = useState("NEWEST");

  const STATUS_MAP = ["ACTIVE", "FUNDED", "FAILED", "COMPLETED", "CANCELED"];

  const showToast = useCallback((title, msg, type = "info") => {
    setToast({ title, msg, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatIndex = (index) => {
    return `#${String(index + 1).padStart(3, "0")}`;
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      showToast("METAMASK NOT FOUND", "Please install MetaMask extension in your browser.", "error");
      return;
    }
    try {
      setLoading(true);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length > 0) {
        const details = await getWeb3Details();
        setAccount(details.account || accounts[0]);
        setBalance(details.balance);
        showToast("WALLET CONNECTED", `Account: ${formatAddress(accounts[0])}`, "success");
        loadCampaigns();
      }
    } catch (error) {
      console.error(error);
      showToast("CONNECTION FAILED", error.message || "Failed to connect wallet.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = useCallback(async () => {
    try {
      const contract = getReadOnlyContract();
      const totalCampaigns = await contract.jumlahCampaign();
      
      if (totalCampaigns > 0) {
        const list = await contract.getCampaigns(0, totalCampaigns);
        
        // Membutuhkan Promise.all karena kita memanggil kontrak lagi untuk cek reputasi tiap pemilik
        const formattedList = await Promise.all(list.map(async (c) => {
          const reputasi = await contract.reputasiKreator(c.pemilik);
          
          return {
            id: Number(c.id),
            judul: c.judul,
            deskripsi: c.deskripsi,
            kategoriId: Number(c.kategoriId),
            pemilik: c.pemilik,
            targetDana: ethers.formatEther(c.targetDana),
            danaTerkumpul: ethers.formatEther(c.danaTerkumpul),
            deadline: Number(c.deadline),
            statusInt: Number(c.status), 
            statusLabel: STATUS_MAP[Number(c.status)],
            reputasi: Number(reputasi)
          };
        }));
        
        setCampaigns(formattedList);
      } else {
        setCampaigns([]);
      }
    } catch (error) {
      console.error("Error loading campaigns:", error);
    }
  }, []);

  const handleSuccess = async () => {
    loadCampaigns();
    const details = await getWeb3Details();
    setBalance(details.balance);
    setCurrentTab("ledger"); 
  };

  useEffect(() => {
    const initWeb3 = async () => {
      const details = await getWeb3Details();
      if (details.account) {
        setAccount(details.account);
        setBalance(details.balance);
      }
    };
    initWeb3();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", async (accounts) => {
        if (accounts.length > 0) {
          const details = await getWeb3Details();
          setAccount(details.account || accounts[0]);
          setBalance(details.balance);
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
      const contract = await getWriteContract();
      const amountInWei = ethers.parseEther(amount);

      const tx = await contract.investasi(campaignId, { value: amountInWei });
      showToast("TX SUBMITTED", "Broadcasting asset contribution...", "info");
      await tx.wait();
      
      showToast("LEDGER UPDATED", "Investment contribution finalized.", "success");
      setInvestAmounts(prev => ({ ...prev, [campaignId]: "" }));
      loadCampaigns();
      const details = await getWeb3Details();
      setBalance(details.balance);
    } catch (error) {
      console.error(error);
      showToast("TX REVERTED", error.reason || error.message || "Transaction reverted.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (campaignId) => {
    if (!account) {
      showToast("WALLET REQUIRED", "Please connect your wallet first.", "error");
      return;
    }
    try {
      setLoading(true);
      const contract = await getWriteContract();
      const tx = await contract.tarikDana(campaignId);
      showToast("TX SUBMITTED", "Broadcasting withdrawal instruction...", "info");
      await tx.wait();
      
      showToast("LEDGER UPDATED", "Funds transferred to campaign owner account.", "success");
      loadCampaigns();
      const details = await getWeb3Details();
      setBalance(details.balance);
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

  // --- LOGIKA FILTER, PENCARIAN, DAN PENGURUTAN DATA ---
  const getProcessedCampaigns = () => {
    let processed = [...campaigns];

    if (filterCategory !== "ALL") {
      processed = processed.filter(c => c.kategoriId.toString() === filterCategory);
    }

    if (searchTerm.trim() !== "") {
      processed = processed.filter(c => 
        c.judul.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    switch (sortOption) {
      case "NEWEST":
        processed.sort((a, b) => b.id - a.id);
        break;
      case "TARGET_DESC":
        processed.sort((a, b) => parseFloat(b.targetDana) - parseFloat(a.targetDana));
        break;
      case "PROGRESS_DESC":
        processed.sort((a, b) => {
          const progA = parseFloat(a.danaTerkumpul) / parseFloat(a.targetDana);
          const progB = parseFloat(b.danaTerkumpul) / parseFloat(b.targetDana);
          return progB - progA;
        });
        break;
      default:
        break;
    }

    return processed;
  };

  const displayCampaigns = getProcessedCampaigns();

  return (
    <div className="grid-container">
      {toast && (
        <div className={`alert-toast toast-${toast.type}`}>
          <div className="toast-title">{toast.title}</div>
          <div className="toast-msg">{toast.msg}</div>
        </div>
      )}

      <header>
        <div className="logo-section">
          <span className="logo-icon">CF</span>
          <span className="logo-text">CHAINFUND</span>
        </div>

        <div className="wallet-status-panel">
          {account ? (
            <div className="wallet-status-connected">
              <span className="status-label">STATUS:</span>
              <span className="status-tag tag-connected">CONNECTED</span>
              <span className="divider">//</span>
              <span className="address-label">ACCOUNT:</span>
              <span className="address-value" title={account}>{formatAddress(account)}</span>
              <span className="divider">//</span>
              <span className="balance-value">[{parseFloat(balance).toFixed(4)} ETH]</span>
            </div>
          ) : (
            <div className="wallet-status-disconnected">
              <span className="status-label">STATUS:</span>
              <span className="status-tag tag-disconnected">DISCONNECTED</span>
              <span className="divider">//</span>
              <button className="btn-connect" onClick={connectWallet} disabled={loading}>
                {loading ? <div className="loading-spinner" style={{ display: "inline-block" }}></div> : "CONNECT WALLET"}
              </button>
            </div>
          )}
        </div>
      </header>

      <nav style={{ display: "flex", borderBottom: "2px solid #121212", backgroundColor: "#fafaf7" }}>
        <button 
          onClick={() => setCurrentTab("ledger")}
          style={{
            flex: 1, padding: "1rem", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: "700",
            background: currentTab === "ledger" ? "#121212" : "transparent",
            color: currentTab === "ledger" ? "#f8f7f4" : "#121212",
            border: "none", borderRight: "1px solid #121212", cursor: "pointer", textTransform: "uppercase"
          }}
        >
          [01 // ACTIVE LEDGER]
        </button>
        <button 
          onClick={() => setCurrentTab("portfolio")}
          style={{
            flex: 1, padding: "1rem", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: "700",
            background: currentTab === "portfolio" ? "#121212" : "transparent",
            color: currentTab === "portfolio" ? "#f8f7f4" : "#121212",
            border: "none", borderRight: "1px solid #121212", cursor: "pointer", textTransform: "uppercase"
          }}
        >
          [02 // INVESTOR PORTFOLIO]
        </button>
        <button 
          onClick={() => setCurrentTab("founder")}
          style={{
            flex: 1, padding: "1rem", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: "700",
            background: currentTab === "founder" ? "#121212" : "transparent",
            color: currentTab === "founder" ? "#f8f7f4" : "#121212",
            border: "none", cursor: "pointer", textTransform: "uppercase"
          }}
        >
          [03 // FOUNDER CONTROL PANEL]
        </button>
      </nav>

      <section className="stats-banner">
        <div className="stat-card">
          <span className="stat-label">01 / TOTAL RECORDED</span>
          <span className="stat-value">{campaigns.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">02 / ACTIVE CAMPAIGNS</span>
          <span className="stat-value">
            {campaigns.filter((c) => c.statusInt === 0).length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">03 / CUMULATIVE VALUE</span>
          <span className="stat-value">
            {campaigns.reduce((acc, c) => acc + parseFloat(c.danaTerkumpul), 0).toFixed(4)} ETH
          </span>
        </div>
      </section>

      <main className="main-layout">
        <section className="panel-left">
          
          {currentTab === "ledger" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                <h2 className="panel-title" style={{ margin: 0 }}><span className="number">INDEX</span> LEDGER ENTRIES</h2>
                
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input 
                    type="text" 
                    placeholder="SEARCH TITLE..." 
                    className="form-input"
                    style={{ width: "200px", margin: 0, padding: "0.5rem" }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <select 
                    className="form-input" 
                    style={{ margin: 0, padding: "0.5rem" }}
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="ALL">ALL CATEGORIES</option>
                    <option value="0">TECHNOLOGY & IT</option>
                    <option value="1">SOCIAL & HUMANITY</option>
                    <option value="2">ENVIRONMENT</option>
                    <option value="3">BUSINESS & STARTUP</option>
                  </select>
                  <select 
                    className="form-input" 
                    style={{ margin: 0, padding: "0.5rem" }}
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                  >
                    <option value="NEWEST">SORT: NEWEST</option>
                    <option value="TARGET_DESC">SORT: HIGHEST TARGET</option>
                    <option value="PROGRESS_DESC">SORT: HIGHEST PROGRESS</option>
                  </select>
                </div>
              </div>

              {displayCampaigns.length === 0 ? (
                <div className="empty-state">
                  <h3>NO ENTRIES MATCHING CRITERIA</h3>
                  <p>THE LEDGER QUERY RETURNED ZERO RESULTS. ADJUST YOUR SEARCH OR FILTER PARAMETERS.</p>
                </div>
              ) : (
                <div className="campaign-grid">
                  {displayCampaigns.map((c, index) => {
                    const isUserOwner = account && account.toLowerCase() === c.pemilik.toLowerCase();
                    const progressPercentage = Math.min(((parseFloat(c.danaTerkumpul) / parseFloat(c.targetDana)) * 100), 100);
                    const dateObj = new Date(c.deadline * 1000);
                    const isActive = c.statusInt === 0;

                    return (
                      <div className="campaign-card" key={c.id}>
                        <div className="campaign-meta-line">
                          <span className="campaign-index">{formatIndex(c.id)}</span>
                          <span className={`campaign-status status-${c.statusLabel.toLowerCase()}`}>
                            {c.statusLabel}
                          </span>
                        </div>
                        <div className="campaign-title-row">
                          <h3 className="campaign-title">{c.judul}</h3>
                        </div>
                        <p className="campaign-desc">{c.deskripsi}</p>
                        <div className="owner-row" style={{ display: "flex", justifyContent: "space-between" }}>
                          <div>
                            <span className="label">ORIGIN:</span>
                            <span title={c.pemilik}>{isUserOwner ? "[YOU]" : c.pemilik}</span>
                          </div>
                          {/* Indikator Reputasi Kreator */}
                          <div style={{ color: c.reputasi > 0 ? "var(--accent-green)" : "var(--text-dim)", fontWeight: "bold" }}>
                            REPUTATION: {c.reputasi} SUCCESSFUL COMPLETIONS
                          </div>
                        </div>
                        <div className="progress-container">
                          <div className="progress-text">
                            <span>LEDGER METRIC PROGRESS</span>
                            <span>{progressPercentage.toFixed(1)}%</span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
                          </div>
                        </div>
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
                            <span className="ledger-cell-value">0x0{c.statusInt} / {c.statusLabel}</span>
                          </div>
                        </div>

                        {isActive && (
                          <div className="contribution-row">
                            <div className="input-mono-wrapper">
                              <input 
                                type="number" step="0.01" min="0" placeholder="0.10" className="form-input"
                                value={investAmounts[c.id] || ""}
                                onChange={(e) => handleInvestAmountChange(c.id, e.target.value)}
                                disabled={loading}
                              />
                              <span className="input-suffix">ETH</span>
                            </div>
                            <button className="btn-secondary" onClick={() => handleInvest(c.id)} disabled={loading}>
                              CONTRIBUTE
                            </button>
                          </div>
                        )}

                        {/* Implementasi Campaign Updates Panel */}
                        <CampaignUpdates 
                          campaignId={c.id} 
                          isOwner={isUserOwner} 
                          account={account} 
                          showToast={showToast} 
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {currentTab === "portfolio" && (
            <>
              <h2 className="panel-title"><span className="number">PORTFOLIO</span> INVESTOR HISTORY</h2>
              <MyPortfolio account={account} campaigns={campaigns} showToast={showToast} loadCampaigns={loadCampaigns} />
            </>
          )}

          {currentTab === "founder" && (
            <>
              <h2 className="panel-title"><span className="number">FOUNDER</span> MANAGEMENT STRIP</h2>
              <WithdrawPanel 
                account={account} 
                campaigns={campaigns} 
                handleWithdraw={handleWithdraw} 
                loading={loading} 
              />
            </>
          )}

        </section>

        <section className="panel-right">
          <CreateCampaign 
            account={account} 
            showToast={showToast} 
            onSuccess={handleSuccess} 
          />
        </section>
      </main>

      <footer className="legal-notice">
        CHAINFUND DECENTRALIZED PROTOCOL // VERSION 1.0.0 // LOCAL HOST NETWORK
      </footer>
    </div>
  );
}

export default App;