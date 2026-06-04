import React from "react";

function DashboardPage({
  account, campaigns, loading,
  investAmounts, investTimestamps, now,
  REFUND_WINDOW_SECONDS,
  handleInvest, handleRefund,
  handleInvestAmountChange, getSisaRefund,
}) {
  const formatIndex = (index) => `#${String(index + 1).padStart(3, "0")}`;

  return (
    <main className="main-layout">
      <section className="panel-left">
        <h2 className="panel-title"><span className="number">INDEX</span> LEDGER ENTRIES</h2>

        {campaigns.length === 0 ? (
          <div className="empty-state">
            <h3>NO ENTRIES DETECTED</h3>
            <p>THE LEDGER IS EMPTY. GO TO FOUNDER PANEL TO CREATE A NEW CAMPAIGN.</p>
          </div>
        ) : (
          <div className="campaign-grid">
            {campaigns.map((c, index) => {
              const isDeadlinePassed = c.deadline * 1000 < now;
              const progressPercentage = Math.min(
                ((parseFloat(c.danaTerkumpul) / parseFloat(c.targetDana)) * 100), 100
              );
              const dateObj = new Date(c.deadline * 1000);
              const isUserOwner = account && account.toLowerCase() === c.pemilik.toLowerCase();

              // Refund logic
              const investTime = investTimestamps[c.id] || 0;
              const canRefund = investTime > 0 && now < (investTime + REFUND_WINDOW_SECONDS) * 1000;
              const { menit, detik } = getSisaRefund(investTime);

              return (
                <div className="campaign-card" key={c.id}>
                  <div className="campaign-meta-line">
                    <span className="campaign-index">{formatIndex(index)}</span>
                    <span className={`campaign-status ${c.aktif && !isDeadlinePassed ? "status-active" : "status-closed"}`}>
                      {c.aktif && !isDeadlinePassed ? "active" : "closed"}
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
                      <span className="ledger-cell-value">{c.aktif ? "0x01 / ACTIVE" : "0x00 / TERMINATED"}</span>
                    </div>
                  </div>

                  {/* Tombol Investasi */}
                  {c.aktif && !isDeadlinePassed && (
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
                      <button className="btn-secondary" onClick={() => handleInvest(c.id)} disabled={loading}>
                        CONTRIBUTE
                      </button>
                    </div>
                  )}

                  {/* Tombol Refund — muncul dalam 2 jam setelah investasi */}
                  {canRefund && (
                    <div className="contribution-row" style={{
                      marginTop: "0.5rem", borderTop: "1px dashed #e63946",
                      paddingTop: "0.75rem", flexDirection: "column", gap: "0.5rem",
                    }}>
                      <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#e63946", letterSpacing: "0.05em" }}>
                        ⚠ REFUND WINDOW ACTIVE — EXPIRES IN {menit}m {detik}s
                      </div>
                      <div style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "#888" }}>
                        HUMAN ERROR PROTECTION: CANCEL YOUR INVESTMENT WITHIN 2 HOURS
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