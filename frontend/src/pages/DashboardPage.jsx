import React, { useState } from "react";

function DashboardPage({
  account, campaigns, loading,
  investAmounts, investTimestamps, sudahRefundMap, now,
  REFUND_WINDOW_SECONDS,
  handleInvest, handleRefund,
  handleInvestAmountChange, getSisaRefund,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("NEWEST");

  const formatIndex = (id) => `#${String(id + 1).padStart(3, "0")}`;

  const handleContribute = async (campaignId) => {
    const amount = investAmounts?.[campaignId];
    await handleInvest(campaignId, amount);
  };

  const getProcessedCampaigns = () => {
    let processed = [...campaigns];
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

        {/* Header + Search & Sort */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "1rem",
          flexWrap: "wrap", gap: "1rem"
        }}>
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
            <p>ADJUST YOUR SEARCH PARAMETERS, OR GO TO FOUNDER PANEL TO CREATE A CAMPAIGN.</p>
          </div>
        ) : (
          <div className="campaign-grid">
            {displayCampaigns.map((c) => {
              const isDeadlinePassed = c.deadline * 1000 < now;
              const isActive = c.aktif && !isDeadlinePassed;
              const progressPercentage = Math.min(
                ((parseFloat(c.danaTerkumpul) / parseFloat(c.targetDana)) * 100), 100
              );
              const dateObj = new Date(c.deadline * 1000);
              const isUserOwner = account && account.toLowerCase() === c.pemilik.toLowerCase();

              // Lapis 2: cek sudahRefund dari contract
              const investTime = investTimestamps?.[c.id] || 0;
              const alreadyRefunded = sudahRefundMap?.[c.id] || false;
              const canRefund = investTime > 0
                && now < (investTime + REFUND_WINDOW_SECONDS) * 1000
                && !alreadyRefunded; // ← tombol hilang kalau sudah refund
              const { menit, detik } = getSisaRefund ? getSisaRefund(investTime) : { menit: 0, detik: 0 };

              return (
                <div className="campaign-card" key={c.id}>
                  <div className="campaign-meta-line">
                    <span className="campaign-index">{formatIndex(c.id)}</span>
                    <span className={`campaign-status ${isActive ? "status-active" : "status-closed"}`}>
                      {isActive ? "ACTIVE" : "CLOSED"}
                    </span>
                  </div>

                  <h3 className="campaign-title">{c.judul}</h3>
                  <p className="campaign-desc">{c.deskripsi}</p>

                  <div className="owner-row">
                    <span className="label">ORIGIN:</span>
                    <span title={c.pemilik}>{isUserOwner ? "[YOU]" : c.pemilik}</span>
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
                      <span className="ledger-cell-value">
                        {isActive ? "0x01 / ACTIVE" : "0x00 / CLOSED"}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Investasi */}
                  {isActive && (
                    <div className="contribution-row">
                      <div className="input-mono-wrapper">
                        <input
                          type="number" step="0.01" min="0" placeholder="0.10"
                          className="form-input"
                          value={investAmounts?.[c.id] || ""}
                          onChange={(e) => handleInvestAmountChange(c.id, e.target.value)}
                          disabled={loading}
                        />
                        <span className="input-suffix">ETH</span>
                      </div>
                      <button
                        className="btn-secondary"
                        onClick={() => handleContribute(c.id)}
                        disabled={loading}
                      >
                        CONTRIBUTE
                      </button>
                    </div>
                  )}

                  {/* Tombol Refund — hilang otomatis kalau sudah pernah refund */}
                  {canRefund && (
                    <div className="contribution-row" style={{
                      marginTop: "0.5rem", borderTop: "1px dashed #e63946",
                      paddingTop: "0.75rem", flexDirection: "column", gap: "0.5rem",
                    }}>
                      <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#e63946" }}>
                        ⚠ REFUND WINDOW ACTIVE — EXPIRES IN {menit}m {detik}s
                      </div>
                      <div style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "#888" }}>
                        HUMAN ERROR PROTECTION: 1x REFUND ONLY PER CAMPAIGN
                      </div>
                      <button
                        className="btn-secondary"
                        onClick={() => handleRefund(c.id)}
                        disabled={loading}
                        style={{ borderColor: "#e63946", color: "#e63946", width: "100%" }}
                      >
                        {loading ? "PROCESSING..." : "CANCEL INVESTMENT (REFUND)"}
                      </button>
                    </div>
                  )}

                  {/* Info: sudah pernah refund */}
                  {alreadyRefunded && (
                    <div style={{
                      marginTop: "0.5rem", padding: "0.5rem",
                      background: "#f0f0f0", borderRadius: "4px",
                      fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "#888",
                      textAlign: "center",
                    }}>
                      REFUND SUDAH DIGUNAKAN — TIDAK BISA REFUND LAGI
                    </div>
                  )}

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