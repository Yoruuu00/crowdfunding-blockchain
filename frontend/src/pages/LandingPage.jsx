import React from "react";
import { useNavigate } from "react-router-dom";

function LandingPage({ account, connectWallet, loading, formatAddress }) {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#fafaf7",
      fontFamily: "var(--font-mono)",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* Top Bar */}
      <div style={{
        padding: "1.25rem 2rem",
        borderBottom: "2px solid #121212",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fafaf7",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{
            background: "#121212", color: "#f8f7f4",
            padding: "0.3rem 0.6rem", fontWeight: "700", fontSize: "1rem",
          }}>CF</span>
          <span style={{ fontWeight: "700", fontSize: "1.1rem", letterSpacing: "0.1em" }}>
            CHAINFUND
          </span>
        </div>

        {account ? (
          <div style={{ fontSize: "0.75rem", color: "#121212" }}>
            <span style={{
              background: "#d4edda", color: "#155724",
              padding: "0.25rem 0.75rem", borderRadius: "4px", marginRight: "0.5rem",
            }}>CONNECTED</span>
            {formatAddress(account)}
          </div>
        ) : (
          <button
            onClick={connectWallet}
            disabled={loading}
            style={{
              background: "#121212", color: "#f8f7f4",
              border: "none", padding: "0.5rem 1.25rem",
              fontFamily: "var(--font-mono)", fontSize: "0.8rem",
              fontWeight: "700", cursor: "pointer", letterSpacing: "0.05em",
            }}
          >
            {loading ? "CONNECTING..." : "CONNECT WALLET"}
          </button>
        )}
      </div>

      {/* Hero Section */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "4rem 2rem",
        textAlign: "center",
      }}>

        {/* Badge */}
        <div style={{
          fontSize: "0.7rem", letterSpacing: "0.2em",
          color: "#666", border: "1px solid #ccc",
          padding: "0.3rem 1rem", marginBottom: "2rem",
          borderRadius: "2px",
        }}>
          BLOCKCHAIN-POWERED // HARDHAT LOCAL NETWORK
        </div>

        {/* Judul */}
        <h1 style={{
          fontSize: "clamp(2rem, 6vw, 4rem)",
          fontWeight: "700", margin: "0 0 1rem",
          letterSpacing: "-0.02em", lineHeight: 1.1,
          color: "#121212",
        }}>
          FUND THE FUTURE.
        </h1>
        <h2 style={{
          fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
          fontWeight: "700", margin: "0 0 1.5rem",
          letterSpacing: "-0.02em", color: "#121212",
        }}>
          ON-CHAIN.
        </h2>

        <p style={{
          fontSize: "0.9rem", color: "#555", maxWidth: "480px",
          lineHeight: 1.7, marginBottom: "3rem",
        }}>
          Platform pendanaan startup terdesentralisasi. Transparan, otomatis,
          dan terlindungi — tanpa perantara, tanpa manipulasi.
        </p>

        {/* Stats mini */}
        <div style={{
          display: "flex", gap: "2rem", marginBottom: "3.5rem",
          borderTop: "1px solid #ddd", borderBottom: "1px solid #ddd",
          padding: "1rem 2rem",
        }}>
          {[
            { label: "SMART CONTRACT", val: "VERIFIED" },
            { label: "SETTLEMENT", val: "T+0" },
            { label: "REFUND WINDOW", val: "2 JAM" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.65rem", color: "#888", letterSpacing: "0.1em" }}>{s.label}</div>
              <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "#121212" }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Pilih Peran */}
        <div style={{ marginBottom: "1rem", fontSize: "0.72rem", color: "#888", letterSpacing: "0.1em" }}>
          PILIH PERAN ANDA
        </div>

        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>

          {/* Investor Card */}
          <div
            onClick={() => navigate("/dashboard")}
            style={{
              width: "220px", border: "2px solid #121212",
              padding: "2rem 1.5rem", cursor: "pointer",
              backgroundColor: "#fff", transition: "all 0.15s",
              textAlign: "left",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#121212";
              e.currentTarget.style.color = "#f8f7f4";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.color = "#121212";
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}></div>
            <div style={{ fontWeight: "700", fontSize: "1rem", marginBottom: "0.5rem", letterSpacing: "0.05em" }}>
              INVESTOR
            </div>
            <div style={{ fontSize: "0.72rem", lineHeight: 1.6, opacity: 0.7 }}>
              Lihat campaign aktif, danai startup pilihan Anda, dan pantau portofolio investasi.
            </div>
            <div style={{ marginTop: "1rem", fontSize: "0.7rem", fontWeight: "700", letterSpacing: "0.1em" }}>
              MASUK →
            </div>
          </div>

          {/* Founder Card */}
          <div
            onClick={() => navigate("/founder")}
            style={{
              width: "220px", border: "2px solid #121212",
              padding: "2rem 1.5rem", cursor: "pointer",
              backgroundColor: "#fff", transition: "all 0.15s",
              textAlign: "left",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#121212";
              e.currentTarget.style.color = "#f8f7f4";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.color = "#121212";
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}></div>
            <div style={{ fontWeight: "700", fontSize: "1rem", marginBottom: "0.5rem", letterSpacing: "0.05em" }}>
              FOUNDER
            </div>
            <div style={{ fontSize: "0.72rem", lineHeight: 1.6, opacity: 0.7 }}>
              Buat campaign pendanaan untuk startup Anda, kelola progress, dan cairkan dana.
            </div>
            <div style={{ marginTop: "1rem", fontSize: "0.7rem", fontWeight: "700", letterSpacing: "0.1em" }}>
              MASUK →
            </div>
          </div>

        </div>

        {/* Catatan wallet */}
        {!account && (
          <p style={{ marginTop: "2rem", fontSize: "0.72rem", color: "#e63946" }}>
            ⚠ Connect MetaMask terlebih dahulu sebelum melakukan transaksi
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid #ddd", padding: "1rem 2rem",
        fontSize: "0.65rem", color: "#999", letterSpacing: "0.1em",
        textAlign: "center",
      }}>
        CHAINFUND DECENTRALIZED PROTOCOL // VERSION 2.0.0 // LOCAL HOST NETWORK
      </div>

    </div>
  );
}

export default LandingPage;