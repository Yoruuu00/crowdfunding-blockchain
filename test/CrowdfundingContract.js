const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrowdfundingContract", function () {
  async function deployCrowdfundingFixture() {
    const [owner, creator, investor1, investor2] = await ethers.getSigners();

    const Crowdfunding = await ethers.getContractFactory("CrowdfundingContract");
    const crowdfunding = await Crowdfunding.deploy();

    return { crowdfunding, owner, creator, investor1, investor2 };
  }

  describe("Deployment & Create Campaign", function () {
    it("Harus membuat campaign dengan data yang benar", async function () {
      const { crowdfunding, creator } = await loadFixture(deployCrowdfundingFixture);

      const targetDana = ethers.parseEther("1.0");
      const durasiHari = 7;
      const kategoriId = 0;

      await expect(crowdfunding.connect(creator).buatCampaign(
        "Proyek Alpha",
        "Deskripsi proyek Alpha",
        kategoriId,
        targetDana,
        durasiHari
      ))
        .to.emit(crowdfunding, "CampaignDibuat")
        .withArgs(0, "Proyek Alpha", creator.address, targetDana, kategoriId);

      const campaign = await crowdfunding.campaigns(0);
      expect(campaign.judul).to.equal("Proyek Alpha");
      expect(campaign.status).to.equal(0);
    });
  });

  describe("Siklus Investasi & Tarik Dana (Skenario Sukses)", function () {
    it("Harus menerima investasi dan otomatis menjadi FUNDED jika target tercapai", async function () {
      const { crowdfunding, creator, investor1 } = await loadFixture(deployCrowdfundingFixture);
      const targetDana = ethers.parseEther("1.0");
      
      await crowdfunding.connect(creator).buatCampaign("Test", "Test", 0, targetDana, 7);

      await expect(crowdfunding.connect(investor1).investasi(0, { value: targetDana }))
        .to.emit(crowdfunding, "DanaMasuk")
        .withArgs(0, investor1.address, targetDana)
        .and.to.emit(crowdfunding, "StatusBerubah")
        .withArgs(0, 1);

      const campaign = await crowdfunding.campaigns(0);
      expect(campaign.status).to.equal(1);
    });

    it("Kreator harus bisa menarik dana jika status FUNDED", async function () {
      const { crowdfunding, creator, investor1 } = await loadFixture(deployCrowdfundingFixture);
      const targetDana = ethers.parseEther("1.0");
      
      await crowdfunding.connect(creator).buatCampaign("Test", "Test", 0, targetDana, 7);
      await crowdfunding.connect(investor1).investasi(0, { value: targetDana });

      await expect(crowdfunding.connect(creator).tarikDana(0))
        .to.emit(crowdfunding, "DanaDitarik")
        .withArgs(0, creator.address, targetDana)
        .and.to.emit(crowdfunding, "StatusBerubah")
        .withArgs(0, 3);

      const reputasi = await crowdfunding.reputasiKreator(creator.address);
      expect(reputasi).to.equal(1);
    });
  });

  describe("Siklus Refund", function () {
    it("Harus bisa memproses personRefund (2 Jam) dan mengubah status kembali ke ACTIVE", async function () {
      const { crowdfunding, creator, investor1 } = await loadFixture(deployCrowdfundingFixture);
      const targetDana = ethers.parseEther("1.0");
      
      await crowdfunding.connect(creator).buatCampaign("Test", "Test", 0, targetDana, 7);
      
      await crowdfunding.connect(investor1).investasi(0, { value: targetDana });
      
      let campaign = await crowdfunding.campaigns(0);
      expect(campaign.status).to.equal(1); 

      // Pemanggilan method personRefund
      await expect(crowdfunding.connect(investor1).personRefund(0, 0))
        .to.emit(crowdfunding, "RefundDiklaim")
        .withArgs(0, investor1.address, targetDana)
        .and.to.emit(crowdfunding, "StatusBerubah")
        .withArgs(0, 0); 

      campaign = await crowdfunding.campaigns(0);
      expect(campaign.danaTerkumpul).to.equal(0);
    });

    it("Harus menolak personRefund jika waktu telah lewat 2 jam", async function () {
      const { crowdfunding, creator, investor1 } = await loadFixture(deployCrowdfundingFixture);
      
      await crowdfunding.connect(creator).buatCampaign("Test", "Test", 0, ethers.parseEther("1.0"), 7);
      await crowdfunding.connect(investor1).investasi(0, { value: ethers.parseEther("0.5") });

      await time.increase(3 * 60 * 60); 

      // Pemanggilan method personRefund
      await expect(crowdfunding.connect(investor1).personRefund(0, 0))
        .to.be.revertedWith("Waktu batas refund 2 jam telah habis");
    });

    it("Harus mengizinkan klaim refund massal jika campaign gagal (waktu habis, target tidak tercapai)", async function () {
      const { crowdfunding, creator, investor1 } = await loadFixture(deployCrowdfundingFixture);
      
      await crowdfunding.connect(creator).buatCampaign("Test", "Test", 0, ethers.parseEther("2.0"), 7);
      
      const investAmount = ethers.parseEther("1.0");
      await crowdfunding.connect(investor1).investasi(0, { value: investAmount });

      await time.increase(8 * 24 * 60 * 60); 

      await expect(crowdfunding.connect(investor1).klaimRefundGagal(0))
        .to.emit(crowdfunding, "StatusBerubah")
        .withArgs(0, 2) 
        .and.to.emit(crowdfunding, "RefundDiklaim")
        .withArgs(0, investor1.address, investAmount);

      const totalKontribusi = await crowdfunding.totalKontribusi(0, investor1.address);
      expect(totalKontribusi).to.equal(0);
    });
  });
});