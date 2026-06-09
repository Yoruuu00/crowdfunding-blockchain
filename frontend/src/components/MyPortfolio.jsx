import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getReadOnlyContract } from "../contracts/contract";

function MyPortfolio({ account, campaigns }) {
  const [portfolio, setPortfolio] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!account || campaigns.length === 0) {
        setPortfolio([]);
        return;
      }
      try {
        setLoadingData(true);
        const contract = getReadOnlyContract();
        const tempPortfolio = [];

        for (let i = 0; i < campaigns.length; i++) {
          const c = campaigns[i];

          // FIX: pakai kontribusi() sesuai contract kita
          const userContribWei = await contract.kontribusi(c.id, account);

          if (userContribWei > 0n) {
            tempPortfolio.push({
              ...c,
              kontribusiUser: ethers.formatEther(userContribWei),
            });
          }
        }
        setPortfolio(tempPortfolio);
      } catch (error) {
        console.error("Error loading portfolio:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchPortfolio();
  }, [account, campaigns]);

  if (!account) {
    return (
      <div className="empty-state">
        <h3>SECURE STORAGE LOCKED</h3>
        <p>CONNECT YOUR CRYPTO WALLET TO RETRIEVE PERSONAL CAPITAL CONTRIBUTION METRICS.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="campaign-meta-line" style={{ borderBottom: "1px solid #121212", paddingBottom: "0.5rem" }}>
        <span>REGISTRY OWNER: {account.substring(0, 8)}...{account.substring(account.length - 6)}</span>
        <span>RECORD COUNT: {portfolio.length}</span>
      </div>

      {loadingData ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
          <div className="loading-spinner"></div>
        </div>
      ) : portfolio.length === 0 ? (
        <div className="empty-state">
          <h3>NO CONTRIBUTIONS FOUND</h3>
          <p>YOUR ADDRESS HAS NOT COMMITTED CAPITAL ASSETS TO ANY PROPOSALS ON THIS LEDGER.</p>
        </div>
      ) : (
        <div className="campaign-grid">
          {portfolio.map((c) => {
            const progressPercentage = Math.min(
              ((parseFloat(c.danaTerkumpul) / parseFloat(c.targetDana)) * 100), 100
            );
            const isActive = c.aktif && c.deadline * 1000 > Date.now();
            const dateObj = new Date(c.deadline * 1000);

            return (
              <div
                className="campaign-card"
                key={c.id}
                style={{ border: "1px solid #121212", padding: "1.25rem", backgroundColor: "#ffffff" }}
              >
                <div className="campaign-meta-line">
                  <span className="campaign-index">
                    ENTRY ID: #{String(c.id + 1).padStart(3, "0")}
                  </span>
                  <span className={`campaign-status ${isActive ? "status-active" : "status-closed"}`}>
                    {isActive ? "ACTIVE" : "CLOSED"}
                  </span>
                </div>

                <h4 className="campaign-title" style={{ fontSize: "1.2rem", margin: "0.5rem 0" }}>
                  {c.judul}
                </h4>

                <div className="progress-container">
                  <div className="progress-text">
                    <span>TOTAL FUNDING PROGRESS</span>
                    <span>{progressPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
                  </div>
                </div>

                <div className="ledger-details" style={{ marginTop: "0.5rem", gridTemplateColumns: "repeat(2, 1fr)" }}>
                  <div className="ledger-cell">
                    <span className="ledger-cell-label">YOUR INVESTED ASSET</span>
                    <span className="ledger-cell-value" style={{ color: "#1D9E75" }}>
                      {c.kontribusiUser} ETH
                    </span>
                  </div>
                  <div className="ledger-cell">
                    <span className="ledger-cell-label">TOTAL POOL VALUE</span>
                    <span className="ledger-cell-value">{c.danaTerkumpul} ETH</span>
                  </div>
                  <div className="ledger-cell">
                    <span className="ledger-cell-label">TARGET</span>
                    <span className="ledger-cell-value">{c.targetDana} ETH</span>
                  </div>
                  <div className="ledger-cell">
                    <span className="ledger-cell-label">DEADLINE</span>
                    <span className="ledger-cell-value">{dateObj.toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Info untuk investor */}
                <div style={{
                  marginTop: "0.75rem", padding: "0.5rem",
                  background: "#fafaf7", borderRadius: "4px",
                  fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "#888",
                }}>
                  {isActive
                    ? "CAMPAIGN AKTIF — REFUND TERSEDIA DI HALAMAN DASHBOARD DALAM 2 JAM SETELAH INVEST"
                    : "CAMPAIGN SUDAH DITUTUP"}
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