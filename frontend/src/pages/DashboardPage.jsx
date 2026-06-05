import React, { useState } from "react";
import CampaignUpdates from "../components/CampaignUpdates";

const KATEGORI_MAP = {
  "ALL": "ALL CATEGORIES",
  "0": "TECHNOLOGY & IT",
  "1": "SOCIAL & HUMANITY",
  "2": "ENVIRONMENT",
  "3": "BUSINESS & STARTUP",
};

function DashboardPage({ account, campaigns, loading, handleInvest, showToast }) {
  const [investAmounts, setInvestAmounts] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [sortOption, setSortOption] = useState("NEWEST");

  const formatIndex = (id) => `#${String(id + 1).padStart(3, "0")}`;

  const handleInvestAmountChange = (campaignId, val) => {
    setInvestAmounts(prev => ({ ...prev, [campaignId]: val }));
  };

  const handleContribute = async (campaignId) => {
    const amount = investAmounts[campaignId];
    await handleInvest(campaignId, amount);
    setInvestAmounts(prev => ({ ...prev, [campaignId]: "" }));
  };

  // Filter, search, sort
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
    <main className="main-layout">
      <section className="panel-left">
        {/* Header + Search/Filter/Sort */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
          <h2 className="panel-title" style={{ margin: 0 }}>
            <span className="number">INDEX</span> LEDGER ENTRIES
          </h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="SEARCH TITLE..."
              className="form-input"
              style={{ width: "160px", margin: 0, padding: "0.5rem" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="form-input"
              style={{ margin: 0, padding: "0.5rem" }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              {Object.entries(KATEGORI_MAP).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
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
            <p>ADJUST YOUR SEARCH OR FILTER PARAMETERS, OR GO TO FOUNDER PANEL TO CREATE A CAMPAIGN.</p>
          </div>
        ) : (
          <div className="campaign-grid">
            {displayCampaigns.map((c) => {
              const isUserOwner = account && account.toLowerCase() === c.pemilik.toLowerCase();
              const progressPercentage = Math.min(
                ((parseFloat(c.danaTerkumpul) / parseFloat(c.targetDana)) * 100), 100
              );
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

                  <h3 className="campaign-title">{c.judul}</h3>
                  <p className="campaign-desc">{c.deskripsi}</p>

                  <div className="owner-row" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
                    <div>
                      <span className="label">ORIGIN:</span>
                      <span title={c.pemilik}>{isUserOwner ? "[YOU]" : c.pemilik}</span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: c.reputasi > 0 ? "var(--accent-green)" : "var(--text-dim)", fontWeight: "bold" }}>
                      REP: {c.reputasi} ✓
                    </div>
                  </div>

                  <div style={{ fontSize: "0.7rem", color: "#888", marginTop: "0.25rem", fontFamily: "var(--font-mono)" }}>
                    CATEGORY: {KATEGORI_MAP[c.kategoriId.toString()] || "UNKNOWN"}
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

                  {/* Tombol Investasi */}
                  {isActive && (
                    <div className="contribution-row">
                      <div className="input-mono-wrapper">
                        <input
                          type="number" step="0.01" min="0" placeholder="0.10"
                          className="form-input"
                          value={investAmounts[c.id] || ""}
                          onChange={(e) => handleInvestAmountChange(c.id, e.target.value)}
                          disabled={loading}
                        />
                        <span className="input-suffix">ETH</span>
                      </div>
                      <button className="btn-secondary" onClick={() => handleContribute(c.id)} disabled={loading}>
                        CONTRIBUTE
                      </button>
                    </div>
                  )}

                  {/* Campaign Updates */}
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
      </section>
    </main>
  );
}

export default DashboardPage;