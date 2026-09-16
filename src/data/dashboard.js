import canonicalData from './class360.json';

export const dashboardData = canonicalData;
export const classIds = Object.keys(canonicalData.classes || {}).sort();

export const SUBJECTS = [
  {
    id: 'math',
    name: '數學',
    shortName: '數學',
    color: '#dc2626',
    schoolAvg: 54,
    countyAvg: 54,
    tested: 247,
    note: '全校第一優先檢視；6 / 9 班待加強偏高。'
  },
  {
    id: 'english',
    name: '英語文',
    shortName: '英語',
    color: '#2563eb',
    schoolAvg: 84,
    countyAvg: 81,
    tested: 247,
    note: '整體表現穩健，但 503、508 班形成集中落差。'
  },
  {
    id: 'chinese',
    name: '國語文',
    shortName: '國語',
    color: '#16a34a',
    schoolAvg: 77,
    countyAvg: 72,
    tested: 250,
    note: '全校表現最穩健，維持常態教學深耕。'
  }
];

const peerDeltaBySubject = {
  chinese: [1.83, -1.54, -4.94, 4.08, -0.41, 2.94, -4.94, 0.71, 2.98],
  math: [-0.47, -2.72, -4.99, 6.26, 5.16, -1.59, -6.14, 2.90, 1.79],
  english: [1.88, 4.13, -7.13, 3.01, -0.36, 1.88, -1.50, -7.10, 5.30]
};

export const subjectIndex = Object.fromEntries(SUBJECTS.map((subject) => [subject.id, subject]));

export function getSubject(id) {
  return subjectIndex[id] || SUBJECTS[0];
}

export function getClassData(classId) {
  return canonicalData.classes[classId] || canonicalData.classes[classIds[0]];
}

export function getRows(classId) {
  return getClassData(classId)?.zone1_matrix || [];
}

function validSubjectRecord(row, subjectName) {
  const record = row.subjects?.[subjectName];
  return record && record.status === 'VALID' ? record : null;
}

export function getClassSubjectStats(classId, subjectId) {
  const subject = getSubject(subjectId);
  const rows = getRows(classId);
  const valid = rows.map((row) => validSubjectRecord(row, subject.name)).filter(Boolean);
  const support = valid.filter((record) => record.officialLevel === '待加強');
  const accuracies = valid.map((record) => record.studentAccuracy).filter((value) => Number.isFinite(value));
  const index = classIds.indexOf(classId);

  return {
    classId,
    subjectId,
    subjectName: subject.name,
    supportCount: support.length,
    tested: valid.length,
    supportRate: valid.length ? support.length / valid.length * 100 : 0,
    avgAccuracy: accuracies.length ? accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length : null,
    delta: peerDeltaBySubject[subjectId]?.[index] ?? 0
  };
}

export function getSchoolSubjectStats(subjectId) {
  const subject = getSubject(subjectId);
  const allRows = classIds.flatMap((classId) => getRows(classId));
  const valid = allRows.map((row) => validSubjectRecord(row, subject.name)).filter(Boolean);
  const support = valid.filter((record) => record.officialLevel === '待加強');
  const classStats = classIds.map((classId) => getClassSubjectStats(classId, subjectId));

  return {
    ...subject,
    delta: subject.schoolAvg - subject.countyAvg,
    supportCount: support.length,
    supportRate: valid.length ? support.length / valid.length * 100 : 0,
    testedCount: valid.length,
    classStats,
    priorityClassCount: classStats.filter((item) => item.supportRate >= 18).length
  };
}

export function getClassStats(classId) {
  const data = getClassData(classId);
  const rows = getRows(classId);
  const summary = data.summary || {};
  const breadthCounts = summary.breadthCounts || summary.breadth_counts || {};
  const completeRows = rows.filter((row) => row.dataCompleteness?.status === 'COMPLETE');
  const testedCount = rows.filter((row) => SUBJECTS.every((subject) => validSubjectRecord(row, subject.name))).length;
  const inconsistentRows = rows.filter((row) => row.crossSubjectInconsistency?.isInconsistent);
  const multiRows = rows.filter((row) => (row.supportBreadth?.breadth || 0) >= 2);

  return {
    classId,
    totalStudents: rows.length,
    completeCount: completeRows.length,
    testedCount,
    testedRate: rows.length ? testedCount / rows.length * 100 : 0,
    completenessRate: rows.length ? completeRows.length / rows.length * 100 : 0,
    inconsistentCount: inconsistentRows.length,
    multiSupportCount: multiRows.length,
    breadthCounts: {
      0: Number(breadthCounts['0'] || 0),
      1: Number(breadthCounts['1'] || 0),
      2: Number(breadthCounts['2'] || 0),
      3: Number(breadthCounts['3'] || 0)
    },
    subjects: Object.fromEntries(SUBJECTS.map((subject) => [subject.id, getClassSubjectStats(classId, subject.id)]))
  };
}

