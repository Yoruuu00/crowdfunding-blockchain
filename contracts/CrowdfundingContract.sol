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
        uint targetDana;       // dalam wei
        uint danaTerkumpul;
        uint deadline;         // unix timestamp
        bool aktif;
    }

    // ─────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────

    uint public jumlahCampaign = 0;

    // Campaign storage
    mapping(uint => Campaign) public campaigns;

    // Jumlah kontribusi per investor per campaign
    mapping(uint => mapping(address => uint)) public kontribusi;

    // Waktu investasi per investor per campaign (untuk refund 2 jam)
    mapping(uint => mapping(address => uint)) public waktuInvestasi;

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

    /**
     * @dev Founder membuat campaign baru
     * @param _judul Nama/judul campaign
     * @param _deskripsi Deskripsi campaign
     * @param _targetDana Target dana dalam wei
     * @param _durasiHari Durasi campaign dalam hari
     */
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

    /**
     * @dev Investor berinvestasi ke campaign
     * @param _campaignId ID campaign yang dituju
     * Mencatat waktu investasi untuk keperluan refund 2 jam
     */
    function investasi(uint _campaignId) public payable {
        Campaign storage c = campaigns[_campaignId];

        require(c.aktif, "Campaign tidak aktif");
        require(block.timestamp < c.deadline, "Campaign sudah berakhir");
        require(msg.value > 0, "Jumlah investasi harus lebih dari 0");

        c.danaTerkumpul += msg.value;
        kontribusi[_campaignId][msg.sender] += msg.value;

        // Catat waktu investasi untuk validasi refund 2 jam
        waktuInvestasi[_campaignId][msg.sender] = block.timestamp;

        emit DanaMasuk(_campaignId, msg.sender, msg.value);
    }

    /**
     * @dev Founder menarik dana setelah target tercapai
     * @param _campaignId ID campaign yang akan ditarik dananya
     */
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

    /**
     * @dev Investor membatalkan investasi dalam 2 jam
     * @param _campaignId ID campaign yang ingin di-refund
     * Fitur perlindungan dari human error — investor punya
     * jendela 2 jam untuk membatalkan investasi mereka
     */
    function refundDuaJam(uint _campaignId) public {
        uint jumlah = kontribusi[_campaignId][msg.sender];

        require(jumlah > 0, "Anda belum berinvestasi di campaign ini");
        require(
            block.timestamp <= waktuInvestasi[_campaignId][msg.sender] + 2 minutes,
            "Batas waktu refund 2 jam sudah lewat"
        );

        // Reset data investor sebelum transfer (cegah reentrancy)
        kontribusi[_campaignId][msg.sender] = 0;
        waktuInvestasi[_campaignId][msg.sender] = 0;
        campaigns[_campaignId].danaTerkumpul -= jumlah;

        // Kembalikan ETH ke investor
        payable(msg.sender).transfer(jumlah);

        emit RefundDilakukan(_campaignId, msg.sender, jumlah);
    }

    // ─────────────────────────────────────────
    // READ FUNCTIONS
    // ─────────────────────────────────────────

    /**
     * @dev Ambil semua campaign yang tersimpan
     * @return Array dari semua Campaign
     */
    function semuaCampaign() public view returns (Campaign[] memory) {
        Campaign[] memory hasil = new Campaign[](jumlahCampaign);
        for (uint i = 0; i < jumlahCampaign; i++) {
            hasil[i] = campaigns[i];
        }
        return hasil;
    }

    /**
     * @dev Cek jumlah kontribusi investor di campaign tertentu
     * @param _campaignId ID campaign
     * @param _investor Alamat wallet investor
     * @return Jumlah kontribusi dalam wei
     */
    function cekKontribusi(uint _campaignId, address _investor)
        public view returns (uint)
    {
        return kontribusi[_campaignId][_investor];
    }

    /**
     * @dev Cek waktu investasi investor di campaign tertentu
     * @param _campaignId ID campaign
     * @param _investor Alamat wallet investor
     * @return Unix timestamp saat investor berinvestasi
     */
    function cekWaktuInvestasi(uint _campaignId, address _investor)
        public view returns (uint)
    {
        return waktuInvestasi[_campaignId][_investor];
    }

    /**
     * @dev Cek apakah investor masih dalam window refund 2 jam
     * @param _campaignId ID campaign
     * @param _investor Alamat wallet investor
     * @return true jika masih bisa refund, false jika sudah lewat
     */
    function bisaRefund(uint _campaignId, address _investor)
        public view returns (bool)
    {
        uint waktu = waktuInvestasi[_campaignId][_investor];
        if (waktu == 0) return false;
        return block.timestamp <= waktu + 2 hours;
    }
}
