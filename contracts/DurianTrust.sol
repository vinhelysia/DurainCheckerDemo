// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DurianTrust {
    address public owner;

    enum RiskLevel { Low, Medium, High }

    struct TimelineEvent {
        string stageVi;
        string stageEn;
        string locationVi;
        string locationEn;
        string date;
        uint8 status; // 0 = pending, 1 = complete
    }

    struct Batch {
        string id;
        string farmVi;
        string farmEn;
        string provinceVi;
        string provinceEn;
        string harvestDate;
        bool exists;
    }

    struct LabReport {
        uint256 cadmiumPpm;       // ppm * 10000 (e.g. 0.030 ppm -> 300)
        uint256 thresholdPpm;     // ppm * 10000 (e.g. 0.050 ppm -> 500)
        string aiResultVi;
        string aiResultEn;
        uint256 confidence;       // score * 10000 (e.g. 0.94 -> 9400)
        RiskLevel riskLevel;
        string riskCauseVi;
        string riskCauseEn;
        uint256 timestamp;
        address reporter;
    }

    uint256 public constant PPM_SCALE = 10000;
    uint256 private _nextTokenId = 8801;

    mapping(string => Batch) private _batches;
    mapping(string => LabReport[]) private _batchLabReports;
    mapping(string => TimelineEvent[]) private _batchTimelines;
    string[] private _batchIds;

    // Token Mappings
    mapping(uint256 => string) private _tokenToBatch;
    mapping(string => uint256) private _batchToToken;
    mapping(uint256 => address) private _tokenOwner;

    // Role Mappings
    mapping(address => bool) private _farmers;
    mapping(address => bool) private _labs;
    mapping(address => bool) private _logisticsActors;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier onlyFarmerOrOwner() {
        require(msg.sender == owner || _farmers[msg.sender], "Only farmer or owner can call this");
        _;
    }

    modifier onlyLabOrOwner() {
        require(msg.sender == owner || _labs[msg.sender], "Only lab or owner can call this");
        _;
    }

    modifier onlyLogisticsOrOwner() {
        require(msg.sender == owner || _logisticsActors[msg.sender], "Only logistics actor or owner can call this");
        _;
    }

    event BatchRegistered(string indexed id, string farmVi, RiskLevel riskLevel, uint256 indexed tokenId);
    event TimelineEventAdded(string indexed id, string stageVi);
    event LabReportUpdated(string indexed id, uint256 cadmiumPpm, RiskLevel riskLevel);

    event FarmerAdded(address indexed account);
    event FarmerRemoved(address indexed account);
    event LabAdded(address indexed account);
    event LabRemoved(address indexed account);
    event LogisticsAdded(address indexed account);
    event LogisticsRemoved(address indexed account);

    constructor() {
        owner = msg.sender;
    }

    // Role Management
    function addFarmer(address account) public onlyOwner {
        _farmers[account] = true;
        emit FarmerAdded(account);
    }

    function removeFarmer(address account) public onlyOwner {
        _farmers[account] = false;
        emit FarmerRemoved(account);
    }

    function addLab(address account) public onlyOwner {
        _labs[account] = true;
        emit LabAdded(account);
    }

    function removeLab(address account) public onlyOwner {
        _labs[account] = false;
        emit LabRemoved(account);
    }

    function addLogistics(address account) public onlyOwner {
        _logisticsActors[account] = true;
        emit LogisticsAdded(account);
    }

    function removeLogistics(address account) public onlyOwner {
        _logisticsActors[account] = false;
        emit LogisticsRemoved(account);
    }

    function isFarmer(address account) public view returns (bool) {
        return _farmers[account];
    }

    function isLab(address account) public view returns (bool) {
        return _labs[account];
    }

    function isLogistics(address account) public view returns (bool) {
        return _logisticsActors[account];
    }

    function registerBatch(
        string memory id,
        string memory farmVi,
        string memory farmEn,
        string memory provinceVi,
        string memory provinceEn,
        string memory harvestDate,
        uint256 cadmiumPpm,
        uint256 thresholdPpm,
        string memory aiResultVi,
        string memory aiResultEn,
        uint256 confidence,
        RiskLevel riskLevel,
        string memory riskCauseVi,
        string memory riskCauseEn
    ) public onlyFarmerOrOwner {
        require(!_batches[id].exists, "Batch already exists");

        _batches[id] = Batch({
            id: id,
            farmVi: farmVi,
            farmEn: farmEn,
            provinceVi: provinceVi,
            provinceEn: provinceEn,
            harvestDate: harvestDate,
            exists: true
        });

        _batchLabReports[id].push(LabReport({
            cadmiumPpm: cadmiumPpm,
            thresholdPpm: thresholdPpm,
            aiResultVi: aiResultVi,
            aiResultEn: aiResultEn,
            confidence: confidence,
            riskLevel: riskLevel,
            riskCauseVi: riskCauseVi,
            riskCauseEn: riskCauseEn,
            timestamp: block.timestamp,
            reporter: msg.sender
        }));

        uint256 tokenId = _nextTokenId;
        _tokenToBatch[tokenId] = id;
        _batchToToken[id] = tokenId;
        _tokenOwner[tokenId] = msg.sender;
        _nextTokenId++;

        _batchIds.push(id);
        emit BatchRegistered(id, farmVi, riskLevel, tokenId);
    }

    function addTimelineEvent(
        string memory id,
        string memory stageVi,
        string memory stageEn,
        string memory locationVi,
        string memory locationEn,
        string memory date,
        uint8 status
    ) public onlyLogisticsOrOwner {
        require(_batches[id].exists, "Batch does not exist");
        _batchTimelines[id].push(TimelineEvent({
            stageVi: stageVi,
            stageEn: stageEn,
            locationVi: locationVi,
            locationEn: locationEn,
            date: date,
            status: status
        }));
        emit TimelineEventAdded(id, stageVi);
    }

    function updateLabReport(
        string memory id,
        uint256 cadmiumPpm,
        uint256 thresholdPpm,
        string memory aiResultVi,
        string memory aiResultEn,
        uint256 confidence,
        RiskLevel riskLevel,
        string memory riskCauseVi,
        string memory riskCauseEn
    ) public onlyLabOrOwner {
        require(_batches[id].exists, "Batch does not exist");
        _batchLabReports[id].push(LabReport({
            cadmiumPpm: cadmiumPpm,
            thresholdPpm: thresholdPpm,
            aiResultVi: aiResultVi,
            aiResultEn: aiResultEn,
            confidence: confidence,
            riskLevel: riskLevel,
            riskCauseVi: riskCauseVi,
            riskCauseEn: riskCauseEn,
            timestamp: block.timestamp,
            reporter: msg.sender
        }));
        emit LabReportUpdated(id, cadmiumPpm, riskLevel);
    }

    function getBatch(string memory id) public view returns (
        string memory farmVi,
        string memory farmEn,
        string memory provinceVi,
        string memory provinceEn,
        string memory harvestDate,
        uint256 cadmiumPpm,
        uint256 thresholdPpm,
        string memory aiResultVi,
        string memory aiResultEn,
        uint256 confidence,
        RiskLevel riskLevel,
        string memory riskCauseVi,
        string memory riskCauseEn
    ) {
        require(_batches[id].exists, "Batch does not exist");
        Batch memory b = _batches[id];
        require(_batchLabReports[id].length > 0, "No lab reports");
        LabReport memory latest = _batchLabReports[id][_batchLabReports[id].length - 1];
        return (
            b.farmVi,
            b.farmEn,
            b.provinceVi,
            b.provinceEn,
            b.harvestDate,
            latest.cadmiumPpm,
            latest.thresholdPpm,
            latest.aiResultVi,
            latest.aiResultEn,
            latest.confidence,
            latest.riskLevel,
            latest.riskCauseVi,
            latest.riskCauseEn
        );
    }

    function getLabReportHistory(string memory id) public view returns (LabReport[] memory) {
        require(_batches[id].exists, "Batch does not exist");
        return _batchLabReports[id];
    }

    function getLatestLabReport(string memory id) public view returns (LabReport memory) {
        require(_batches[id].exists, "Batch does not exist");
        require(_batchLabReports[id].length > 0, "No lab reports");
        return _batchLabReports[id][_batchLabReports[id].length - 1];
    }

    function getTimeline(string memory id) public view returns (TimelineEvent[] memory) {
        require(_batches[id].exists, "Batch does not exist");
        return _batchTimelines[id];
    }

    function getBatchIds() public view returns (string[] memory) {
        return _batchIds;
    }

    // Token ID Resolution Functions
    function getBatchIdByTokenId(uint256 tokenId) public view returns (string memory) {
        require(bytes(_tokenToBatch[tokenId]).length > 0, "Token ID not registered");
        return _tokenToBatch[tokenId];
    }

    function getRegistrant(uint256 tokenId) public view returns (address) {
        require(_tokenOwner[tokenId] != address(0), "Token ID not registered");
        return _tokenOwner[tokenId];
    }

    function getTokenIdByBatchId(string memory batchId) public view returns (uint256) {
        require(_batchToToken[batchId] != 0, "Batch not registered");
        return _batchToToken[batchId];
    }
}
