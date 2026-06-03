import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getReadOnlyContract } from "../contracts/contract";

function MyPortfolio({ account }) {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!account) {
        setContributions([]);
        return;
      }
      try {
        setLoading(true);
        const contract = getReadOnlyContract();
        const list = await contract.semuaCampaign();
        const tempPortfolio = [];

        // Loop internal untuk mengecek kontribusi investor di setiap campaign
        for (let i = 0; i < list.length; i++) {
          const c = list[i];
          const userContributionWei = await contract.cekKontribusi(Number(c.id), account);
          
          if (userContributionWei > 0n) {
            tempPortfolio.push({
              id: Number(c.id),
              judul: c.judul,
              pemilik: c.pemilik,
              targetDana: ethers.formatEther(c.targetDana),
              danaTerkumpul: ethers.formatEther(c.danaTerkumpul),
              kontribusiUser: ethers.formatEther(userContributionWei),
              deadline: Number(c.deadline),
              aktif: c.aktif,
            });
          }
        }
        setContributions(tempPortfolio);
      } catch (error) {
        console.error("Error loading portfolio metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [account]);

  if (!account) {
    return (
      <div className="empty-state">
        <h3>SECURE STORAGE LOCKED</h3>
        <p>CONNECT YOUR CRYPTO WALLET TO DECRYPT AND RETRIEVE PERSONAL CAPITAL CONTRIBUTION METRICS.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="campaign-meta-line" style={{ borderBottom: "1px solid #121212", paddingBottom: "0.5rem" }}>
        <span>REGISTRY OWNER: {account.substring(0, 8)}...{account.substring(account.length - 6)}</span>
        <span>RECORD COUNT: {contributions.length}</span>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
          <div className="loading-spinner"></div>
        </div>
      ) : contributions.length === 0 ? (
        <div className="empty-state">
          <h3>NO CONTRIBUTIONS FOUND</h3>
          <p>YOUR ADDRESS HAS NOT COMMITTED CAPITAL ASSETS TO ANY ACTIVE STARTUP PROPOSALS ON THIS LEDGER.</p>
        </div>
      ) : (
        <div className="campaign-grid">
          {contributions.map((c) => {
            const isDeadlinePassed = c.deadline * 1000 < Date.now();
            const progressPercentage = Math.min(((parseFloat(c.danaTerkumpul) / parseFloat(c.targetDana)) * 100), 100);

            return (
              <div className="campaign-card" key={c.id} style={{ border: "1px solid #121212", padding: "1.25rem", backgroundColor: "#ffffff" }}>
                <div className="campaign-meta-line">
                  <span className="campaign-index">ENTRY ID: #{String(c.id + 1).padStart(3, "0")}</span>
                  <span className={`campaign-status ${c.aktif && !isDeadlinePassed ? "status-active" : "status-closed"}`}>
                    {c.aktif && !isDeadlinePassed ? "active" : "closed"}
                  </span>
                </div>

                <h4 className="campaign-title" style={{ fontSize: "1.2rem", margin: "0.5rem 0" }}>{c.judul}</h4>

                {/* Progress Bar Style Tim */}
                <div className="progress-container">
                  <div className="progress-text">
                    <span>TOTAL FUNDING PROGRESS</span>
                    <span>{progressPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
                  </div>
                </div>

                {/* Detail Informasi */}
                <div className="ledger-details" style={{ marginTop: "0.5rem", gridTemplateColumns: "repeat(2, 1fr)" }}>
                  <div className="ledger-cell">
                    <span className="ledger-cell-label">YOUR INVESTED ASSET</span>
                    <span className="ledger-cell-value" style={{ color: "var(--accent-blue)" }}>{c.kontribusiUser} ETH</span>
                  </div>
                  <div className="ledger-cell">
                    <span className="ledger-cell-label">TOTAL POOL VALUE</span>
                    <span className="ledger-cell-value">{c.danaTerkumpul} ETH</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyPortfolio;