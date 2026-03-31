const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// 식품안전의약처 공공API 응답 형식을 흉내낸 목 데이터
const MOCK_SCAN_RESULTS = [
  {
    scan_type: 'prescription',
    raw_ocr: '처방전\n환자명: 홍길동\n처방일: 2026.03.31\n병원: 서울내과의원\n\n1. 타이레놀정 500mg - 1일 3회 식후 30분\n2. 아목시실린캡슐 250mg - 1일 3회 식후 즉시\n\n총 5일분',
    medications: [
      {
        id: 'med001',
        name: '타이레놀정 500mg',
        generic_name: '아세트아미노펜 (Acetaminophen)',
        company: '한국얀센(주)',
        category: '해열·진통·소염제',
        pill_color: '#FF8C69',
        pill_shape: '장방형',
        easy_name: '타이레놀 (열·통증 완화)',
        easy_description: '두통, 치통, 근육통처럼 아픈 곳을 달래주고, 열도 내려주는 약이에요. 감기 걸렸을 때 가장 많이 쓰는 친숙한 약이에요.',
        how_to_take: '한 번에 1~2알, 하루에 최대 4번까지 드실 수 있어요. 복용 간격은 최소 4시간 이상 띄워 주세요.',
        timing_type: 'after_meal',
        timing_minutes: 30,
        timing_label: '식후 30분',
        warnings: [
          '하루 3잔 이상 음주하신다면 드시기 전에 꼭 의사·약사와 상담하세요',
          '다른 감기약에도 같은 성분이 들어 있을 수 있어요, 함께 드시지 마세요',
          '4시간 이내에 다시 드시면 안 돼요'
        ],
        storage: '직사광선을 피해 서늘하고 건조한 곳에 보관하세요'
      },
      {
        id: 'med002',
        name: '아목시실린캡슐 250mg',
        generic_name: '아목시실린 (Amoxicillin)',
        company: '대웅제약(주)',
        category: '항생제',
        pill_color: '#FFD700',
        pill_shape: '캡슐',
        easy_name: '아목시실린 (세균 잡는 항생제)',
        easy_description: '몸속 세균을 없애주는 항생제예요. 편도염, 중이염, 기관지염 등 세균 감염에 처방돼요. 증상이 좋아져도 의사가 정해준 날짜까지 꼭 다 드셔야 해요!',
        how_to_take: '한 번에 1알씩, 하루에 3번 드세요. 고른 간격(예: 아침·점심·저녁)으로 드시면 더 좋아요.',
        timing_type: 'after_meal',
        timing_minutes: 0,
        timing_label: '식후 즉시',
        warnings: [
          '페니실린 알레르기가 있다면 절대 드시면 안 돼요',
          '증상이 나아져도 처방된 기간을 꼭 채워 드세요 (내성 예방)',
          '심한 설사나 피부 발진이 생기면 즉시 의사에게 알리세요'
        ],
        storage: '서늘하고 건조한 곳에 보관하세요'
      }
    ],
    prescription_days: 5
  },
  {
    scan_type: 'pill',
    raw_ocr: 'OMEPRAZOLE 20mg\nHanmi Pharm Co.,Ltd\nKDRF20\nExp: 2027.06',
    medications: [
      {
        id: 'med003',
        name: '오메프라졸캡슐 20mg',
        generic_name: '오메프라졸 (Omeprazole)',
        company: '한미약품(주)',
        category: '위산분비억제제 (PPI)',
        pill_color: '#9B59B6',
        pill_shape: '캡슐',
        easy_name: '오메프라졸 (위산 억제제)',
        easy_description: '위에서 산이 너무 많이 나오는 걸 막아주는 약이에요. 역류성 식도염, 위궤양, 속쓰림이 심할 때 많이 처방돼요. 아침에 일어나서 식사 전에 드시면 가장 효과가 좋아요.',
        how_to_take: '한 번에 1알씩, 하루에 1번만 드세요.',
        timing_type: 'before_meal',
        timing_minutes: 30,
        timing_label: '아침 식전 30분',
        warnings: [
          '장기간 드시면 마그네슘이나 칼슘 수치가 낮아질 수 있어요',
          '2주 이상 드셔도 증상이 계속되면 의사에게 다시 보여주세요',
          '복용 중인 다른 약이 있다면 약사에게 꼭 말해주세요 (상호작용 있음)'
        ],
        storage: '빛과 습기를 피해 30°C 이하에서 보관하세요'
      }
    ],
    prescription_days: null
  },
  {
    scan_type: 'prescription',
    raw_ocr: '처방전\n환자명: 이영희\n처방일: 2026.03.31\n병원: 행복이비인후과\n\n1. 클라리틴정 10mg - 1일 1회 저녁 식후\n2. 후루티카졸비강스프레이 - 1일 2회 각 비공 1회\n\n총 30일분',
    medications: [
      {
        id: 'med004',
        name: '클라리틴정 10mg',
        generic_name: '로라타딘 (Loratadine)',
        company: '바이엘코리아(유)',
        category: '항히스타민제 (알레르기약)',
        pill_color: '#87CEEB',
        pill_shape: '원형',
        easy_name: '클라리틴 (알레르기 완화)',
        easy_description: '콧물, 재채기, 눈 가려움 같은 알레르기 증상을 가라앉혀 주는 약이에요. 졸음이 덜 오는 항히스타민제라서 낮에도 활동하기 편해요.',
        how_to_take: '하루에 한 번, 1알씩만 드세요.',
        timing_type: 'after_meal',
        timing_minutes: 0,
        timing_label: '저녁 식후',
        warnings: [
          '졸음이 올 수 있으니 처음 드실 땐 운전에 주의하세요',
          '신장이나 간 기능이 약하신 분은 의사와 상담 후 드세요',
          '만 2세 미만 아이에게는 드리지 마세요'
        ],
        storage: '직사광선을 피해 실온(15~30°C)에서 보관하세요'
      }
    ],
    prescription_days: 30
  }
];

