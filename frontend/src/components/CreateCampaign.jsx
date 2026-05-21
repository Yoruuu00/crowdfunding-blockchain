import React, { useState } from "react";
import { ethers } from "ethers";
import { getWriteContract } from "../contracts/contract";

function CreateCampaign({ account, showToast, onSuccess }) {
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
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

      const targetInWei = ethers.parseEther(newTarget);
      const durationInDays = BigInt(newDuration);

      const tx = await contract.buatCampaign(newTitle, newDescription, targetInWei, durationInDays);
      showToast("TX SUBMITTED", "Deploying record to local ledger... please wait.", "info");
      
      await tx.wait();
      
      showToast("LEDGER UPDATED", "Campaign record written to blockchain successfully.", "success");
      
      // Clear inputs
      setNewTitle("");
      setNewDescription("");
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
            step="0.01" 
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
