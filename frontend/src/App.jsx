import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import {
  getReadOnlyContract,
  getWriteContract,
  getWeb3Details
} from "./contracts/contract";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import InvestorPage from "./pages/InvestorPage";
import FounderPage from "./pages/FounderPage";

// Status map sesuai enum contract teman
const STATUS_MAP = ["ACTIVE", "FUNDED", "FAILED", "COMPLETED", "CANCELED"];

// ─────────────────────────────────────────
// NAVBAR — berbeda untuk investor & founder
// ─────────────────────────────────────────
function Navbar({ account, balance, loading, connectWallet, formatAddress }) {
  const location = useLocation();
  if (location.pathname === "/") return null;

  const isInvestorPage = ["/dashboard", "/investor"].includes(location.pathname);

  const investorItems = [
    { path: "/dashboard", label: "[01 // DASHBOARD]" },
    { path: "/investor", label: "[02 // MY PORTFOLIO]" },
  ];
  const founderItems = [
    { path: "/founder", label: "[01 // FOUNDER PANEL]" },
  ];
  const navItems = isInvestorPage ? investorItems : founderItems;

  return (
    <>
      <header>
        <div className="logo-section">
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", color: "inherit" }}>
            <span className="logo-icon">CF</span>
            <span className="logo-text">CHAINFUND</span>
          </Link>
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
        <Link to="/" style={{
          padding: "1rem 1.5rem", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: "700",
          background: "transparent", color: "#121212", borderRight: "1px solid #121212",
          cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", whiteSpace: "nowrap",
        }}>← HOME</Link>
        {navItems.map((item, idx) => {
          const isActive = location.pathname === item.path;
          const isLast = idx === navItems.length - 1;
          return (
            <Link key={item.path} to={item.path} style={{
              flex: 1, padding: "1rem", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: "700",
              background: isActive ? "#121212" : "transparent", color: isActive ? "#f8f7f4" : "#121212",
              borderRight: !isLast ? "1px solid #121212" : "none", cursor: "pointer",
              textTransform: "uppercase", textDecoration: "none", textAlign: "center",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{item.label}</Link>
          );
        })}
      </nav>
    </>
  );
}

function StatsBanner({ campaigns, location }) {
  if (location.pathname === "/") return null;
  return (
    <section className="stats-banner">
      <div className="stat-card">
        <span className="stat-label">01 / TOTAL RECORDED</span>
        <span className="stat-value">{campaigns.length}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">02 / ACTIVE CAMPAIGNS</span>
        <span className="stat-value">{campaigns.filter((c) => c.statusInt === 0).length}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">03 / CUMULATIVE VALUE</span>
        <span className="stat-value">
          {campaigns.reduce((acc, c) => acc + parseFloat(c.danaTerkumpul), 0).toFixed(4)} ETH
        </span>
      </div>
    </section>
  );
}

function AppContent() {
  const location = useLocation();
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("0");
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((title, msg, type = "info") => {
    setToast({ title, msg, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const connectWallet = async () => {
    if (!window.ethereum) { showToast("METAMASK NOT FOUND", "Please install MetaMask.", "error"); return; }
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
      showToast("CONNECTION FAILED", error.message || "Failed to connect.", "error");
    } finally { setLoading(false); }
  };

  const loadCampaigns = useCallback(async () => {
    try {
      const contract = getReadOnlyContract();
      const totalCampaigns = await contract.jumlahCampaign();
      if (Number(totalCampaigns) > 0) {
        const list = await contract.getCampaigns(0, totalCampaigns);
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
            reputasi: Number(reputasi),
          };
        }));
        setCampaigns(formattedList);
      } else {
        setCampaigns([]);
      }
    } catch (error) { console.error("Error loading campaigns:", error); }
  }, []);

  useEffect(() => {
    const init = async () => {
      const details = await getWeb3Details();
      if (details.account) { setAccount(details.account); setBalance(details.balance); }
    };
    init();
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", async (accounts) => {
        if (accounts.length > 0) {
          const details = await getWeb3Details();
          setAccount(details.account || accounts[0]);
          setBalance(details.balance);
        } else { setAccount(""); setBalance("0"); }
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
    loadCampaigns();
  }, [loadCampaigns]);

  const handleInvest = async (campaignId, amount) => {
    if (!account) { showToast("WALLET REQUIRED", "Connect wallet first.", "error"); return; }
    if (!amount || parseFloat(amount) <= 0) { showToast("INVALID VALUE", "Enter a positive ETH value.", "error"); return; }
    try {
      setLoading(true);
      const contract = await getWriteContract();
      const tx = await contract.investasi(campaignId, { value: ethers.parseEther(amount) });
      showToast("TX SUBMITTED", "Broadcasting contribution...", "info");
      await tx.wait();
      showToast("LEDGER UPDATED", "Investment finalized.", "success");
      loadCampaigns();
      const details = await getWeb3Details(); setBalance(details.balance);
    } catch (error) { showToast("TX REVERTED", error.reason || error.message || "Reverted.", "error"); }
    finally { setLoading(false); }
  };

  const handleWithdraw = async (campaignId) => {
    if (!account) { showToast("WALLET REQUIRED", "Connect wallet first.", "error"); return; }
    try {
      setLoading(true);
      const contract = await getWriteContract();
      const tx = await contract.tarikDana(campaignId);
      showToast("TX SUBMITTED", "Broadcasting withdrawal...", "info");
      await tx.wait();
      showToast("LEDGER UPDATED", "Funds transferred.", "success");
      loadCampaigns();
      const details = await getWeb3Details(); setBalance(details.balance);
    } catch (error) { showToast("TX REVERTED", error.reason || error.message || "Reverted.", "error"); }
    finally { setLoading(false); }
  };

  const handleSuccess = async () => {
    loadCampaigns();
    const details = await getWeb3Details(); setBalance(details.balance);
  };

  const sharedProps = {
    account, campaigns, loading,
    handleInvest, handleWithdraw, handleSuccess, showToast, loadCampaigns,
  };

  const landingProps = { account, connectWallet, loading, formatAddress };

  return (
    <div className={location.pathname === "/" ? "" : "grid-container"}>
      {toast && (
        <div className={`alert-toast toast-${toast.type}`}>
          <div className="toast-title">{toast.title}</div>
          <div className="toast-msg">{toast.msg}</div>
        </div>
      )}
      <Navbar account={account} balance={balance} loading={loading} connectWallet={connectWallet} formatAddress={formatAddress} />
      <StatsBanner campaigns={campaigns} location={location} />
      <Routes>
        <Route path="/" element={<LandingPage {...landingProps} />} />
        <Route path="/dashboard" element={<DashboardPage {...sharedProps} />} />
        <Route path="/investor" element={<InvestorPage {...sharedProps} />} />
        <Route path="/founder" element={<FounderPage {...sharedProps} />} />
      </Routes>
      {location.pathname !== "/" && (
        <footer className="legal-notice">
          CHAINFUND DECENTRALIZED PROTOCOL // VERSION 2.0.0 // LOCAL HOST NETWORK
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;