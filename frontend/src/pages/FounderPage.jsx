import React from "react";
import WithdrawPanel from "../components/WithdrawPanel";
import CreateCampaign from "../components/CreateCampaign";

function FounderPage({ account, campaigns, loading, handleWithdraw, handleSuccess, showToast }) {
  return (
    <main className="main-layout">
      {/* Kiri: Founder Management Panel */}
      <section className="panel-left">
        <h2 className="panel-title"><span className="number">FOUNDER</span> MANAGEMENT STRIP</h2>
        <WithdrawPanel
          account={account}
          campaigns={campaigns}
          handleWithdraw={handleWithdraw}
          loading={loading}
        />
      </section>

      {/* Kanan: Form Buat Campaign */}
      <section className="panel-right">
        <CreateCampaign
          account={account}
          showToast={showToast}
          onSuccess={handleSuccess}
        />
      </section>
    </main>
  );
}

export default FounderPage;