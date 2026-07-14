/**
 * UI copy (VI/EN).
 *
 * Export verdict glossary (use everywhere for low|medium|high export gate):
 *   VI: Đạt xuất khẩu | Cần xem lại | Giữ lô
 *   EN: Export-ready | Needs review | Hold
 *
 * Disease risk (diseaseModel only — not export gate):
 *   VI/EN: Rủi ro thấp|trung bình|cao / Low|Medium|High risk
 *
 * Keep instruction names (registerBatch, …) out of primary UI; use human labels.
 */
export const copyData = {
  vi: {
    skipLink: 'Bỏ qua điều hướng',
    common: {
      warmingUpModel: 'Đang khởi động mô hình AI, vui lòng đợi…',
      retry: 'Thử lại',
      aiUnavailable: 'Mô hình AI tạm thời không phản hồi. Vui lòng thử lại.',
    },
    header: {
      nav: {
        home: 'Trang chủ',
        intro: 'Giới thiệu',
        units: 'Chuỗi cung ứng',
        problem: 'Vấn đề',
        solution: 'Giải pháp',
        impact: 'Tác động',
        farm: 'Vườn trồng',
        transport: 'Vận chuyển',
        testing: 'Kiểm nghiệm',
        export: 'Xuất khẩu',
        demo: 'Tra cứu lô',
        manage: 'Cổng quản lý',
      },
      ariaLabel: 'Điều hướng chính',
      landingMenuAria: 'Các phần trong giới thiệu',
      mobileNavAria: 'Điều hướng trên di động',
      mobileMenuOpen: 'Mở menu điều hướng',
      mobileMenuClose: 'Đóng menu điều hướng',
      languageSwitchAria: 'Chọn ngôn ngữ',
    },
    hero: {
      eyebrow: 'Sầu riêng xuất khẩu · hồ sơ quét được',
      title: 'Từ vườn tới cửa khẩu, mỗi lô mang theo giấy tờ theo dõi',
      lead: 'Thu hoạch, phiếu lab Cadimi, chặng lạnh — một hồ sơ. Quét QR là mở được, không lục PDF rời.',
      ctaDemo: 'Thử quét một lô mẫu',
      ctaProblem: 'Vì sao lô bị giữ?',
      batchProof: 'Chứng thư kiểm định',
      ledgerEvents: '4 mốc trên sổ · Đạt xuất khẩu · Cadimi trong ngưỡng',
      verified: 'Đã xác thực',
      ariaLabelLedger: 'Mẫu trạng thái lô hàng',
      ariaLabelActions: 'Hành động chính',
      photoAlt: 'Sầu riêng chín trên bàn gỗ, ảnh tư liệu',
    },
    landing: {
      journeyTitle: 'Đường đi của một lô xuất khẩu',
      journeyLead: 'Bốn chặng hay kẹt hồ sơ nhất. Mỗi chặng ghi một mốc, không sửa lặng lẽ.',
      journeyAria: 'Hành trình lô hàng',
      steps: [
        {
          title: 'Vườn',
          text: 'Ngày thu hoạch và mã số vùng trồng (PUC) dính vào lô ngay từ đầu.',
          href: '#/unit/farm',
          alt: 'Vườn sầu riêng',
          image: 'orchard.webp',
        },
        {
          title: 'Lab',
          text: 'Phiếu Cadimi và Vàng O được lab ký số; báo cáo băm để đối chiếu sau này.',
          href: '#/unit/testing',
          alt: 'Kỹ thuật viên xử lý mẫu trong phòng lab',
          image: 'lab.webp',
        },
        {
          title: 'Lạnh',
          text: 'Nhiệt độ container và mốc giao nhận được ghi theo chặng, không chỉ “đã giao”.',
          href: '#/unit/transport',
          alt: 'Container lạnh xếp tại bãi',
          image: 'reefer.webp',
        },
        {
          title: 'Cảng',
          text: 'Hồ sơ thông quan khớp với các mốc trước đó khi hải quan hỏi.',
          href: '#/unit/export',
          alt: 'Tàu container tại cảng',
          image: 'port.webp',
        },
      ],
      recordTitle: 'Trên sổ ghi những gì?',
      recordLead: 'Bốn việc chính — từ lúc mở lô đến lúc ai cũng đối chiếu được.',
      records: [
        { name: 'Đăng ký lô', detail: 'Mã lô, vùng trồng, ngày thu hoạch.' },
        { name: 'Ghi mốc hành trình', detail: 'Canh tác, đóng gói, chặng lạnh.' },
        { name: 'Xác nhận phiếu lab', detail: 'Lab ký số lên báo cáo đã băm.' },
        { name: 'Đối chiếu chứng thư', detail: 'Ai cũng kiểm chữ ký và mã băm trên blockchain.' },
      ],
    },
    problem: {
      kicker: '',
      title: 'Vì sao lô sầu riêng vẫn bị kẹt ở cửa khẩu?',
      body1: 'Nhiều lô Việt Nam bị cảnh báo hoặc dừng thông quan khi phía nhập khẩu siết Cadimi và Vàng O.',
      body2: 'Trái có thể đạt. Hồ sơ thì rời: phiếu lab PDF, mã vùng trồng mượn, nhiệt độ container không ai đưa ra kịp.',
      photoCaption: 'Sầu riêng là ngành tỷ đô. Một phát hiện dư lượng có thể giữ cả container.',
      photo: 'market.webp',
      figures: [
        { value: '0.05 ppm', label: 'Ngưỡng Cadimi tối đa theo quy định hải quan Trung Quốc (GACC)' },
        { value: '248/249', label: 'Hai nghị định siết nguồn gốc và an toàn thực phẩm trong nước' },
        { value: '2025', label: 'Năm kiểm tra cửa khẩu gắt hơn với Vàng O' },
      ],
      newsTitle: 'Báo chí đã viết về chuyện này',
      newsAria: 'Tin tức về xuất khẩu sầu riêng',
      news: [
        { source: 'SGGP', title: 'Ngành sầu riêng lao đao khi Trung Quốc trả hàng vì dư lượng hóa chất', href: 'https://en.sggp.org.vn/vietnams-durian-industry-reeling-as-china-rejects-shipments-over-contaminants-post117622.html' },
        { source: 'VietnamPlus', title: 'Việt Nam siết kiểm soát chất lượng sầu riêng để giữ thị trường tỷ đô', href: 'https://en.vietnamplus.vn/vietnam-steps-up-quality-control-of-durian-exports-to-retain-billion-dollar-market-post321595.vnp' },
        { source: 'MOIT / VNTR', title: 'Trung Quốc siết quy định nhập khẩu đối với sầu riêng Việt Nam', href: 'https://vntr.moit.gov.vn/news/china-tightens-import-rules-on-vietnamese-durians' },
        { source: 'Tuổi Trẻ', title: 'Sầu riêng xuất khẩu sang Trung Quốc giảm sâu, Bộ trưởng chỉ đạo loạt giải pháp', href: 'https://tuoitre.vn/sau-rieng-xuat-khau-sang-trung-quoc-giam-sau-bo-truong-do-duc-duy-chi-dao-loat-giai-phap-20250508164730467.htm' },
      ],
      bridgeTitle: 'Trái ngon chưa đủ. Hải quan cần giấy tờ mở được ngay. DurianTrust thử ghi lại hồ sơ đó trên một sổ chung (demo học thuật).',
      bridgeButton: 'Xem cách ghi sổ',
      disclaimer: 'Demo minh họa quy trình truy xuất — không thay kết quả kiểm nghiệm chính thức.',
      pointsAriaLabel: 'Các thách thức xuất khẩu chính',
      points: [
        {
          icon: 'shield',
          title: 'Mượn mã vùng trồng (PUC)',
          desc: 'Lô mang mã của vườn khác. Khi bị hỏi nguồn gốc, cả vùng dễ dính đòn.',
          image: 'orchard.webp',
        },
        {
          icon: 'temp',
          title: 'Container không có sổ nhiệt',
          desc: 'Không chứng minh được 2–4 °C suốt đường đi, hàng chín ép trong thùng trước cửa khẩu.',
          image: 'reefer.webp',
        },
        {
          icon: 'file',
          title: 'Phiếu lab PDF rời',
          desc: 'Cadimi và Vàng O nằm rải rác bản in/PDF, sửa số thì khó biết, mang ra đối chiếu thì chậm.',
          image: 'lab.webp',
        },
        {
          icon: 'clock',
          title: 'Sự cố thì mất cả tuần truy vết',
          desc: 'Vượt ngưỡng ở biên giới rồi mới gọi từng nông trại — lúc đó container đã nằm chờ.',
          image: 'port.webp',
        },
      ],
    },
    solution: {
      kicker: '',
      title: 'Mỗi lô một hồ sơ: vườn → lab → lạnh → cảng',
      pillars: [
        {
          title: 'Ghi sổ theo mốc',
          subtitle: 'Chỉ thêm, không xóa lặng',
          body: 'Thu hoạch, lab, đóng gói, xuất — mỗi bước thêm một dòng. Hôm qua viết gì, hôm nay vẫn đọc được.',
          tags: ['Ghi sổ', 'Mốc hành trình'],
          image: 'port.webp',
        },
        {
          title: 'Khoanh vùng khi bị cảnh báo',
          subtitle: 'Vườn · tỉnh · chặng',
          body: 'Lô cờ đỏ thì lần ra nông trại và vùng — ví dụ Đắk Lắk, Tiền Giang, Đồng Nai — và chặng phát sinh rủi ro.',
          tags: ['Hồ sơ lô', 'Nhật ký chuỗi'],
          image: 'orchard.webp',
        },
        {
          title: 'Cổng Cadimi theo quy tắc',
          subtitle: 'So với 0.05 ppm',
          body: 'Lab nhập số → hệ thống so ngưỡng minh họa → Đạt xuất khẩu, Cần xem lại, hoặc Giữ lô. Rõ ràng, kiểm lại được.',
          tags: ['Xác nhận lab', 'Đối chiếu'],
          image: 'lab.webp',
        },
      ],
    },
    demo: {
      kicker: '',
      title: 'Thử tra một lô',
      note: 'Dữ liệu mẫu cho demo học thuật. Ngưỡng Cadimi 0.05 ppm ở đây là hằng số minh họa, không phải kết luận pháp lý.',
      bannerAlt: 'Sầu riêng — ảnh minh họa lô xuất khẩu',
      bannerImage: 'hero-durian.webp',
      ariaLabelControls: 'Chọn trạng thái lô hàng mẫu',
      batchIdLabel: 'Mã lô hàng',
      scanQr: 'Quét mã QR',
      scanning: 'Đang quét...',
      scanBlockchain: 'Truy vấn sổ cái...',
      scanConfirmed: 'Đã xác nhận block',
      scanStatusProgress: 'Đang quét mã QR mô phỏng...',
      skeletonLabel: 'Đang tải dữ liệu blockchain...',
      scanStatusComplete: 'Đã tải hồ sơ lô {id}',
      ariaLabelSummary: 'Tóm tắt lô hàng',
      summary: {
        farm: 'Nông trại',
        province: 'Tỉnh',
        harvestDate: 'Ngày thu hoạch',
        status: 'Trạng thái',
      },
      riskNames: {
        low: 'Đạt xuất khẩu',
        medium: 'Cần xem lại',
        high: 'Giữ lô',
      },
      riskSubnames: {
        low: 'Đạt xuất khẩu',
        medium: 'Cần xem lại',
        high: 'Giữ lô',
      },
      provenance: {
        live: 'Trực tiếp trên Solana Devnet',
        demo: 'Dữ liệu minh họa, Devnet không khả dụng',
        viewExplorer: 'Xem trên Solana Explorer',
      },
    },
    leafScanner: {
      kicker: 'Chẩn đoán lá',
      title: 'Nhìn nhanh bệnh trên lá',
      desc: 'Chụp hoặc tải ảnh lá sầu riêng. Mô hình trên máy chủ gợi ý bệnh thường gặp — không thay chẩn đoán nông học.',
      sampleHeading: 'Hoặc bấm một ảnh mẫu',
      sampleHint: 'Không cần tải file — chọn ảnh có sẵn để chạy thử',
      button: 'Chụp hoặc tải ảnh lá',
      analyzing: 'Đang phân tích ảnh...',
      resultHeader: 'Kết quả gợi ý',
      diseaseLabel: 'Gợi ý bệnh',
      probabilityLabel: 'Độ tin cậy',
      treatmentHeader: 'Gợi ý xử lý (tham khảo)',
      treatmentDisclaimer: 'Chỉ mang tính gợi ý cho demo. Xử lý thực tế theo khuyến cáo kỹ thuật viên địa phương.',
      sourceAi: 'Mô hình AI',
      sourceOffline: 'Lỗi / Offline',
      diseases: {
        healthy: 'Lá khỏe mạnh',
        algal_leaf_spot: 'Bệnh đốm rong (tảo)',
        leaf_blight: 'Bệnh cháy lá',
        phomopsis_leaf_spot: 'Bệnh đốm lá Phomopsis',
        allocaridara_attack: 'Rầy nhảy gây hại'
      },
      treatments: {
        healthy: 'Lá trông khỏe. Giữ chế độ dinh dưỡng và kiểm tra định kỳ.',
        algal_leaf_spot: 'Có dấu hiệu đốm rong. Tỉa tán thoáng, giảm ẩm trong vườn.',
        leaf_blight: 'Có dấu hiệu cháy lá. Giữ vườn thông gió; tránh tưới ướt tán chiều tối.',
        phomopsis_leaf_spot: 'Có dấu hiệu đốm Phomopsis. Dọn lá rụng dưới gốc; theo dõi vì dễ nhầm lá khỏe.',
        allocaridara_attack: 'Có dấu hiệu rầy nhảy. Soi mặt dưới lá, theo mật độ côn trùng, xử lý theo khuyến cáo nông học.'
      }
    },
    timeline: {
      title: 'Nhật ký truy xuất lô hàng',
      ariaLabel: 'Các mốc truy xuất lô hàng',
      statusRecorded: 'Đã ghi sổ',
      statusPending: 'Đang chờ',
      pendingDate: 'Chưa có lịch',
    },
    custody: {
      title: 'Chuỗi quyền sở hữu',
      ariaLabel: 'Các lần chuyển quyền sở hữu lô hàng',
      empty: 'Lô hàng vẫn thuộc quyền sở hữu của người đăng ký. Chưa có lần chuyển giao nào.',
      currentHolder: 'Đang nắm giữ:',
      pendingTitle: 'Đang chờ bên nhận xác nhận',
      pendingHint: 'Quyền sở hữu chỉ chuyển khi bên nhận ký chấp nhận.',
      pendingStatus: 'Chờ ký',
      roles: {
        farmer: 'Nông trại',
        packer: 'Nhà đóng gói',
        exporter: 'Nhà xuất khẩu',
        importer: 'Nhà nhập khẩu',
        customs: 'Hải quan',
      },
    },
    aiResult: {
      title: 'Kết quả kiểm định chất lượng',
      sourceChain: 'Đã xác thực Blockchain',
      sourceFallback: 'Ngoại tuyến · dữ liệu tĩnh',
      riskLabels: {
        low: 'Đạt xuất khẩu',
        medium: 'Cần xem lại',
        high: 'Giữ lô',
      },
      confidence: 'Độ tin cậy kiểm định',
      history: 'Lịch sử kiểm định',
      cadmium: 'Cadimi',
      threshold: 'Ngưỡng minh họa',
      yellowO: 'Vàng O',
      notDetected: 'Không phát hiện',
    },
    hashProof: {
      ariaLabel: 'Mã tham chiếu sổ cái',
      label: 'Mã tham chiếu sổ cái',
    },
    impact: {
      kicker: '',
      title: 'Hồ sơ đủ thì bớt kẹt — đó là mục tiêu demo',
      metrics: [
        {
          value: 'Cùng một màn',
          label: 'Xem nguồn gốc lô không chờ fax hay gọi từng đầu mối (trong demo)',
        },
        {
          value: 'Mở khi quét',
          label: 'Phiếu lab và mốc hành trình gắn với mã lô',
        },
        {
          value: 'Cadimi kèm lô',
          label: 'Số đo và trạng thái Đạt / Xem lại / Giữ nằm cùng hồ sơ',
        },
      ],
      outcomesTitle: 'Ai dùng được gì?',
      outcomes: [
        { who: 'Nhà vườn', text: 'Mã vùng trồng dính vào lô của mình, không bị mượn lung tung.' },
        { who: 'Doanh nghiệp xuất khẩu', text: 'Cadimi và Vàng O theo từng lô — mang ra khi được hỏi.' },
        { who: 'Đối tác nhập khẩu', text: 'Đối chiếu chữ ký lab trên blockchain, không chỉ tin file gửi tay.' },
        { who: 'Người mua (demo)', text: 'Quét QR trên bao/thùng để xem đường đi vườn → cảng.' },
      ],
      photos: [
        { src: 'orchard.webp', alt: 'Vườn sầu riêng — phía nhà vườn' },
        { src: 'reefer.webp', alt: 'Container lạnh — chặng vận chuyển' },
      ],
      cta: {
        title: 'Tự mở một lô mẫu trên Solana devnet',
        button: 'Mở tra cứu lô',
      },
    },
    footer: {
      demoText: 'Demo học thuật — minh họa truy xuất, không thay phiếu lab chính thức.',
      sourcesLabel: 'Nguồn tham khảo',
      photosLabel: 'Ảnh tư liệu',
    },
    units: {
      farmTitle: 'Vườn trồng',
      farmSubtitle: 'Đăng ký nông trại và nhật ký cảm biến',
      photoAlts: {
        farm: 'Vườn sầu riêng',
        transport: 'Container lạnh xếp tại bãi',
        testing: 'Kỹ thuật viên xử lý mẫu trong phòng lab',
        export: 'Tàu container tại cảng',
      },
      transportTitle: 'Vận chuyển lạnh',
      transportSubtitle: 'Nhiệt độ container và mốc GPS',
      testingTitle: 'Kiểm nghiệm lab',
      testingSubtitle: 'Cadimi, Vàng O và cổng quy tắc',
      exportTitle: 'Cảng và thông quan',
      exportSubtitle: 'Hồ sơ xuất và xác nhận cuối',
      backToHome: 'Quay lại trang chủ',
      iotTelemetry: 'Số đo cảm biến (mẫu demo)',
      blockchainProof: 'Bằng chứng trên blockchain',
      statusApproved: 'Đạt xuất khẩu',
      statusPending: 'Đang chờ xử lý',
      statusRejected: 'Giữ lô',
    },
    managePortal: {
      roles: {
        owner: 'Quản trị viên',
        farmer: 'Nông dân',
        lab: 'Kiểm nghiệm viên',
        logistics: 'Vận chuyển',
        norole: 'Không có vai trò',
      },
      simulatedLabel: 'Bạn đang ở chế độ demo offline. Chọn vai trò giả lập:',
      simulatedRoleSelector: 'Bộ chọn vai trò giả lập',
      tabsAriaLabel: 'Các vai trò quản lý chuỗi cung ứng',
      rolesDetail: {
        owner: 'Quản trị viên',
        farmer: 'Nông dân',
        lab: 'Kiểm nghiệm',
        logistics: 'Vận chuyển',
        norole: 'Không có vai trò'
      },
      gating: {
        accessDenied: 'Quyền truy cập bị từ chối',
        farmerDenied: 'Ví của bạn không được phân quyền Nông Dân (Farmer) để ghi thông tin.',
        labDenied: 'Ví của bạn không được phân quyền Kiểm Nghiệm (Lab) để cập nhật kết quả.',
        logisticsDenied: 'Ví của bạn không được phân quyền Vận Chuyển (Logistics) để ghi chặng.',
        adminDenied: 'Chỉ quản trị viên hệ thống mới được cấu hình phân quyền.',
        initProgram: 'Khởi tạo hệ thống'
      },
      admin: {
        initTitle: 'Khởi tạo hệ thống',
        initDesc: 'Hệ thống đã được khởi tạo. Bạn có thể chạy lại nếu cần (sẽ báo lỗi nếu đã xong).'
      },
      backToHome: 'Quay lại Trang chủ',
      title: 'Cổng quản lý chuỗi cung ứng',
      subtitle: 'Ghi nhật ký kiểm nghiệm theo quy tắc, phân quyền, và cập nhật các mốc trên blockchain',
      walletLabel: 'Ví kết nối: ',
      devnet: 'Solana Devnet',
      fallbackMode: 'Demo offline',
      simulatedRoles: {
        owner: 'Quản trị viên',
        farmer: 'Nông dân',
        lab: 'Phòng lab',
        logistics: 'Vận chuyển',
        norole: 'Không có vai trò'
      },
      tabs: {
        farmer: 'Nông dân',
        lab: 'Kiểm nghiệm',
        logistics: 'Vận chuyển',
        admin: 'Quản trị'
      },
      qr: {
        ready: 'Tạo nhãn QR cho lô hàng',
        loading: 'Đang tải mã QR...'
      },
      tx: {
        success: 'Thực thi giao dịch thành công',
        error: 'Lỗi hệ thống',
        processing: 'Đang gửi giao dịch...',
        confirming: 'Đang xác nhận trên Blockchain...',
        viewExplorer: 'Xem giao dịch trên Solana Explorer'
      },
      walletGuidance: {
        noPhantom: 'Không tìm thấy ví Phantom trên trình duyệt này. Cài đặt để ký giao dịch trên Devnet.',
        getPhantom: 'Tải ví Phantom',
        noBalance: 'Ví Devnet của bạn có 0 SOL. Lấy SOL miễn phí để ký giao dịch.',
        getFaucet: 'Nhận SOL từ Faucet',
      },
      security: {
        title: 'Bảo mật trên blockchain',
        desc: 'Mọi ghi nhận từ cổng này được ký bằng ví Phantom của người vận hành. Khi vào sổ Solana devnet, hệ thống tạo mã giao dịch không thể sửa. Người quét QR có thể đối chiếu kết quả Cadimi đã được xác nhận tại nguồn.'
      }
    },
    getRuleResult: (audit) => audit.aiResultVi,
    getRuleCause: (audit) => audit.riskCauseVi,
    getLocalizedText: (obj) => obj?.vi || '',
    farmerPanel: {
      title: 'Đăng ký lô sầu riêng',
      preFill: 'Tự điền nhanh dữ liệu mẫu',
      batchIdLabel: 'Mã lô sầu riêng',
      harvestDateLabel: 'Ngày thu hoạch',
      violationsLabel: 'Lịch sử vi phạm của vườn (0-5)',
      rainfallLabel: 'Lượng mưa ước tính (mm)',
      cadmiumLabel: 'Kết quả kiểm nghiệm Cadimi tạm tính (ppm)',
      cadmiumHint: 'Ngưỡng an toàn tối đa của Hải quan là 0.050 ppm',
      aiForecast: {
        title: 'Dự báo Cadimi trước lab',
        loading: 'Đang phân tích dữ liệu...',
        riskText: (risk) => `Nguy cơ: ${risk === 'low' ? 'Thấp' : risk === 'medium' ? 'Trung bình' : 'Cao'}`,
        statusLabels: {
          low: 'Đạt xuất khẩu',
          medium: 'Cần xem lại',
          high: 'Giữ lô'
        },
        probabilityLabel: 'Khả năng xảy ra: ',
        requiresTesting: 'Yêu cầu kiểm nghiệm đầy đủ trong phòng thí nghiệm',
        eligibleFastTrack: 'Đạt điều kiện miễn giảm quy trình kiểm nghiệm phụ'
      },
      diseaseForecast: {
        loading: 'Đang phân tích điều kiện môi trường...',
        confidenceLabel: 'Độ tin cậy dự báo: '
      },
      ruleAudit: {
        title: 'Đánh giá theo quy tắc (tạm tính)',
        statusLabels: {
          low: 'Đạt xuất khẩu',
          medium: 'Cần xem lại',
          high: 'Giữ lô'
        },
        confidenceLabel: 'Độ tin cậy: '
      },
      submitBtn: {
        loading: 'Đang ký giao dịch...',
        normal: 'Ký & đăng ký lô hàng'
      }
    },
    labPanel: {
      title: 'Cập nhật kết quả kiểm nghiệm lab',
      selectBatchLabel: 'Chọn lô sầu riêng cần kiểm định',
      selectBatchPlaceholder: '-- Chọn lô sầu riêng --',
      cadmiumLabel: 'Hàm lượng Cadimi phân tích (ppm)',
      thresholdLabel: 'Ngưỡng kiểm định tối đa (ppm)',
      ruleAudit: {
        title: 'Kết quả đối chiếu quy tắc',
        statusLabels: {
          low: 'Đạt xuất khẩu',
          medium: 'Cần xem lại',
          high: 'Giữ lô'
        },
        confidenceLabel: 'Độ tin cậy:'
      },
      submitBtn: {
        loading: 'Đang ký giao dịch...',
        normal: 'Ký & ghi kết quả lab'
      },
      history: {
        title: 'Lịch sử báo cáo của lô hàng',
        loading: 'Đang tải lịch sử từ blockchain...',
        summary: (count) => `Có ${count} báo cáo hóa chất được tìm thấy:`,
        run: (index) => `Lần kiểm nghiệm #${index}`,
        noData: 'Không tìm thấy lịch sử báo cáo nào của lô hàng này.',
        selectPrompt: 'Vui lòng chọn Lô hàng để xem lịch sử.'
      }
    },
    qrScanner: {
      title: 'Trình quét mã QR sầu riêng',
      initCamera: 'Đang khởi chạy camera...',
      cameraFailed: 'Không thể truy cập Camera',
      cameraHint: 'Vui lòng kiểm tra quyền camera hoặc nhập mã bên dưới',
      verified: 'Đã xác thực lô hàng',
      manualLabel: 'Nhập mã lô hàng thủ công:',
      verifyBtn: 'Xác thực',
      selectDemo: 'Chọn nhanh lô hàng mẫu:',
      footer: 'Mã QR liên kết trực tiếp với hồ sơ lô trên blockchain',
      error: {
        empty: 'Vui lòng điền mã lô!'
      },
      riskLabels: {
        low: 'Đạt xuất khẩu',
        medium: 'Cần xem lại',
        high: 'Giữ lô'
      }
    },
    diseaseModel: {
      kicker: 'Dự báo bệnh vùng trồng',
      title: 'Đánh giá nguy cơ dịch bệnh vùng trồng',
      tempLabel: 'Nhiệt độ môi trường (°C)',
      humidityLabel: 'Độ ẩm không khí (%)',
      wetnessLabel: 'Số giờ ướt lá (giờ)',
      drainageLabel: 'Khả năng thoát nước đất',
      ageLabel: 'Tuổi cây sầu riêng (năm)',
      priorLabel: 'Lịch sử nhiễm bệnh vùng trồng',
      priorYes: 'Đã từng bị nhiễm dịch bệnh',
      priorNo: 'Chưa từng bị nhiễm dịch bệnh',
      drainageOptions: {
        good: 'Thoát nước tốt',
        medium: 'Thoát nước trung bình',
        poor: 'Thoát nước kém (dễ ngập úng)'
      },
      diseases: {
        healthy: 'Khỏe mạnh - Rủi ro thấp',
        phytophthora: 'Nứt thân xì mủ (Phytophthora)',
        anthracnose: 'Bệnh thán thư (Anthracnose)',
        leaf_blight: 'Bệnh cháy lá (Leaf blight)'
      },
      healthyDesc: 'Môi trường sinh trưởng lý tưởng, đề xuất tiếp tục chế độ canh tác hiện tại.',
      phytophthoraDesc: 'Độ ẩm quá cao kết hợp thoát nước kém kích thích nấm Phytophthora phát triển. Cần phun phòng và khơi thông mương rãnh.',
      anthracnoseDesc: 'Nhiệt độ ấm và độ ẩm cao là tác nhân trực tiếp cho bào tử thán thư phát tán. Khuyến nghị tỉa cành tạo tán thoáng.',
      leaf_blightDesc: 'Lá sầu riêng bị ướt liên tục trên 12 giờ tạo điều kiện cho nấm cháy lá tấn công. Tránh tưới phun mưa vào chiều muộn.',
      riskLabels: {
        low: 'Rủi ro thấp',
        medium: 'Rủi ro trung bình',
        high: 'Rủi ro cao'
      }
    },
    unitDetails: {
      operationalStatus: 'Trạng thái',
      connected: 'Đã liên kết',
      safetyTitle: 'An toàn chuỗi (mẫu demo)',
      safetyDesc: 'Số đo cảm biến là dữ liệu minh họa. Vượt ngưỡng sẽ gắn cờ trên blockchain và khóa lô để xem lại — trong demo.',
      farm: {
        soilMoisture: 'Độ ẩm đất',
        soilPh: 'pH đất',
        ambientTemp: 'Nhiệt độ môi trường',
        soilOrganicMatter: 'Hàm lượng hữu cơ',
        plotRegistered: 'Đăng ký lô đất vườn',
        runoffCleared: 'Kiểm dư lượng đất và nước',
        harvestDeclared: 'Khai báo thu hoạch lô #B882'
      },
      transport: {
        containerTemp: 'Nhiệt độ thùng lạnh',
        containerHumidity: 'Độ ẩm thùng lạnh',
        gpsSpeed: 'Vận tốc trung bình',
        vibration: 'Độ rung',
        journeyInitiated: 'Bắt đầu chuyến lạnh',
        pingLogged: 'Ghi GPS và nhiệt độ container',
        arrivedHub: 'Tới cảng trung chuyển Cát Lái'
      },
      testing: {
        cadmiumLevel: 'Hàm lượng Cadimi',
        yellowODye: 'Vàng O',
        notDetected: 'Không phát hiện',
        qualityConf: 'Độ tin cậy (demo)',
        labAccreditation: 'Chứng nhận lab (demo)',
        sampleCheckedIn: 'Tiếp nhận mẫu lab',
        assayResultsLogged: 'Ghi kết quả Cadimi',
        auditSignOff: 'Ký xác nhận kiểm nghiệm'
      },
      export: {
        declarationId: 'Mã tờ khai hải quan',
        sealId: 'Mã chì niêm phong',
        eCert: 'Chứng thư thông quan số',
        smartContractStatus: 'Trạng thái trên blockchain',
        filesDeposited: 'Nộp hồ sơ hải quan lên blockchain',
        clearanceVerified: 'Thông quan cảng xuất thành công',
        recordFinalized: 'Khóa hồ sơ lô trên sổ'
      }
    },
  },
  en: {
    skipLink: 'Skip to content',
    common: {
      warmingUpModel: 'Warming up the model…',
      retry: 'Retry',
      aiUnavailable: 'The AI model is temporarily unavailable. Please try again.',
    },
    header: {
      nav: {
        home: 'Home',
        intro: 'Introduction',
        units: 'Supply chain',
        problem: 'Problems',
        solution: 'Solutions',
        impact: 'Impact',
        farm: 'Farm',
        transport: 'Transport',
        testing: 'Lab Testing',
        export: 'Export Port',
        demo: 'Batch lookup',
        manage: 'Operator Portal',
      },
      ariaLabel: 'Main navigation',
      landingMenuAria: 'Introduction sections',
      mobileNavAria: 'Mobile navigation',
      mobileMenuOpen: 'Open navigation menu',
      mobileMenuClose: 'Close navigation menu',
      languageSwitchAria: 'Select language',
    },
    hero: {
      eyebrow: 'Durian exports · scannable batch files',
      title: 'Paperwork that travels with the fruit',
      lead: 'Harvest, lab Cadmium result, cold-chain stops — one record. Open it with a QR; no hunting loose PDFs.',
      ctaDemo: 'Try a sample batch',
      ctaProblem: 'Why loads get held',
      batchProof: 'Inspection certificate',
      ledgerEvents: '4 ledger milestones · Export-ready · Cadmium within limit',
      verified: 'Verified',
      ariaLabelLedger: 'Sample batch status',
      ariaLabelActions: 'Primary actions',
      photoAlt: 'Ripe durian fruit on a wooden table (stock photo)',
    },
    landing: {
      journeyTitle: 'How an export batch actually moves',
      journeyLead: 'Four stages where paperwork usually breaks. Each one adds a line you can still read later.',
      journeyAria: 'Batch journey',
      steps: [
        {
          title: 'Orchard',
          text: 'Harvest date and growing-area code (PUC) stick to the batch from day one.',
          href: '#/unit/farm',
          alt: 'Durian orchard',
          image: 'orchard.webp',
        },
        {
          title: 'Lab',
          text: 'Cadmium and Yellow O results are signed by the lab; the report is hashed for later checks.',
          href: '#/unit/testing',
          alt: 'Technician processing samples in a testing laboratory',
          image: 'lab.webp',
        },
        {
          title: 'Cold chain',
          text: 'Container temperature and handoff points are logged per leg — not just “delivered.”',
          href: '#/unit/transport',
          alt: 'Refrigerated containers at a depot',
          image: 'reefer.webp',
        },
        {
          title: 'Port',
          text: 'Customs paperwork lines up with the earlier milestones when someone asks.',
          href: '#/unit/export',
          alt: 'Container ship at port',
          image: 'port.webp',
        },
      ],
      recordTitle: 'What goes on the ledger?',
      recordLead: 'Four practical steps — from opening a batch to letting anyone verify it.',
      records: [
        { name: 'Register batch', detail: 'Batch ID, growing area, harvest date.' },
        { name: 'Log milestone', detail: 'Farm work, packing, cold-chain stops.' },
        { name: 'Certify lab report', detail: 'Lab signs the hashed test report.' },
        { name: 'Verify certificate', detail: 'Anyone can check signature and hash on the blockchain.' },
      ],
    },
    problem: {
      kicker: '',
      title: 'Why durian loads still get stuck at the border',
      body1: 'Vietnamese shipments keep getting flagged when importers tighten Cadmium and Yellow O checks.',
      body2: 'The fruit may be fine. The file often isn’t: scattered lab PDFs, borrowed growing-area codes, reefer temps nobody can produce on demand.',
      photoCaption: 'Durian is a multibillion-dollar trade. One contaminant hit can freeze a whole container.',
      photo: 'market.webp',
      figures: [
        { value: '0.05 ppm', label: 'Max Cadmium under China customs (GACC) rules' },
        { value: '248/249', label: 'Two domestic decrees tightening origin and food safety' },
        { value: '2025', label: 'The year border checks got harder on Yellow O' },
      ],
      newsTitle: 'What the press has been reporting',
      newsAria: 'News on durian exports',
      news: [
        { source: 'SGGP', title: "Vietnam's durian industry reeling as China rejects shipments over contaminants", href: 'https://en.sggp.org.vn/vietnams-durian-industry-reeling-as-china-rejects-shipments-over-contaminants-post117622.html' },
        { source: 'VietnamPlus', title: 'Vietnam steps up quality control of durian exports to retain billion-dollar market', href: 'https://en.vietnamplus.vn/vietnam-steps-up-quality-control-of-durian-exports-to-retain-billion-dollar-market-post321595.vnp' },
        { source: 'MOIT / VNTR', title: 'China tightens import rules on Vietnamese durians', href: 'https://vntr.moit.gov.vn/news/china-tightens-import-rules-on-vietnamese-durians' },
        { source: 'Tuổi Trẻ', title: 'Durian exports to China fall sharply; minister orders a set of response measures', href: 'https://tuoitre.vn/sau-rieng-xuat-khau-sang-trung-quoc-giam-sau-bo-truong-do-duc-duy-chi-dao-loat-giai-phap-20250508164730467.htm' },
      ],
      bridgeTitle: 'Good fruit is not enough. Border officers need paperwork they can open now. DurianTrust tries putting that file on one shared ledger (academic demo).',
      bridgeButton: 'See how we log it',
      disclaimer: 'This demo shows a traceability flow — it is not an official lab result.',
      pointsAriaLabel: 'Key export challenges',
      points: [
        {
          icon: 'shield',
          title: 'Borrowing a growing-area code (PUC)',
          desc: 'A load rides on another farm’s code. When origin is questioned, the whole area can get hit.',
          image: 'orchard.webp',
        },
        {
          icon: 'temp',
          title: 'No reefer temperature log',
          desc: 'If you cannot show 2–4 °C for the trip, fruit can ripen in the box before customs.',
          image: 'reefer.webp',
        },
        {
          icon: 'file',
          title: 'Loose lab PDFs',
          desc: 'Cadmium and Yellow O live in printouts and files that are hard to prove and slow to pull together.',
          image: 'lab.webp',
        },
        {
          icon: 'clock',
          title: 'A hold, then days of phone calls',
          desc: 'Limits fail at the border first; only then does someone call orchards — while the container waits.',
          image: 'port.webp',
        },
      ],
    },
    solution: {
      kicker: '',
      title: 'One file per batch: orchard → lab → cold chain → port',
      pillars: [
        {
          title: 'Write milestones',
          subtitle: 'Add only, no silent deletes',
          body: 'Harvest, lab, packing, export — each step adds a line. What was written yesterday is still readable today.',
          tags: ['Ledger write', 'Journey log'],
          image: 'port.webp',
        },
        {
          title: 'Narrow the source when flagged',
          subtitle: 'Farm · province · stage',
          body: 'A red batch points back to the orchard and region — e.g. Dak Lak, Tien Giang, Dong Nai — and the stage where risk showed up.',
          tags: ['Batch record', 'Chain log'],
          image: 'orchard.webp',
        },
        {
          title: 'Cadmium rule gate',
          subtitle: 'Against 0.05 ppm',
          body: 'Lab enters a number → compare to the demo threshold → Export-ready, Needs review, or Hold. Clear and checkable.',
          tags: ['Lab certify', 'Verify'],
          image: 'lab.webp',
        },
      ],
    },
    demo: {
      kicker: '',
      title: 'Look up a sample batch',
      note: 'Sample data for an academic demo. The 0.05 ppm Cadmium figure here is an illustrative constant, not a legal finding.',
      bannerAlt: 'Durian fruit — illustration for an export batch',
      bannerImage: 'hero-durian.webp',
      ariaLabelControls: 'Select sample batch status',
      batchIdLabel: 'Batch ID',
      scanQr: 'Scan QR Code',
      scanning: 'Scanning...',
      scanBlockchain: 'Querying blockchain...',
      scanConfirmed: 'Block confirmed',
      scanStatusProgress: 'Simulated QR scan in progress...',
      skeletonLabel: 'Loading blockchain data...',
      scanStatusComplete: 'Refreshed batch record {id}',
      ariaLabelSummary: 'Batch summary',
      summary: {
        farm: 'Farm',
        province: 'Province',
        harvestDate: 'Harvest date',
        status: 'Status',
      },
      riskNames: {
        low: 'Export-ready',
        medium: 'Needs review',
        high: 'Hold',
      },
      riskSubnames: {
        low: 'Export-ready',
        medium: 'Needs review',
        high: 'Hold',
      },
      provenance: {
        live: 'Live on Solana Devnet',
        demo: 'Demo data, devnet unreachable',
        viewExplorer: 'View on Solana Explorer',
      },
    },
    leafScanner: {
      kicker: 'Leaf check',
      title: 'A quick look at leaf disease',
      desc: 'Snap or upload a durian leaf photo. The server model suggests common issues — not a farm diagnosis.',
      sampleHeading: 'Or tap a sample photo',
      sampleHint: 'No upload needed — pick a built-in sample to try',
      button: 'Capture or upload leaf photo',
      analyzing: 'Analyzing photo...',
      resultHeader: 'Suggested result',
      diseaseLabel: 'Suggested condition',
      probabilityLabel: 'Confidence',
      treatmentHeader: 'What you might do next',
      treatmentDisclaimer: 'Suggestions only for this demo. Follow local agronomy advice in the field.',
      sourceAi: 'AI model',
      sourceOffline: 'Error / Offline',
      diseases: {
        healthy: 'Healthy leaf',
        algal_leaf_spot: 'Algal leaf spot',
        leaf_blight: 'Leaf blight',
        phomopsis_leaf_spot: 'Phomopsis leaf spot',
        allocaridara_attack: 'Psyllid (Allocaridara) damage'
      },
      treatments: {
        healthy: 'Leaf looks healthy. Keep normal nutrition and routine checks.',
        algal_leaf_spot: 'Looks like algal spot. Open the canopy, cut humidity in the orchard.',
        leaf_blight: 'Looks like leaf blight. Improve airflow; avoid wet foliage in the evening.',
        phomopsis_leaf_spot: 'Looks like Phomopsis. Clear fallen leaves; watch closely — easy to miss.',
        allocaridara_attack: 'Looks like psyllid damage. Check leaf undersides and treat per local guidance.'
      }
    },
    timeline: {
      title: 'Batch traceability timeline',
      ariaLabel: 'Batch traceability timeline events',
      statusRecorded: 'Recorded',
      statusPending: 'Pending',
      pendingDate: 'Pending',
    },
    custody: {
      title: 'Chain of custody',
      ariaLabel: 'Custody handoffs for this batch',
      empty: 'Still held by the registrant. No handoff has been recorded yet.',
      currentHolder: 'Currently held by:',
      pendingTitle: 'Awaiting the recipient',
      pendingHint: 'Ownership only moves once the recipient signs to accept it.',
      pendingStatus: 'Unsigned',
      roles: {
        farmer: 'Farm',
        packer: 'Packhouse',
        exporter: 'Exporter',
        importer: 'Importer',
        customs: 'Customs',
      },
    },
    aiResult: {
      title: 'Quality gate result',
      sourceChain: 'Blockchain verified',
      sourceFallback: 'Offline · static data',
      riskLabels: {
        low: 'Export-ready',
        medium: 'Needs review',
        high: 'Hold',
      },
      confidence: 'Audit confidence',
      history: 'Audit history',
      cadmium: 'Cadmium',
      threshold: 'Demo threshold',
      yellowO: 'Yellow O',
      notDetected: 'Not detected',
    },
    hashProof: {
      ariaLabel: 'Ledger reference hash',
      label: 'Ledger reference',
    },
    impact: {
      kicker: '',
      title: 'Complete files, fewer holds — what this demo aims at',
      metrics: [
        {
          value: 'One screen',
          label: 'Trace likely origin without fax chains (in the demo)',
        },
        {
          value: 'Open on scan',
          label: 'Lab notes and milestones travel with the batch ID',
        },
        {
          value: 'Cadmium with the load',
          label: 'Readings plus Export-ready / Needs review / Hold on one record',
        },
      ],
      outcomesTitle: 'Who can use what?',
      outcomes: [
        { who: 'Growers', text: 'Your growing-area code sticks to your batch — harder to borrow.' },
        { who: 'Exporters', text: 'Cadmium and Yellow O per batch when someone asks at the border.' },
        { who: 'Importers', text: 'Check the lab signature on-chain, not only a forwarded PDF.' },
        { who: 'Buyers (demo)', text: 'Scan a carton QR to see orchard-to-port stops.' },
      ],
      photos: [
        { src: 'orchard.webp', alt: 'Durian orchard — grower side' },
        { src: 'reefer.webp', alt: 'Reefer containers — transport leg' },
      ],
      cta: {
        title: 'Open a sample batch on Solana devnet',
        button: 'Open batch lookup',
      },
    },
    footer: {
      demoText: 'Academic demo — shows traceability, not an official lab certificate.',
      sourcesLabel: 'Sources',
      photosLabel: 'Photos',
    },
    units: {
      farmTitle: 'Orchard',
      farmSubtitle: 'Farm registration and sensor log',
      photoAlts: {
        farm: 'Durian orchard',
        transport: 'Refrigerated containers at a depot',
        testing: 'Technician processing samples in a lab',
        export: 'Container ship at port',
      },
      transportTitle: 'Cold transport',
      transportSubtitle: 'Container temperature and GPS stops',
      testingTitle: 'Lab testing',
      testingSubtitle: 'Cadmium, Yellow O, and the rule gate',
      exportTitle: 'Port and customs',
      exportSubtitle: 'Export file and final confirmation',
      backToHome: 'Back to home',
      iotTelemetry: 'Sensor readings (demo sample)',
      blockchainProof: 'Blockchain proof',
      statusApproved: 'Export-ready',
      statusPending: 'Processing / pending',
      statusRejected: 'Hold',
    },
    managePortal: {
      roles: {
        owner: 'Admin',
        farmer: 'Farmer',
        lab: 'Lab tester',
        logistics: 'Logistics',
        norole: 'No role',
      },
      simulatedLabel: 'You are in offline demo mode. Choose a simulated role:',
      simulatedRoleSelector: 'Simulated role selector',
      tabsAriaLabel: 'Supply chain management roles',
      rolesDetail: {
        owner: 'Admin',
        farmer: 'Farmer',
        lab: 'Lab tester',
        logistics: 'Logistics',
        norole: 'No role'
      },
      gating: {
        accessDenied: 'Access denied',
        farmerDenied: 'Your wallet is not authorized as a Farmer to register new batches.',
        labDenied: 'Your wallet is not authorized as a Lab operator to submit chemical reports.',
        logisticsDenied: 'Your wallet is not authorized as a Logistics agent to log timeline events.',
        adminDenied: 'Only a system admin can configure roles.',
        initProgram: 'Set up system'
      },
      admin: {
        initTitle: 'Set up system',
        initDesc: 'The system is already set up. You can run setup again if needed (it will error if already done).'
      },
      backToHome: 'Back to Home',
      title: 'Supply Chain Operator Console',
      subtitle: 'Log rule-based quality reports, manage roles, and record immutable timeline stages on-chain',
      walletLabel: 'Auditor Wallet: ',
      devnet: 'Solana Devnet',
      fallbackMode: 'Offline demo',
      simulatedRoles: {
        owner: 'Admin',
        farmer: 'Farmer',
        lab: 'Lab tester',
        logistics: 'Logistics',
        norole: 'No role'
      },
      tabs: {
        farmer: 'Farmer',
        lab: 'Lab',
        logistics: 'Logistics',
        admin: 'Admin'
      },
      qr: {
        ready: 'Batch QR label ready',
        loading: 'Loading QR code...'
      },
      tx: {
        success: 'Transaction succeeded',
        error: 'System error',
        processing: 'Sending transaction...',
        confirming: 'Confirming on-chain...',
        viewExplorer: 'View transaction on Solana Explorer'
      },
      walletGuidance: {
        noPhantom: 'Phantom wallet not detected in this browser. Install it to sign transactions on devnet.',
        getPhantom: 'Get Phantom',
        noBalance: 'Your devnet wallet has 0 SOL. Get free devnet SOL to sign transactions.',
        getFaucet: 'Get SOL from Faucet',
      },
      security: {
        title: 'Blockchain security',
        desc: 'Every entry from this console is signed with the operator\'s Phantom wallet. On Solana devnet it creates an immutable transaction ID. Anyone scanning the QR can verify that the Cadmium result was certified at the source.'
      }
    },
    getRuleResult: (audit) => audit.aiResultEn,
    getRuleCause: (audit) => audit.riskCauseEn,
    getLocalizedText: (obj) => obj?.en || '',
    farmerPanel: {
      title: 'Register durian batch',
      preFill: 'Quick pre-fill sample data',
      batchIdLabel: 'Batch ID',
      harvestDateLabel: 'Harvest date',
      violationsLabel: 'Farm Violation History (0-5)',
      rainfallLabel: 'Estimated Rainfall (mm)',
      cadmiumLabel: 'Estimated Cadmium Level (ppm)',
      cadmiumHint: 'Customs safety limit is 0.050 ppm',
      aiForecast: {
        title: 'Pre-lab Cadmium forecast',
        loading: 'Analyzing farm data...',
        riskText: (risk) => `Risk Level: ${risk.toUpperCase()}`,
        statusLabels: {
          low: 'Export-ready',
          medium: 'Needs review',
          high: 'Hold'
        },
        probabilityLabel: 'Probability: ',
        requiresTesting: 'Requires comprehensive lab assay',
        eligibleFastTrack: 'Eligible for fast-track processing'
      },
      diseaseForecast: {
        loading: 'Analyzing environmental variables...',
        confidenceLabel: 'Prediction Confidence: '
      },
      ruleAudit: {
        title: 'Rule-based quality preview',
        statusLabels: {
          low: 'Export-ready',
          medium: 'Needs review',
          high: 'Hold'
        },
        confidenceLabel: 'Confidence: '
      },
      submitBtn: {
        loading: 'Signing...',
        normal: 'Sign & register batch'
      }
    },
    labPanel: {
      title: 'Submit Lab Chemical Audit Report',
      selectBatchLabel: 'Select Target Batch ID',
      selectBatchPlaceholder: '-- Select Batch ID --',
      cadmiumLabel: 'Assayed Cadmium (ppm)',
      thresholdLabel: 'Max Threshold (ppm)',
      ruleAudit: {
        title: 'Rule check result',
        statusLabels: {
          low: 'Export-ready',
          medium: 'Needs review',
          high: 'Hold'
        },
        confidenceLabel: 'Confidence:'
      },
      submitBtn: {
        loading: 'Signing...',
        normal: 'Sign & save lab report'
      },
      history: {
        title: 'Batch assay history',
        loading: 'Loading history from blockchain...',
        summary: (count) => `${count} reports logged for batch:`,
        run: (index) => `Assay Run #${index}`,
        noData: 'No chemical assays recorded for this batch yet.',
        selectPrompt: 'Please select a Batch ID above to fetch history.'
      }
    },
    qrScanner: {
      title: 'Durian QR Code Scanner',
      initCamera: 'Initializing device camera...',
      cameraFailed: 'Camera Access Failed',
      cameraHint: 'Please check browser permissions or type the batch ID below',
      verified: 'Batch verified',
      manualLabel: 'Or enter batch ID manually:',
      verifyBtn: 'Verify',
      selectDemo: 'Or select a demo batch to simulate:',
      footer: 'QR code links directly to the batch record on the blockchain',
      error: {
        empty: 'Please enter a batch ID!'
      },
      riskLabels: {
        low: 'Export-ready',
        medium: 'Needs review',
        high: 'Hold'
      }
    },
    diseaseModel: {
      kicker: 'Orchard disease forecast',
      title: 'Orchard disease risk assessment',
      tempLabel: 'Ambient Temperature (°C)',
      humidityLabel: 'Relative Air Humidity (%)',
      wetnessLabel: 'Leaf Wetness Duration (hours)',
      drainageLabel: 'Soil Drainage Capacity',
      ageLabel: 'Durian Tree Age (years)',
      priorLabel: 'Prior Orchard Infection History',
      priorYes: 'Prior infections recorded',
      priorNo: 'No prior infections recorded',
      drainageOptions: {
        good: 'Good drainage',
        medium: 'Medium drainage',
        poor: 'Poor drainage (waterlogged)'
      },
      diseases: {
        healthy: 'Healthy - Low risk',
        phytophthora: 'Phytophthora (Stem Canker)',
        anthracnose: 'Anthracnose Leaf Spot',
        leaf_blight: 'Rhizoctonia Leaf Blight'
      },
      healthyDesc: 'Optimal environmental conditions. Continue standard orchard maintenance.',
      phytophthoraDesc: 'Excessive humidity and waterlogged soil trigger Phytophthora growth. Clear trenches and apply preventative fungicides.',
      anthracnoseDesc: 'Warm temperatures combined with high humidity spread anthracnose spores. Prune branches to improve airflow.',
      leaf_blightDesc: 'Leaf wetness exceeding 12 hours fosters leaf blight. Avoid overhead sprinkler irrigation during late afternoon.',
      riskLabels: {
        low: 'Low risk',
        medium: 'Medium risk',
        high: 'High risk'
      }
    },
    unitDetails: {
      operationalStatus: 'Status',
      connected: 'Linked',
      safetyTitle: 'Chain safety (demo sample)',
      safetyDesc: 'Sensor numbers here are illustrative. Over-limit readings flag the batch on-chain and lock it for review — in the demo.',
      farm: {
        soilMoisture: 'Soil moisture',
        soilPh: 'Soil pH',
        ambientTemp: 'Ambient temperature',
        soilOrganicMatter: 'Organic matter',
        plotRegistered: 'Orchard plot registered',
        runoffCleared: 'Soil and water runoff cleared',
        harvestDeclared: 'Harvest declared for batch #B882'
      },
      transport: {
        containerTemp: 'Container temperature',
        containerHumidity: 'Container humidity',
        gpsSpeed: 'Average speed',
        vibration: 'Vibration',
        journeyInitiated: 'Cold trip started',
        pingLogged: 'GPS and container temperature logged',
        arrivedHub: 'Arrived Cat Lai transfer hub'
      },
      testing: {
        cadmiumLevel: 'Cadmium level',
        yellowODye: 'Yellow O',
        notDetected: 'Not detected',
        qualityConf: 'Confidence (demo)',
        labAccreditation: 'Lab accreditation (demo)',
        sampleCheckedIn: 'Lab sample checked in',
        assayResultsLogged: 'Cadmium result logged',
        auditSignOff: 'Lab sign-off recorded'
      },
      export: {
        declarationId: 'Customs declaration ID',
        sealId: 'Seal ID',
        eCert: 'E-phytosanitary certificate',
        smartContractStatus: 'Blockchain status',
        filesDeposited: 'Customs files on blockchain',
        clearanceVerified: 'Port clearance confirmed',
        recordFinalized: 'Batch file locked on the ledger'
      }
    },
  },
}
