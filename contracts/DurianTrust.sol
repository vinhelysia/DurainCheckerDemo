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
        uint256 cadmiumPpm;       // ppm * 10000 (e.g. 0.030 ppm -> 300)
        uint256 thresholdPpm;     // ppm * 10000 (e.g. 0.050 ppm -> 500)
        string aiResultVi;
        string aiResultEn;
        uint256 confidence;       // score * 10000 (e.g. 0.94 -> 9400)
        RiskLevel riskLevel;
        string riskCauseVi;
        string riskCauseEn;
        bool exists;
    }

    uint256 public constant PPM_SCALE = 10000;
    uint256 private _nextTokenId = 8801;

    mapping(string => Batch) private _batches;
    mapping(string => TimelineEvent[]) private _batchTimelines;
    string[] private _batchIds;

    // Token Mappings
    mapping(uint256 => string) private _tokenToBatch;
    mapping(string => uint256) private _batchToToken;
    mapping(uint256 => address) private _tokenOwner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    event BatchRegistered(string indexed id, string farmVi, RiskLevel riskLevel, uint256 indexed tokenId);
    event TimelineEventAdded(string indexed id, string stageVi);

    constructor() {
        owner = msg.sender;
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
    ) public onlyOwner {
        require(!_batches[id].exists, "Batch already exists");

        _batches[id] = Batch({
            id: id,
            farmVi: farmVi,
            farmEn: farmEn,
            provinceVi: provinceVi,
            provinceEn: provinceEn,
            harvestDate: harvestDate,
            cadmiumPpm: cadmiumPpm,
            thresholdPpm: thresholdPpm,
            aiResultVi: aiResultVi,
            aiResultEn: aiResultEn,
            confidence: confidence,
            riskLevel: riskLevel,
            riskCauseVi: riskCauseVi,
            riskCauseEn: riskCauseEn,
            exists: true
        });

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
    ) public onlyOwner {
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
        return (
            b.farmVi,
            b.farmEn,
            b.provinceVi,
            b.provinceEn,
            b.harvestDate,
            b.cadmiumPpm,
            b.thresholdPpm,
            b.aiResultVi,
            b.aiResultEn,
            b.confidence,
            b.riskLevel,
            b.riskCauseVi,
            b.riskCauseEn
        );
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