export function getSchoolStats() {
  const allRows = classIds.flatMap((classId) => getRows(classId));
  const complete = allRows.filter((row) => row.dataCompleteness?.status === 'COMPLETE').length;
  const subjects = Object.fromEntries(SUBJECTS.map((subject) => [subject.id, getSchoolSubjectStats(subject.id)]));
  const priorityClasses = classIds.filter((classId) => {
    const stats = getClassStats(classId);
    return stats.subjects.math.supportRate >= 18 || stats.subjects.english.supportRate >= 18 || stats.subjects.chinese.supportRate >= 18;
  });

  return {
    totalStudents: allRows.length,
    completeCount: complete,
    completenessRate: allRows.length ? complete / allRows.length * 100 : 0,
    testedRate: allRows.length ? allRows.filter((row) => SUBJECTS.every((subject) => validSubjectRecord(row, subject.name))).length / allRows.length * 100 : 0,
    priorityClassCount: priorityClasses.length,
    priorityClasses,
    subjects
  };
}

export const ACTION_PRESETS = {
  '508': {
    title: '508 班英語文專任教學與語音聽辨檢視',
    badge: '單科特定偏離・專任學科向',
    classIds: ['508'],
    subjectId: 'english',
    who: '英語專任教師 × 英語領域輔導員',
    problem: '國語與數學均優於同儕，唯英語文單科落差較顯著（-7.10 pp）；低 PR 學生集中於語音聽辨瓶頸。',
    actions: [
      { title: '同儕入班觀課支持', description: '邀請英語領域輔導員或資深教師進行教學觀摩，協助精進提問節奏與發音互動設計。' },
      { title: '字母拼讀與晨光短音檔', description: '針對易混淆母音加強 Phonics 基礎練習，每日播放 5–10 分鐘生活情境會話短音檔。' }
    ],
    kpi: '語音聽辨次維度答對率提升至 65% 以上，英語班平均同儕落差收斂至 ±2.0 pp 以內。',
    when: '第 2 週同儕觀課對話・第 5 週聽辨短測・第 9 週評量回饋'
  },
  'math-all': {
    title: '五年級數學領域共同備課與單元教材檢視',
    badge: '單科多班・系統共備向',
    classIds: [],
    subjectId: 'math',
    who: '五年級數學教學研究會 × 教務處教學組',
    problem: '相對縣市平均領先歸零，6 / 9 班待加強人數偏高；「量與實測」與「程序執行」是學年共同關注核心。',
    actions: [
      { title: '幾何測量具體物教具共備', description: '於幾何測量單元導入具體物操作盒，強化空間表徵建立。' },
      { title: '混合運算程序結構化固本', description: '研發階梯式學習輔助單，引導學生掌握運算先後順序規則。' },
      { title: '教務處採購操作型教具', description: '優先挹注空間幾何與測量教具箱至各班課堂。' }
    ],
    kpi: '量與實測次維度通過率回升至 55% 以上，班際極差收斂至 6 pp 以內。',
    when: '第 1–2 週試卷盤點・第 4 週領域會議・第 8 週教具導入檢核'
  },
  '503': {
    title: '503 班跨學科基礎概念引導與適性教學支援',
    badge: '跨科同儕落差・跨科協同向',
    classIds: ['503'],
    who: '教學組長 × 503 導師 × 國數英任課教師',
    problem: '國語、數學與英語三科皆低於同儕，英語待加強學生相對集中；多數學科基礎概念需同步奠基。',
    actions: [
      { title: '跨科任課教師交流對話', description: '由教務處偕同國語、數學、英語任課教師與導師對焦概念銜接難點。' },
      { title: '自主學習策略與晨光引導', description: '善用晨光時間引導學習策略與自主筆記習慣，建立正向學習效能感。' },
      { title: '課堂適性學習回饋', description: '對基礎概念尚未穩固的學生提供即時鼓勵與階梯式鷹架支持。' }
    ],
    kpi: '英語與數學待加強人數於期末降低 30%，建立每雙週一次的跨科學習交流機制。',
    when: '第 3 週跨科會談・每雙週導師交流・第 10 週形成性檢核'
  },
  '507': {
    title: '507 班數學基礎概念強化與教學支援',
    badge: '數學學力偏弱・課堂適性向',
    classIds: ['507'],
    subjectId: 'math',
    who: '數學任課教師 × 507 班導師',
    problem: '數學班平均為全校低點，待加強學生達 9 人，低 PR 群集中，應優先進行概念斷層診斷。',
    actions: [
      { title: '運算迷思個別化診斷', description: '針對待加強學生進行四則運算迷思診斷，釐清概念斷層與符號混淆。' },
      { title: '課堂異質分組合作學習', description: '安排學習優勢同儕進行協同共學，降低數學學習焦慮。' },
      { title: '具體操作化抽象為具體', description: '增加具體教具操作時間，加強運算程序與情境題意理解。' }
    ],
    kpi: '數學待加強人數降至 4 人以內，基本運算程序題型正確率達 80% 以上。',
    when: '第 3 週錯題訪談・第 7 週分組學習回饋・第 10 週單元小測驗'
  },
  '504': {
    title: '504 / 509 班全面均衡領先經驗擴散',
    badge: '全面領先標竿・典範分享向',
    classIds: ['504', '509'],
    who: '504 / 509 班任課教師 × 學年主任',
    problem: '國語、數學、英語三科全面顯著高於同儕，待加強人數僅 1–2 人，學力體質穩健扎實。',
    actions: [
      { title: '課堂互動典範分享', description: '邀請任課教師於學年教學研究會分享雙語提問引導與小組共學經驗。' },
      { title: '跨領域探究任務規劃', description: '為學力優勢學生規劃跨學科專題探究，促進高階思維與多元表達。' }
    ],
    kpi: '形成校本優良教學案例庫，促進學年教學經驗傳承。',
    when: '期中教學研究會專題分享・常態性教學觀摩'
  },
  '509': {
    title: '509 班英語文與跨學科優勢經驗分享',
    badge: '雙語穩健卓越・典範分享向',
    classIds: ['509'],
    subjectId: 'english',
    who: '509 班導師與任課教師',
    problem: '英語文班平均領先同儕，國語與數學齊頭並進，待加強學生僅 1 人。',
    actions: [
      { title: '雙語課堂互動經驗分享', description: '邀請任課教師分享英語情境教學與學生提問引導策略。' },
      { title: '適性閱讀深化', description: '提供高階英語讀本與自主閱讀材料，延伸學習動能。' }
    ],
    kpi: '完成教學研究會典範教案整理與分享。',
    when: '常態教學觀察與分享'
  }
};

