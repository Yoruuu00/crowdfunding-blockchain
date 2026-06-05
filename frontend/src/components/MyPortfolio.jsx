import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getReadOnlyContract, getWriteContract } from "../contracts/contract";

function MyPortfolio({ account, campaigns, showToast, loadCampaigns }) {
  const [portfolio, setPortfolio] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

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

        // Mengecek kontribusi user pada setiap campaign yang sudah di-load oleh App.jsx
        for (let i = 0; i < campaigns.length; i++) {
          const c = campaigns[i];
          const userContribWei = await contract.totalKontribusi(c.id, account);
          
          if (userContribWei > 0n) {
            // Ambil jumlah riwayat investasi untuk indeks fitur personRefund
            const investCount = await contract.getJumlahInvestasiUser(c.id, account);

            tempPortfolio.push({
              ...c,
              kontribusiUser: ethers.formatEther(userContribWei),
              investCount: Number(investCount)
            });
          }
        }
        setPortfolio(tempPortfolio);
      } catch (error) {
        console.error("Error loading portfolio metrics:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchPortfolio();
  }, [account, campaigns]);

  // Fungsi untuk memanggil Refund 2 Jam (Menggunakan indeks transaksi terakhir)
  const handlePersonRefund = async (campaignId, lastIndex) => {
    try {
      setTxLoading(true);
      const contract = await getWriteContract();
      const tx = await contract.personRefund(campaignId, lastIndex);
      showToast("TX SUBMITTED", "Processing grace period refund protocol...", "info");
      await tx.wait();
      showToast("REFUND SUCCESS", "Capital has been returned to your wallet.", "success");
      if (loadCampaigns) loadCampaigns();
    } catch (error) {
      console.error(error);
      showToast("REFUND REVERTED", error.reason || error.message || "Time window expired or already refunded.", "error");
    } finally {
      setTxLoading(false);
    }
  };

  // Fungsi untuk memanggil Klaim Refund Gagal
  const handleKlaimRefundGagal = async (campaignId) => {
    try {
      setTxLoading(true);
      const contract = await getWriteContract();
      const tx = await contract.klaimRefundGagal(campaignId);
      showToast("TX SUBMITTED", "Claiming failed campaign assets...", "info");
      await tx.wait();
      showToast("CLAIM SUCCESS", "Capital from failed campaign retrieved.", "success");
      if (loadCampaigns) loadCampaigns();
    } catch (error) {
      console.error(error);
      showToast("CLAIM REVERTED", error.reason || error.message || "Cannot claim refund at this time.", "error");
    } finally {
      setTxLoading(false);
    }
  };

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
            const progressPercentage = Math.min(((parseFloat(c.danaTerkumpul) / parseFloat(c.targetDana)) * 100), 100);
            
            // Logika untuk menampilkan tombol aksi
            const isFailed = c.statusInt === 2 || (c.statusInt === 0 && c.deadline * 1000 < Date.now());
            const canGraceRefund = (c.statusInt === 0 || c.statusInt === 1) && parseFloat(c.kontribusiUser) > 0;

            return (
              <div className="campaign-card" key={c.id} style={{ border: "1px solid #121212", padding: "1.25rem", backgroundColor: "#ffffff" }}>
                <div className="campaign-meta-line">
                  <span className="campaign-index">ENTRY ID: #{String(c.id + 1).padStart(3, "0")}</span>
                  <span className={`campaign-status status-${c.statusLabel.toLowerCase()}`}>
                    {c.statusLabel}
                  </span>
                </div>

                <h4 className="campaign-title" style={{ fontSize: "1.2rem", margin: "0.5rem 0" }}>{c.judul}</h4>

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
                    <span className="ledger-cell-label">YOUR ACTIVE ASSET</span>
                    <span className="ledger-cell-value" style={{ color: "var(--accent-blue)" }}>{c.kontribusiUser} ETH</span>
                  </div>
                  <div className="ledger-cell">
                    <span className="ledger-cell-label">TOTAL POOL VALUE</span>
                    <span className="ledger-cell-value">{c.danaTerkumpul} ETH</span>
                  </div>
                </div>

                {/* Panel Aksi Refund */}
                <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                  {isFailed && parseFloat(c.kontribusiUser) > 0 && (
                    <button 
                      className="btn-action" 
                      style={{ backgroundColor: "var(--accent-red)", color: "#fff", borderColor: "var(--accent-red)" }}
                      onClick={() => handleKlaimRefundGagal(c.id)}
                      disabled={txLoading}
                    >
                      {txLoading ? "PROCESSING..." : "CLAIM FAILED REFUND"}
                    </button>
                  )}

                  {canGraceRefund && c.investCount > 0 && (
                    <button 
                      className="btn-secondary" 
                      title="Valid only within 2 hours of investment"
                      onClick={() => handlePersonRefund(c.id, c.investCount - 1)}
                      disabled={txLoading}
                    >
                      {txLoading ? "PROCESSING..." : "GRACE REFUND (LATEST)"}
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

export default MyPortfolio;