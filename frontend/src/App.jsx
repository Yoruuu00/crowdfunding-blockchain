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

const REFUND_WINDOW_SECONDS = 7200; // 2 jam production

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

function StatsBanner({ campaigns, now, location }) {
  if (location.pathname === "/") return null;
  return (
    <section className="stats-banner">
      <div className="stat-card">
        <span className="stat-label">01 / TOTAL RECORDED</span>
        <span className="stat-value">{campaigns.length}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">02 / ACTIVE CAMPAIGNS</span>
        <span className="stat-value">
          {campaigns.filter((c) => c.aktif && c.deadline * 1000 > now).length}
        </span>
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
  const [investAmounts, setInvestAmounts] = useState({});
  const [investTimestamps, setInvestTimestamps] = useState({});
  const [now, setNow] = useState(Date.now());

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

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

  // FIXED: pakai semuaCampaign() sesuai contract kita
  const loadCampaigns = useCallback(async () => {
    try {
      const contract = getReadOnlyContract();
      const list = await contract.semuaCampaign();
      setCampaigns(list.map((c) => ({
        id: Number(c.id),
        judul: c.judul,
        deskripsi: c.deskripsi,
        pemilik: c.pemilik,
        targetDana: ethers.formatEther(c.targetDana),
        danaTerkumpul: ethers.formatEther(c.danaTerkumpul),
        deadline: Number(c.deadline),
        aktif: c.aktif,
        statusInt: c.aktif ? 0 : 1,
      })));
    } catch (error) {
      console.error("Error loading campaigns:", error);
    }
  }, []);

  const loadInvestTimestamps = useCallback(async () => {
    if (!account || campaigns.length === 0) return;
    try {
      const contract = getReadOnlyContract();
      const timestamps = {};
      for (const c of campaigns) {
        const ts = await contract.waktuInvestasi(c.id, account);
        timestamps[c.id] = Number(ts);
      }
      setInvestTimestamps(timestamps);
    } catch (error) {
      console.error("Error loading timestamps:", error);
    }
  }, [account, campaigns]);

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

  useEffect(() => {
    if (account && campaigns.length > 0) loadInvestTimestamps();
  }, [account, campaigns, loadInvestTimestamps]);

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
      await loadCampaigns();
      loadInvestTimestamps();
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
      await loadCampaigns();
      const details = await getWeb3Details(); setBalance(details.balance);
    } catch (error) { showToast("TX REVERTED", error.reason || error.message || "Reverted.", "error"); }
    finally { setLoading(false); }
  };

  const handleRefund = async (campaignId) => {
    if (!account) { showToast("WALLET REQUIRED", "Connect wallet first.", "error"); return; }
    try {
      setLoading(true);
      const contract = await getWriteContract();
      const tx = await contract.refundDuaJam(campaignId);
      showToast("TX SUBMITTED", "Processing refund...", "info");
      await tx.wait();
      showToast("REFUND SUCCESS", "Investment returned to wallet.", "success");
      await loadCampaigns();
      loadInvestTimestamps();
      const details = await getWeb3Details(); setBalance(details.balance);
    } catch (error) { showToast("TX REVERTED", error.reason || error.message || "Refund failed.", "error"); }
    finally { setLoading(false); }
  };

  // FIXED: await loadCampaigns
  const handleSuccess = async () => {
    await loadCampaigns();
    const details = await getWeb3Details();
    setBalance(details.balance);
  };

  const handleInvestAmountChange = (campaignId, val) => {
    setInvestAmounts(prev => ({ ...prev, [campaignId]: val }));
  };

  const getSisaRefund = (investTime) => {
    const deadlineMs = (investTime + REFUND_WINDOW_SECONDS) * 1000;
    const sisaMs = Math.max(0, deadlineMs - now);
    return { sisaMs, menit: Math.floor(sisaMs / 60000), detik: Math.floor((sisaMs % 60000) / 1000) };
  };

  const sharedProps = {
    account, campaigns, loading,
    investAmounts, investTimestamps, now,
    REFUND_WINDOW_SECONDS,
    handleInvest, handleWithdraw, handleRefund,
    handleInvestAmountChange, handleSuccess,
    getSisaRefund, showToast, loadCampaigns,
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
      <StatsBanner campaigns={campaigns} now={now} location={location} />
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