export function getActionPreset(key) {
  return ACTION_PRESETS[key] || {
    title: `${key} 班學力診斷與適性教學指引`,
    badge: '常態追蹤',
    classIds: [key],
    who: `${key} 班導師 × 各學科任課教師`,
    problem: '該班資料顯示目前適合持續追蹤學習進程，並以課堂觀察補充量化結果。',
    actions: [
      { title: '個別概念奠基', description: '針對課堂作業及小測驗易錯概念，提供及時個別回饋。' },
      { title: '常態教學觀察', description: '維持規律課堂節奏，落實同儕合作學習與自主學習引導。' }
    ],
    kpi: '各學科班平均維持於學年常模水平，待加強學生數維持低檔。',
    when: '常態教學督導與雙週教學檢視'
  };
}

export function getPriorityItems() {
  return [
    { key: '507', classId: '507', subjectId: 'math', title: '507 班・數學', reason: '9 人待加強，全校最高', tone: 'danger' },
    { key: '503', classId: '503', subjectId: 'english', title: '503 班・跨科', reason: '三科同儕落差集中', tone: 'danger' },
    { key: '508', classId: '508', subjectId: 'english', title: '508 班・英語文', reason: '單科差距 -7.10 pp', tone: 'warning' }
  ];
}

export function getStudentDrawer(classId, seat) {
  const classData = getClassData(classId);
  const row = getRows(classId).find((item) => String(item.seat) === String(seat));
  if (!row) return null;
  return classData.zone5_drawers?.[row.seat] || row;
}
