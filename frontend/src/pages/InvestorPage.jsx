import React from "react";
import MyPortfolio from "../components/MyPortfolio";

function InvestorPage({ account, campaigns, showToast, loadCampaigns }) {
  return (
    <main className="main-layout">
      <section className="panel-left" style={{ width: "100%" }}>
        <h2 className="panel-title"><span className="number">PORTFOLIO</span> INVESTOR HISTORY</h2>
        {!account ? (
          <div className="empty-state">
            <h3>ACCESS DENIED</h3>
            <p>PLEASE CONNECT YOUR WALLET TO VIEW YOUR INVESTMENT PORTFOLIO.</p>
          </div>
        ) : (
          <MyPortfolio
            account={account}
            campaigns={campaigns}
            showToast={showToast}
            loadCampaigns={loadCampaigns}
          />
        )}
      </section>
    </main>
  );
}

export default InvestorPage;