let scanCount = 0;

// OCR + 식품안전의약처 API 연동 시뮬레이션
app.post('/api/scan', upload.single('image'), (req, res) => {
  setTimeout(() => {
    const result = MOCK_SCAN_RESULTS[scanCount % MOCK_SCAN_RESULTS.length];
    scanCount++;
    res.json({ success: true, ...result });
  }, 2500);
});

// 식사 후 복약 알림 시간 계산
app.post('/api/meal', (req, res) => {
  const { meal_time, medications } = req.body;
  if (!meal_time || !Array.isArray(medications)) {
    return res.status(400).json({ success: false, message: '잘못된 요청입니다.' });
  }

  const mealDate = new Date(meal_time);

  const notifications = medications.map(med => {
    const notifyDate = new Date(mealDate);

    if (med.timing_type === 'after_meal') {
      notifyDate.setMinutes(notifyDate.getMinutes() + (med.timing_minutes || 0));
    } else if (med.timing_type === 'before_meal') {
      // 다음 식사는 약 6시간 후로 가정
      notifyDate.setMinutes(notifyDate.getMinutes() + 360 - (med.timing_minutes || 30));
    } else {
      // anytime: 30분 후
      notifyDate.setMinutes(notifyDate.getMinutes() + 30);
    }

    const isNow = notifyDate <= new Date(Date.now() + 60000);

    return {
      medication_id: med.id,
      medication_name: med.easy_name || med.name,
      timing_label: med.timing_label,
      notify_time: notifyDate.toISOString(),
      is_now: isNow,
      message: isNow
        ? `지금 바로 ${med.easy_name || med.name}을(를) 드세요!`
        : `${formatTime(notifyDate)}에 ${med.easy_name || med.name}을(를) 드세요.`
    };
  });

  notifications.sort((a, b) => new Date(a.notify_time) - new Date(b.notify_time));

  res.json({ success: true, meal_time, notifications });
});

function formatTime(date) {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
}

app.listen(PORT, () => {
  console.log('\n🌿 약쏘옥 서버가 시작되었습니다!');
  console.log(`📱 브라우저에서 열기: http://localhost:${PORT}\n`);
});
