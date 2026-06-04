// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CrowdfundingContract {
    enum CampaignStatus { ACTIVE, FUNDED, FAILED, COMPLETED, CANCELED }

    struct Campaign {
        uint id;
        string judul;
        string deskripsi;
        uint8 kategoriId; 
        address payable pemilik;
        uint targetDana;
        uint danaTerkumpul;
        uint deadline;
        CampaignStatus status;
    }

    struct InvestasiData {
        uint jumlah;
        uint waktuInvestasi;
        bool direfund;
    }

    uint public jumlahCampaign = 0;

    mapping(uint => Campaign) public campaigns;
    mapping(uint => mapping(address => InvestasiData[])) public riwayatInvestasi;
    mapping(uint => mapping(address => uint)) public totalKontribusi;
    mapping(address => uint) public reputasiKreator;

    event CampaignDibuat(uint id, string judul, address pemilik, uint target, uint8 kategoriId);
    event DanaMasuk(uint campaignId, address investor, uint jumlah);
    event DanaDitarik(uint campaignId, address pemilik, uint jumlah);
    event RefundDiklaim(uint campaignId, address investor, uint jumlah);
    event CampaignUpdate(uint campaignId, string pesan);
    event StatusBerubah(uint campaignId, CampaignStatus statusBaru);

    function buatCampaign(
        string memory _judul,
        string memory _deskripsi,
        uint8 _kategoriId,
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
            kategoriId: _kategoriId,
            pemilik: payable(msg.sender),
            targetDana: _targetDana,
            danaTerkumpul: 0,
            deadline: block.timestamp + (_durasiHari * 1 days),
            status: CampaignStatus.ACTIVE
        });
        
        jumlahCampaign++;
        emit CampaignDibuat(id, _judul, msg.sender, _targetDana, _kategoriId);
    }

    function investasi(uint _campaignId) public payable {
        Campaign storage c = campaigns[_campaignId];
        
        if (c.status == CampaignStatus.ACTIVE && block.timestamp >= c.deadline) {
            c.status = CampaignStatus.FAILED;
            emit StatusBerubah(_campaignId, CampaignStatus.FAILED);
        }

        require(c.status == CampaignStatus.ACTIVE, "Campaign tidak menerima dana saat ini");
        require(block.timestamp < c.deadline, "Deadline campaign telah lewat");
        require(msg.value > 0, "Jumlah investasi harus lebih dari 0");

        c.danaTerkumpul += msg.value;
        totalKontribusi[_campaignId][msg.sender] += msg.value;
        
        riwayatInvestasi[_campaignId][msg.sender].push(InvestasiData({
            jumlah: msg.value,
            waktuInvestasi: block.timestamp,
            direfund: false
        }));

        emit DanaMasuk(_campaignId, msg.sender, msg.value);

        if (c.danaTerkumpul >= c.targetDana) {
            c.status = CampaignStatus.FUNDED;
            emit StatusBerubah(_campaignId, CampaignStatus.FUNDED);
        }
    }

    // Nama diubah sesuai permintaan
    function personRefund(uint _campaignId, uint _indexInvestasi) public {
        Campaign storage c = campaigns[_campaignId];
        require(c.status == CampaignStatus.ACTIVE || c.status == CampaignStatus.FUNDED, "Status tidak valid untuk refund");
        
        InvestasiData storage dataInvest = riwayatInvestasi[_campaignId][msg.sender][_indexInvestasi];
        require(!dataInvest.direfund, "Dana ini sudah direfund");
        require(block.timestamp <= dataInvest.waktuInvestasi + 2 hours, "Waktu batas refund 2 jam telah habis");

        uint jumlahRefund = dataInvest.jumlah;
        dataInvest.direfund = true; 
        
        c.danaTerkumpul -= jumlahRefund;
        totalKontribusi[_campaignId][msg.sender] -= jumlahRefund;

        if (c.status == CampaignStatus.FUNDED && c.danaTerkumpul < c.targetDana) {
            c.status = CampaignStatus.ACTIVE;
            emit StatusBerubah(_campaignId, CampaignStatus.ACTIVE);
        }

        payable(msg.sender).transfer(jumlahRefund);
        emit RefundDiklaim(_campaignId, msg.sender, jumlahRefund);
    }

    function klaimRefundGagal(uint _campaignId) public {
        Campaign storage c = campaigns[_campaignId];
        
        if (c.status == CampaignStatus.ACTIVE && block.timestamp >= c.deadline) {
            c.status = CampaignStatus.FAILED;
            emit StatusBerubah(_campaignId, CampaignStatus.FAILED);
        }

        require(c.status == CampaignStatus.FAILED, "Campaign belum dinyatakan gagal");
        
        uint jumlah = totalKontribusi[_campaignId][msg.sender];
        require(jumlah > 0, "Tidak ada dana yang bisa diklaim atau sudah ditarik");

        totalKontribusi[_campaignId][msg.sender] = 0; 
        payable(msg.sender).transfer(jumlah);

        emit RefundDiklaim(_campaignId, msg.sender, jumlah);
    }

    function tarikDana(uint _campaignId) public {
        Campaign storage c = campaigns[_campaignId];
        require(msg.sender == c.pemilik, "Hanya pemilik yang bisa tarik dana");
        require(c.status == CampaignStatus.FUNDED, "Target belum tercapai atau dana sudah ditarik");

        c.status = CampaignStatus.COMPLETED;
        reputasiKreator[msg.sender] += 1; 
        
        emit StatusBerubah(_campaignId, CampaignStatus.COMPLETED);

        uint jumlah = c.danaTerkumpul;
        c.pemilik.transfer(jumlah);

        emit DanaDitarik(_campaignId, msg.sender, jumlah);
    }

    function tambahUpdate(uint _campaignId, string memory _pesan) public {
        require(msg.sender == campaigns[_campaignId].pemilik, "Hanya pemilik yang dapat memberi update");
        emit CampaignUpdate(_campaignId, _pesan);
    }

    function getCampaigns(uint _offset, uint _limit) public view returns (Campaign[] memory) {
        uint end = _offset + _limit;
        if (end > jumlahCampaign) {
            end = jumlahCampaign;
        }
        
        uint size = end - _offset;
        Campaign[] memory hasil = new Campaign[](size);
        
        for (uint i = 0; i < size; i++) {
            hasil[i] = campaigns[_offset + i];
        }
        return hasil;
    }

    function getJumlahInvestasiUser(uint _campaignId, address _investor) public view returns (uint) {
        return riwayatInvestasi[_campaignId][_investor].length;
    }
}