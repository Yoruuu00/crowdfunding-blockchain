import React from "react";

function WithdrawPanel({ account, campaigns, handleWithdraw, loading }) {
  const myCampaigns = campaigns.filter(
    (c) => account && c.pemilik.toLowerCase() === account.toLowerCase()
  );

  if (!account) {
    return (
      <div className="empty-state">
        <h3>ACCESS DENIED</h3>
        <p>RE-ESTABLISH WALLET CONNECTION TO IDENTITY CREDENTIALS IN ORDER TO LOAD MANAGEMENT UTILITIES.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="campaign-meta-line" style={{ borderBottom: "1px solid #121212", paddingBottom: "0.5rem" }}>
        <span>FOUNDER PRIVILEGES ACTIVE</span>
        <span>OWNED ENTRIES: {myCampaigns.length}</span>
      </div>

      {myCampaigns.length === 0 ? (
        <div className="empty-state">
          <h3>NO CAMPAIGNS REGISTERED</h3>
          <p>YOUR ACCOUNT ADDRESS IS NOT ASSOCIATED WITH ANY REGISTERED CAMPAIGNS UPON THIS DECENTRALIZED RECORD.</p>
        </div>
      ) : (
        <div className="campaign-grid">
          {myCampaigns.map((c) => {
            const isDeadlinePassed = c.deadline * 1000 < Date.now();

            // FIX: Bisa tarik kalau target sudah tercapai — tidak perlu tunggu deadline
            const isTargetReached = parseFloat(c.danaTerkumpul) >= parseFloat(c.targetDana);
            const canSettle = c.aktif && isTargetReached;

            return (
              <div
                className="campaign-card"
                key={c.id}
                style={{ border: "1px solid #121212", padding: "1.25rem", backgroundColor: "#ffffff" }}
              >
                <div className="campaign-meta-line">
                  <span className="campaign-index">CAMPAIGN ID: #{String(c.id + 1).padStart(3, "0")}</span>
                  <span className={`campaign-status ${c.aktif ? "status-active" : "status-closed"}`}>
                    {c.aktif ? "active / locked" : "liquidated"}
                  </span>
                </div>

                <h4 className="campaign-title" style={{ fontSize: "1.2rem", margin: "0.5rem 0" }}>
                  {c.judul}
                </h4>

                <div className="ledger-details" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  <div className="ledger-cell">
                    <span className="ledger-cell-label">ACCUMULATED CAPITAL</span>
                    <span className="ledger-cell-value">{c.danaTerkumpul} ETH</span>
                  </div>
                  <div className="ledger-cell">
                    <span className="ledger-cell-label">MINIMUM THRESHOLD</span>
                    <span className="ledger-cell-value">{c.targetDana} ETH</span>
                  </div>
                  <div className="ledger-cell">
                    <span className="ledger-cell-label">CLOSURE TIMESTAMPS</span>
                    <span className="ledger-cell-value">
                      {new Date(c.deadline * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="progress-container" style={{ marginTop: "0.75rem" }}>
                  <div className="progress-text">
                    <span>FUNDING PROGRESS</span>
                    <span>
                      {Math.min(
                        ((parseFloat(c.danaTerkumpul) / parseFloat(c.targetDana)) * 100),
                        100
                      ).toFixed(1)}%
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(
                          ((parseFloat(c.danaTerkumpul) / parseFloat(c.targetDana)) * 100),
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Status & Tombol */}
                {c.aktif && (
                  <div
                    className="action-box"
                    style={{
                      marginTop: "0.75rem",
                      borderColor: canSettle ? "var(--accent-green)" : "var(--text-dim)",
                      backgroundColor: canSettle ? "#f1f8f3" : "#fafaf7",
                    }}
                  >
                    <div
                      className="action-box-text"
                      style={{ color: canSettle ? "var(--accent-green)" : "var(--text-muted)" }}
                    >
                      {!isTargetReached
                        ? `STATUS: TARGET BELUM TERCAPAI — TERKUMPUL ${c.danaTerkumpul} ETH DARI ${c.targetDana} ETH`
                        : "TARGET TERCAPAI ✓ — DANA SIAP DICAIRKAN"}
                    </div>

                    {canSettle && (
                      <button
                        className="btn-action"
                        onClick={() => handleWithdraw(c.id)}
                        disabled={loading}
                      >
                        {loading ? "SETTLING..." : "SETTLE FUNDS"}
                      </button>
                    )}
                  </div>
                )}

                {!c.aktif && (
                  <div
                    className="action-box"
                    style={{ marginTop: "0.75rem", backgroundColor: "#f0f0f0", borderColor: "#ccc" }}
                  >
                    <div className="action-box-text" style={{ color: "#666" }}>
                      STATUS: DANA SUDAH DICAIRKAN — CAMPAIGN SELESAI
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WithdrawPanel;