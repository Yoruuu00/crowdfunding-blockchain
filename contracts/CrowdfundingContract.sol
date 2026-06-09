// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CrowdfundingContract {

    // ─────────────────────────────────────────
    // DATA STRUCTURES
    // ─────────────────────────────────────────

    struct Campaign {
        uint id;
        string judul;
        string deskripsi;
        address payable pemilik;
        uint targetDana;
        uint danaTerkumpul;
        uint deadline;
        bool aktif;
    }

    // ─────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────

    uint public jumlahCampaign = 0;

    mapping(uint => Campaign) public campaigns;
    mapping(uint => mapping(address => uint)) public kontribusi;
    mapping(uint => mapping(address => uint)) public waktuInvestasi;

    // Lapis 1: Cegah refund berulang — 1x per investor per campaign
    mapping(uint => mapping(address => bool)) public sudahRefund;

    // ─────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────

    event CampaignDibuat(uint id, string judul, address pemilik, uint target);
    event DanaMasuk(uint campaignId, address investor, uint jumlah);
    event DanaDitarik(uint campaignId, address pemilik, uint jumlah);
    event RefundDilakukan(uint campaignId, address investor, uint jumlah);

    // ─────────────────────────────────────────
    // WRITE FUNCTIONS
    // ─────────────────────────────────────────

    function buatCampaign(
        string memory _judul,
        string memory _deskripsi,
        uint _targetDana,
        uint _durasiHari
    ) public {
        require(_targetDana > 0, "Target harus lebih dari 0");
        require(_durasiHari > 0, "Durasi minimal 1 hari");

        uint id = jumlahCampaign;
        campaigns[id] = Campaign({
            id: id,
            judul: _judul,
            deskripsi: _deskripsi,
            pemilik: payable(msg.sender),
            targetDana: _targetDana,
            danaTerkumpul: 0,
            deadline: block.timestamp + (_durasiHari * 1 days),
            aktif: true
        });

        jumlahCampaign++;
        emit CampaignDibuat(id, _judul, msg.sender, _targetDana);
    }

    function investasi(uint _campaignId) public payable {
        Campaign storage c = campaigns[_campaignId];
        require(c.aktif, "Campaign tidak aktif");
        require(block.timestamp < c.deadline, "Campaign sudah berakhir");
        require(msg.value > 0, "Jumlah investasi harus lebih dari 0");

        c.danaTerkumpul += msg.value;
        kontribusi[_campaignId][msg.sender] += msg.value;
        waktuInvestasi[_campaignId][msg.sender] = block.timestamp;

        emit DanaMasuk(_campaignId, msg.sender, msg.value);
    }

    function tarikDana(uint _campaignId) public {
        Campaign storage c = campaigns[_campaignId];
        require(msg.sender == c.pemilik, "Hanya pemilik yang bisa tarik dana");
        require(c.danaTerkumpul >= c.targetDana, "Target belum tercapai");
        require(c.aktif, "Campaign tidak aktif");

        c.aktif = false;
        uint jumlah = c.danaTerkumpul;
        c.pemilik.transfer(jumlah);

        emit DanaDitarik(_campaignId, msg.sender, jumlah);
    }

    function refundDuaJam(uint _campaignId) public {
        uint jumlah = kontribusi[_campaignId][msg.sender];

        require(jumlah > 0, "Anda belum berinvestasi di campaign ini");
        require(
            block.timestamp <= waktuInvestasi[_campaignId][msg.sender] + 2 minutes,
            "Batas waktu refund 2 jam sudah lewat"
        );
        // Lapis 1: Cegah refund berulang
        require(
            !sudahRefund[_campaignId][msg.sender],
            "Anda sudah menggunakan hak refund untuk campaign ini"
        );

        // Reset data sebelum transfer (cegah reentrancy)
        kontribusi[_campaignId][msg.sender] = 0;
        waktuInvestasi[_campaignId][msg.sender] = 0;
        campaigns[_campaignId].danaTerkumpul -= jumlah;

        // Tandai sudah refund — tidak bisa refund lagi
        sudahRefund[_campaignId][msg.sender] = true;

        payable(msg.sender).transfer(jumlah);
        emit RefundDilakukan(_campaignId, msg.sender, jumlah);
    }

    // ─────────────────────────────────────────
    // READ FUNCTIONS
    // ─────────────────────────────────────────

    function semuaCampaign() public view returns (Campaign[] memory) {
        Campaign[] memory hasil = new Campaign[](jumlahCampaign);
        for (uint i = 0; i < jumlahCampaign; i++) {
            hasil[i] = campaigns[i];
        }
        return hasil;
    }

    function cekKontribusi(uint _campaignId, address _investor)
        public view returns (uint)
    {
        return kontribusi[_campaignId][_investor];
    }

    function cekWaktuInvestasi(uint _campaignId, address _investor)
        public view returns (uint)
    {
        return waktuInvestasi[_campaignId][_investor];
    }

    function bisaRefund(uint _campaignId, address _investor)
        public view returns (bool)
    {
        if (sudahRefund[_campaignId][_investor]) return false;
        uint waktu = waktuInvestasi[_campaignId][_investor];
        if (waktu == 0) return false;
        return block.timestamp <= waktu + 2 hours;
    }
}
