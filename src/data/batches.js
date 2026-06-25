export const batches = [
  {
    id: 'DRN-2026-LD-0428',
    farm: {
      vi: 'Nông trại Tân Phú',
      en: 'Tan Phu Farm',
    },
    province: {
      vi: 'Lâm Đồng',
      en: 'Lam Dong',
    },
    harvestDate: '2026-04-28',
    cadmiumPpm: 0.03,
    thresholdPpm: 0.05,
    aiResult: {
      vi: 'Đạt chuẩn xuất khẩu',
      en: 'Export-ready',
    },
    confidence: 0.94,
    riskLevel: 'low',
    riskCause: {
      vi: 'Cadimi và Vàng O trong ngưỡng cho phép',
      en: 'Cadmium and Yellow O within limits',
    },
    timeline: [
      {
        stage: {
          vi: 'Thu hoạch',
          en: 'Harvest',
        },
        location: {
          vi: 'Nông trại Tân Phú, Lâm Đồng',
          en: 'Tan Phu Farm, Lam Dong',
        },
        date: '2026-04-28',
        status: 'complete',
      },
      {
        stage: {
          vi: 'Kiểm nghiệm',
          en: 'Lab test',
        },
        location: {
          vi: 'Trung tâm kiểm định Đà Lạt',
          en: 'Da Lat Testing Center',
        },
        date: '2026-04-30',
        status: 'complete',
      },
      {
        stage: {
          vi: 'Đóng gói',
          en: 'Packing',
        },
        location: {
          vi: 'Nhà đóng gói Bảo Lộc',
          en: 'Bao Loc Packing House',
        },
        date: '2026-05-02',
        status: 'complete',
      },
      {
        stage: {
          vi: 'Xuất khẩu',
          en: 'Export',
        },
        location: {
          vi: 'Cảng Cát Lái - Trung Quốc',
          en: 'Cat Lai Port - China',
        },
        date: '2026-05-05',
        status: 'pending',
      },
    ],
    blockchainHash: '5Nj3xGvD8T1h9X5pQ2yB7c...9pQ2',
  },
  {
    id: 'DRN-2026-TG-0115',
    farm: {
      vi: 'Hợp tác xã Mỹ Long',
      en: 'My Long Cooperative',
    },
    province: {
      vi: 'Tiền Giang',
      en: 'Tien Giang',
    },
    harvestDate: '2026-03-15',
    cadmiumPpm: 0.047,
    thresholdPpm: 0.05,
    aiResult: {
      vi: 'Cần kiểm tra lại',
      en: 'Needs re-check',
    },
    confidence: 0.71,
    riskLevel: 'medium',
    riskCause: {
      vi: 'Cadimi gần ngưỡng cho phép, đề nghị kiểm nghiệm bổ sung',
      en: 'Cadmium close to limit, additional testing recommended',
    },
    timeline: [
      {
        stage: {
          vi: 'Thu hoạch',
          en: 'Harvest',
        },
        location: {
          vi: 'HTX Mỹ Long, Tiền Giang',
          en: 'My Long Cooperative, Tien Giang',
        },
        date: '2026-03-15',
        status: 'complete',
      },
      {
        stage: {
          vi: 'Kiểm nghiệm',
          en: 'Lab test',
        },
        location: {
          vi: 'Trung tâm kiểm định Tiền Giang',
          en: 'Tien Giang Testing Center',
        },
        date: '2026-03-17',
        status: 'complete',
      },
      {
        stage: {
          vi: 'Đóng gói',
          en: 'Packing',
        },
        location: {
          vi: 'Nhà đóng gói Cai Lậy',
          en: 'Cai Lay Packing House',
        },
        date: '2026-03-19',
        status: 'pending',
      },
      {
        stage: {
          vi: 'Xuất khẩu',
          en: 'Export',
        },
        location: {
          vi: 'Cảng Cát Lái - Trung Quốc',
          en: 'Cat Lai Port - China',
        },
        date: '-',
        status: 'pending',
      },
    ],
    blockchainHash: '3yB7cBkheTqA83TZRuJosg...AsUy',
  },
  {
    id: 'DRN-2026-DL-0892',
    farm: {
      vi: 'Nông trại Eatu',
      en: 'Eatu Farm',
    },
    province: {
      vi: 'Đắk Lắk',
      en: 'Dak Lak',
    },
    harvestDate: '2026-02-02',
    cadmiumPpm: 0.062,
    thresholdPpm: 0.05,
    aiResult: {
      vi: 'Không đạt - giữ lô',
      en: 'Hold - does not pass',
    },
    confidence: 0.88,
    riskLevel: 'high',
    riskCause: {
      vi: 'Cadimi vượt ngưỡng cho phép, lô hàng bị giữ để xử lý',
      en: 'Cadmium exceeds limit; batch held pending action',
    },
    timeline: [
      {
        stage: {
          vi: 'Thu hoạch',
          en: 'Harvest',
        },
        location: {
          vi: 'Nông trại Eatu, Đắk Lắk',
          en: 'Eatu Farm, Dak Lak',
        },
        date: '2026-02-02',
        status: 'complete',
      },
      {
        stage: {
          vi: 'Kiểm nghiệm',
          en: 'Lab test',
        },
        location: {
          vi: 'Trung tâm kiểm định Buôn Ma Thuột',
          en: 'Buon Ma Thuot Testing Center',
        },
        date: '2026-02-05',
        status: 'complete',
      },
      {
        stage: {
          vi: 'Đóng gói',
          en: 'Packing',
        },
        location: {
          vi: '-',
          en: '-',
        },
        status: 'pending',
        date: '-',
      },
      {
        stage: {
          vi: 'Xuất khẩu',
          en: 'Export',
        },
        location: {
          vi: '-',
          en: '-',
        },
        status: 'pending',
        date: '-',
      },
    ],
    blockchainHash: '4xKXtg2CW87d97TXJSDpbD...3TZR',
  },
]

export const defaultBatchId = 'DRN-2026-LD-0428'

export function localized(value, language) {
  if (!value) return ''
  if (typeof value === 'object') {
    return value[language] || value.vi || ''
  }
  return value
}

export function formatDate(dateStr, language) {
  if (!dateStr || dateStr === '-') {
    return language === 'vi' ? 'Chưa có lịch' : 'Pending'
  }
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const locale = language === 'vi' ? 'vi-VN' : 'en-US'
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}
