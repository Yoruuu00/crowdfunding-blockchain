import React from "react";

function WithdrawPanel({ account, campaigns, handleWithdraw, loading }) {
  // Filter proyek yang dibuat oleh wallet user yang sedang terhubung
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
            // Berdasarkan arsitektur baru: Hanya bisa ditarik jika status FUNDED (1)
            const isFunded = c.statusInt === 1; 
            const isCompleted = c.statusInt === 3;
            const isFailed = c.statusInt === 2 || (c.statusInt === 0 && c.deadline * 1000 < Date.now());

            return (
              <div className="campaign-card" key={c.id} style={{ border: "1px solid #121212", padding: "1.25rem", backgroundColor: "#ffffff" }}>
                <div className="campaign-meta-line">
                  <span className="campaign-index">CAMPAIGN REGISTERED ID: #{String(c.id + 1).padStart(3, "0")}</span>
                  <span className={`campaign-status status-${c.statusLabel.toLowerCase()}`}>
                    {c.statusLabel}
                  </span>
                </div>

                <h4 className="campaign-title" style={{ fontSize: "1.2rem", margin: "0.5rem 0" }}>{c.judul}</h4>

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
                    <span className="ledger-cell-value">{new Date(c.deadline * 1000).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="action-box" style={{ 
                  marginTop: "0.5rem", 
                  borderColor: isFunded ? "var(--accent-green)" : "var(--text-dim)", 
                  backgroundColor: isFunded ? "#f1f8f3" : "#fafaf7" 
                }}>
                  <div className="action-box-text" style={{ color: isFunded ? "var(--accent-green)" : "var(--text-muted)" }}>
                    {isFunded 
                      ? "CRITERIA MET. UNLOCKED FOR SETTLEMENT PROTOCOL." 
                      : isCompleted
                      ? "STATUS: FUNDS ALREADY SETTLED AND LIQUIDATED."
                      : isFailed
                      ? "STATUS: CAMPAIGN FAILED. ASSETS ARE RESERVED FOR INVESTOR REFUNDS."
                      : "STATUS: WAITING FOR FUNDING TARGET TO BE REACHED."}
                  </div>
                  
                  {isFunded && (
                    <button 
                      className="btn-action" 
                      onClick={() => handleWithdraw(c.id)}
                      disabled={loading}
                    >
                      {loading ? "SETTLING..." : "SETTLE FUNDS"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WithdrawPanel;