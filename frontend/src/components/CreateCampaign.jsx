import React, { useState } from "react";
import { ethers } from "ethers";
import { getWriteContract } from "../contracts/contract";

function CreateCampaign({ account, showToast, onSuccess }) {
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("0"); // Kategori Default
  const [newTarget, setNewTarget] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) {
      showToast("WALLET REQUIRED", "Please connect your wallet first.", "error");
      return;
    }

    if (!newTitle || !newDescription || !newTarget || !newDuration) {
      showToast("VALIDATION ERROR", "Please fill in all input fields.", "error");
      return;
    }

    try {
      setLoading(true);
      const contract = await getWriteContract();

      const categoryId = parseInt(newCategory);
      const targetInWei = ethers.parseEther(newTarget);
      const durationInDays = BigInt(newDuration);

      // Sesuai dengan ABI baru: buatCampaign(judul, deskripsi, kategoriId, targetDana, durasi)
      const tx = await contract.buatCampaign(newTitle, newDescription, targetInWei, durationInDays);
      showToast("TX SUBMITTED", "Deploying record to local ledger... please wait.", "info");
      
      await tx.wait();
      
      showToast("LEDGER UPDATED", "Campaign record written to blockchain successfully.", "success");
      
      // Clear inputs
      setNewTitle("");
      setNewDescription("");
      setNewCategory("0");
      setNewTarget("");
      setNewDuration("");
      
      // Notify parent to refresh ledger lists and balance
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      showToast("TX REVERTED", error.reason || error.message || "Failed to create campaign.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-campaign-container">
      <h2 className="panel-title">
        <span className="number">REG</span> INITIALIZE ENTRY
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">ENTRY IDENTIFIER / TITLE</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="PROPOSAL IDENTIFIER"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">CATEGORY</label>
          <select 
            className="form-input" 
            value={newCategory} 
            onChange={(e) => setNewCategory(e.target.value)}
            disabled={loading}
          >
            <option value="0">0x00 - TECHNOLOGY & IT</option>
            <option value="1">0x01 - SOCIAL & HUMANITY</option>
            <option value="2">0x02 - ENVIRONMENT</option>
            <option value="3">0x03 - BUSINESS & STARTUP</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">LEDGER MEMORANDUM / DESCRIPTION</label>
          <textarea 
            className="form-input" 
            placeholder="DETAILED INSTRUCTIONS AND PARAMETERS..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">FUNDING LIMIT (ETH)</label>
          <input 
            type="number" 
            step="any" 
            min="0.001" 
            className="form-input" 
            placeholder="1.00"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">REGISTRY LIFESPAN (DAYS)</label>
          <input 
            type="number" 
            min="1" 
            className="form-input" 
            placeholder="30"
            value={newDuration}
            onChange={(e) => setNewDuration(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <div className="loading-spinner"></div> : "PUBLISH ENTRY TO LEDGER"}
        </button>
      </form>
    </div>
  );
}

export default CreateCampaign;