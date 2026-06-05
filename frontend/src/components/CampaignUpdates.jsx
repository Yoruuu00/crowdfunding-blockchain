import React, { useState, useEffect } from "react";
import { getReadOnlyContract, getWriteContract } from "../contracts/contract";

function CampaignUpdates({ campaignId, isOwner, account, showToast }) {
  const [updates, setUpdates] = useState([]);
  const [pesan, setPesan] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [fetching, setFetching] = useState(false);

  const fetchUpdates = async () => {
    try {
      setFetching(true);
      const contract = getReadOnlyContract();
      
      // Mengambil event log khusus untuk campaignId ini
      const filter = contract.filters.CampaignUpdate(campaignId);
      const events = await contract.queryFilter(filter);
      
      const parsedUpdates = await Promise.all(events.map(async (e) => {
        const block = await e.getBlock();
        return {
          pesan: e.args[1],
          waktu: new Date(block.timestamp * 1000).toLocaleString()
        };
      }));
      
      // Urutkan dari yang terbaru
      setUpdates(parsedUpdates.reverse());
    } catch (error) {
      console.error("Error fetching updates:", error);
    } finally {
      setFetching(false);
    }
  };

  // Hanya fetch data (membaca blockchain) ketika panel dibuka untuk menghemat RPC calls
  useEffect(() => {
    if (isOpen) {
      fetchUpdates();
    }
  }, [isOpen, campaignId]);

  const handlePostUpdate = async () => {
    if (!pesan.trim()) {
      showToast("VALIDATION ERROR", "Update message cannot be empty.", "error");
      return;
    }

    try {
      setLoading(true);
      const contract = await getWriteContract();
      const tx = await contract.tambahUpdate(campaignId, pesan);
      showToast("TX SUBMITTED", "Broadcasting campaign update...", "info");
      
      await tx.wait();
      showToast("UPDATE POSTED", "Message successfully written to blockchain logs.", "success");
      
      setPesan("");
      fetchUpdates(); // Refresh list
    } catch (error) {
      console.error(error);
      showToast("TX REVERTED", error.reason || error.message || "Failed to post update.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "1rem", borderTop: "1px dashed var(--text-dim)", paddingTop: "1rem" }}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ 
          background: "transparent", border: "none", color: "var(--accent-blue)", 
          fontFamily: "var(--font-mono)", fontSize: "0.85rem", cursor: "pointer", padding: 0 
        }}
      >
        {isOpen ? "[-] HIDE CAMPAIGN UPDATES" : "[+] SHOW CAMPAIGN UPDATES"}
      </button>

      {isOpen && (
        <div style={{ marginTop: "1rem" }}>
          {isOwner && (
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Write an update for investors..." 
                value={pesan}
                onChange={(e) => setPesan(e.target.value)}
                disabled={loading}
                style={{ margin: 0, flex: 1 }}
              />
              <button className="btn-primary" onClick={handlePostUpdate} disabled={loading}>
                {loading ? "POSTING..." : "POST UPDATE"}
              </button>
            </div>
          )}

          {fetching ? (
            <div className="ledger-cell-value">QUERYING BLOCKCHAIN LOGS...</div>
          ) : updates.length === 0 ? (
            <div className="ledger-cell-value" style={{ color: "var(--text-dim)" }}>NO UPDATES PUBLISHED YET.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {updates.map((upd, idx) => (
                <div key={idx} style={{ background: "#f8f7f4", padding: "0.75rem", borderLeft: "3px solid var(--accent-blue)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>TIMESTAMP: {upd.waktu}</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>{upd.pesan}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CampaignUpdates;