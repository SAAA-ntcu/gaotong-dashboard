export const SUBJECT360_META = [
  { id: 'math', label: '數學', color: '#2563eb' },
  { id: 'chinese', label: '國語文', color: '#16a34a' },
  { id: 'english', label: '英語文', color: '#b86616' }
];

export const SUBJECT360_DATA_URL = `${import.meta.env.BASE_URL}data/subject360.json`;
export const SUBJECT360_HISTORY_URL = `${import.meta.env.BASE_URL}data/subject360-history.json`;

export async function loadSubject360() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const [response, historyResponse] = await Promise.all([
      fetch(SUBJECT360_DATA_URL, { signal: controller.signal }),
      fetch(SUBJECT360_HISTORY_URL, { signal: controller.signal })
    ]);
    if (!response.ok) throw new Error(`科目資料載入失敗：${response.status}`);
    if (!historyResponse.ok) throw new Error(`歷年資料載入失敗：${historyResponse.status}`);
    const [data, history] = await Promise.all([response.json(), historyResponse.json()]);
    if (!history?.subjects) throw new Error('歷年分析資料格式錯誤。');
    Object.entries(data.subjects || {}).forEach(([subjectId, subject]) => {
      subject.historicalAnalysis = history.subjects[subjectId] || null;
    });
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('科目資料載入逾時，請重新整理後再試。');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function getSubjectMeta(subjectId) {
  return SUBJECT360_META.find((subject) => subject.id === subjectId) || SUBJECT360_META[0];
}

export function getDimensions(subject, type) {
  return subject?.dimensions?.[type] || [];
}
export function getLinkedDimensions(subject) {
  const content = getDimensions(subject, 'content');
  const cognitive = getDimensions(subject, 'cognitive');
  if (!cognitive.length) {
    return content.map((dimension) => ({
      ...dimension,
      contentKey: dimension.key,
      cognitiveKey: null,
      label: dimension.key
    }));
  }
  return content.flatMap((contentDimension) => cognitive
    .map((cognitiveDimension) => {
      const items = subject.items
        .filter((item) => item.content === contentDimension.key && item.cognitive === cognitiveDimension.key)
        .map((item) => item.q);
      if (!items.length) return null;
      return {
        key: `${contentDimension.key} × ${cognitiveDimension.key}`,
        label: `${contentDimension.key} × ${cognitiveDimension.key}`,
        description: `${contentDimension.key} 的${cognitiveDimension.key}表現`,
        contentKey: contentDimension.key,
        cognitiveKey: cognitiveDimension.key,
        items
      };
    })
    .filter(Boolean));
}

export function getLinkedDimensionStat(subject, dimension, selectedClasses) {
  return aggregateStats(dimension.items.map((question) => getItemStat(subject, question, selectedClasses)));
}

export function linkedDimensionPriority(subject, dimension, selectedClasses, baselineClassIds = getClassIds(subject)) {
  const school = getLinkedDimensionStat(subject, dimension, baselineClassIds);
  const selected = getLinkedDimensionStat(subject, dimension, selectedClasses);
  const gap = selected?.rate == null || school?.rate == null ? null : selected.rate - school.rate;
  const lowRate = selected?.rate != null && selected.rate < 0.6;
  const largeGap = gap != null && gap < -0.1;
  const level = lowRate && largeGap ? '高優先' : lowRate || largeGap ? '中優先' : '建議觀察';
  return {
    dimension,
    school,
    selected,
    gap,
    level,
    reasons: [lowRate ? '所選範圍答對率偏低' : '', largeGap ? '低於比較基準' : ''].filter(Boolean)
  };
}

export function getHistoricalDimensionDiagnosis(subject, dimension, selectedClasses) {
  const analysis = subject?.historicalAnalysis;
  if (!analysis || !dimension) return null;
  const dimensionKey = dimension.contentKey || dimension.key;
  const historyDimension = (analysis.dimensions || []).find((candidate) => candidate.key === dimensionKey) || null;
  const questionIds = new Set((dimension.items || []).map(Number));
  const items = Object.values(analysis.itemInsights || {})
    .filter((insight) => questionIds.has(Number(insight.q)) || insight.dimension === dimensionKey)
    .map((insight) => {
      const stat = getItemStat(subject, Number(insight.q), selectedClasses);
      const hasCurrentData = Number(stat?.valid || 0) > 0;
      return {
        ...insight,
        currentRate: hasCurrentData ? stat.rate : null,
        currentValid: hasCurrentData ? stat.valid : 0,
        currentTopWrong: hasCurrentData ? stat.topWrong : null,
        currentSignal: hasCurrentData && stat.rate != null && stat.rate < 0.7
      };
    })
    .sort((a, b) => (a.currentRate ?? 1) - (b.currentRate ?? 1));
  const signalItems = items.filter((item) => item.currentSignal);
  const misconceptions = [...new Set(signalItems.flatMap((item) => item.misconceptions || []))].slice(0, 6);
  const sources = [...new Map([
    ...(historyDimension?.sources || []).map((source) => [`${source.year}-${source.file}-${source.section}`, source]),
    ...signalItems.flatMap((item) => (item.sources || []).map((source) => [`${source.year}-${source.file}-${source.section}`, source]))
  ]).values()].slice(0, 8);
  const current = getLinkedDimensionStat(subject, dimension, selectedClasses);
  return {
    key: dimensionKey,
    label: historyDimension?.label || dimension.label || dimension.key,
    historyDimension,
    currentRate: current?.rate ?? null,
    currentValid: current?.valid || 0,
    items,
    signalItems,
    misconceptions,
    sources,
    hasCurrentSignal: signalItems.length > 0,
    evidenceLabel: signalItems.length ? '本次訊號支持的候選' : '歷史提醒，尚未有本次題目訊號支持'
  };
}

export function getAllDimensions(subject) {
  return ['content', 'cognitive'].flatMap((type) => getDimensions(subject, type).map((dimension) => ({ ...dimension, type })));
}

export function getClassIds(subject) {
  return subject?.classIds || [];
}

export function getScopeLabel(subject, selectedClasses) {
  const classIds = getClassIds(subject);
  if (selectedClasses.length === classIds.length) return `全校 ${classIds.length} 班`;
  return selectedClasses.map((classId) => `${classId} 班`).join('、') || '尚未選取班級';
}

function emptyCounts() {
  return [0, 0, 0, 0, 0];
}

export function aggregateStats(statsList, answer = null) {
  const stats = statsList.filter(Boolean);
  const total = stats.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const valid = stats.reduce((sum, item) => sum + Number(item.valid || 0), 0);
  const correct = stats.reduce((sum, item) => sum + Number(item.correct || 0), 0);
  const counts = stats.reduce((result, item) => {
    (item.counts || emptyCounts()).forEach((count, index) => { result[index] += Number(count || 0); });
    return result;
  }, emptyCounts());
  const optionRates = counts.map((count) => total ? count / total : 0);
  const wrongOptions = counts
    .map((count, index) => ({ option: index + 1, count, rate: total ? count / total : 0 }))
    .filter((item) => item.option <= 4 && item.option !== answer)
    .sort((a, b) => b.count - a.count);
  const topWrong = wrongOptions[0] && wrongOptions[0].count > 0
    ? { ...wrongOptions[0], share: valid - correct > 0 ? wrongOptions[0].count / (valid - correct) : 0 }
    : null;

  return {
    total,
    valid,
    correct,
    rate: valid ? correct / valid : null,
    allRate: total ? correct / total : null,
    counts,
    optionRates,
    wrong: Math.max(0, valid - correct),
    topWrong
  };
}

export function getItemStat(subject, question, selectedClasses) {
  const answer = subject.items[question - 1]?.answer;
  const classIds = getClassIds(subject);
  if (selectedClasses.length === classIds.length) return subject.itemStats?.school?.[question - 1] || aggregateStats([], answer);
  return aggregateStats(selectedClasses.map((classId) => subject.itemStats?.classes?.[classId]?.[question - 1]), answer);
}

export function getSchoolItemStat(subject, question) {
  return subject.itemStats?.school?.[question - 1] || aggregateStats([], subject.items[question - 1]?.answer);
}

export function getDimensionStat(subject, type, key, selectedClasses) {
  const dimension = getDimensions(subject, type).find((item) => item.key === key);
  if (!dimension) return null;
  return aggregateStats(dimension.items.map((question) => getItemStat(subject, question, selectedClasses)));
}

export function getClassOverall(subject, classId) {
  return aggregateStats(subject.itemStats?.classes?.[classId] || []);
}

export function getOverall(subject, selectedClasses) {
  return aggregateStats(subject.items.map((item) => getItemStat(subject, item.q, selectedClasses)));
}

export function formatPercent(value, digits = 0) {
  return value == null || Number.isNaN(Number(value)) ? 'n.a.' : `${(Number(value) * 100).toFixed(digits)}%`;
}

export function formatPoints(value, digits = 1) {
  return value == null || Number.isNaN(Number(value)) ? 'n.a.' : `${Number(value) > 0 ? '+' : ''}${(Number(value) * 100).toFixed(digits)} pp`;
}

export function formatCount(value) {
  return Number(value || 0).toLocaleString('zh-TW');
}

export function itemPriority(subject, question, selectedClasses, baselineClassIds = getClassIds(subject)) {
  const item = subject.items[question - 1];
  const school = getItemStat(subject, question, baselineClassIds);
  const selected = getItemStat(subject, question, selectedClasses);
  const delta = selected.rate == null || school.rate == null ? null : selected.rate - school.rate;
  const cityRate = subject.official?.cityItem?.[question - 1]?.rate;
  const cityGap = cityRate == null || selected.rate == null ? null : selected.rate - cityRate;
  const lowRate = selected.rate != null && selected.rate < 0.6;
  const largeGap = delta != null && delta < -0.1;
  const concentrated = selected.topWrong?.share >= 0.55;
  const signals = [lowRate, largeGap, concentrated].filter(Boolean).length;
  const level = signals >= 2 ? '高優先' : signals === 1 ? '中優先' : '建議觀察';
  return { item, school, selected, delta, cityRate, cityGap, level, signals };
}

export function dimensionPriority(subject, type, key, selectedClasses, baselineClassIds = getClassIds(subject)) {
  const dimension = getDimensions(subject, type).find((item) => item.key === key);
  const school = getDimensionStat(subject, type, key, baselineClassIds);
  const selected = getDimensionStat(subject, type, key, selectedClasses);
  const gap = selected?.rate == null || school?.rate == null ? null : selected.rate - school.rate;
  const lowRate = selected?.rate != null && selected.rate < 0.6;
  const largeGap = gap != null && gap < -0.1;
  const level = lowRate && largeGap ? '高優先' : lowRate || largeGap ? '中優先' : '建議觀察';
  return { dimension, school, selected, gap, level, reasons: [lowRate ? '所選範圍答對率偏低' : '', largeGap ? '低於比較基準' : ''].filter(Boolean) };
}


function validResponse(value) {
  return Number.isInteger(value) && value >= 1 && value <= 4;
}

export function getStudentDimension(subject, student, type, dimension) {
  const questions = dimension.items;
  const responses = questions.map((question) => student.responses[question - 1]);
  const valid = responses.filter(validResponse);
  const correct = responses.filter((response, index) => validResponse(response) && response === subject.items[questions[index] - 1]?.answer).length;
  return {
    key: dimension.key,
    rate: valid.length ? correct / valid.length : null,
    valid: valid.length,
    total: responses.length,
    type
  };
}

export function getStudentProfile(subject, student) {
  if (!student) return null;
  const content = getDimensions(subject, 'content').map((dimension) => getStudentDimension(subject, student, 'content', dimension));
  const cognitive = getDimensions(subject, 'cognitive').map((dimension) => getStudentDimension(subject, student, 'cognitive', dimension));
  const linked = getLinkedDimensions(subject).map((dimension) => ({
    ...getStudentDimension(subject, student, 'linked', dimension),
    contentKey: dimension.contentKey,
    cognitiveKey: dimension.cognitiveKey
  }));
  const wrongItems = subject.items.filter((item) => {
    const response = student.responses[item.q - 1];
    return !validResponse(response) || response !== item.answer;
  });
  const weak = linked.filter((row) => row.rate != null && row.rate < 0.6).sort((a, b) => a.rate - b.rate);
  const missing = student.responses.filter((response) => !validResponse(response)).length;
  const optionCounts = {};
  wrongItems.forEach((item) => {
    const response = student.responses[item.q - 1];
    if (validResponse(response)) optionCounts[`${item.q}:${response}`] = (optionCounts[`${item.q}:${response}`] || 0) + 1;
  });
  return { content, cognitive, linked, wrongItems, weak, missing, optionCounts };
}
export function getStudentsForLinkedDimension(subject, selectedClasses, dimension, threshold = 0.6) {
  return getClassStudents(subject, selectedClasses)
    .map((student) => ({ student, stat: getStudentDimension(subject, student, 'linked', dimension) }))
    .filter((row) => row.stat.rate != null && row.stat.rate < threshold)
    .sort((a, b) => a.stat.rate - b.stat.rate || a.student.class.localeCompare(b.student.class, 'zh-Hant', { numeric: true }) || a.student.seat.localeCompare(b.student.seat, 'zh-Hant', { numeric: true }));
}

export function getClassStudents(subject, selectedClasses) {
  return (subject.students || [])
    .filter((student) => selectedClasses.includes(student.class))
    .sort((a, b) => a.class.localeCompare(b.class, 'zh-Hant', { numeric: true }) || a.seat.localeCompare(b.seat, 'zh-Hant', { numeric: true }));
}

export function getStudentGroups(subject, selectedClasses) {
  const students = getClassStudents(subject, selectedClasses);
  const groups = {
    '特定概念待確認': [],
    '作答表現不穩定／需進一步診斷': [],
    '多題共同待支持': []
  };
  students.forEach((student) => {
    const profile = getStudentProfile(subject, student);
    const wrong = profile.wrongItems.length;
    const unstable = profile.missing > 0 || profile.weak.length >= 2;
    const repeatedWrong = Object.values(profile.optionCounts).some((count) => count >= 2);
    const group = repeatedWrong ? '特定概念待確認' : unstable ? '作答表現不穩定／需進一步診斷' : wrong >= Math.max(3, Math.ceil(subject.questionCount * 0.2)) ? '多題共同待支持' : null;
    if (group) groups[group].push({ student, profile });
  });
  return Object.entries(groups).map(([name, members]) => {
    const weakCounts = new Map();
    const wrongCounts = new Map();
    members.forEach(({ profile }) => {
      profile.weak.forEach((row) => weakCounts.set(row.key, (weakCounts.get(row.key) || 0) + 1));
      profile.wrongItems.forEach((item) => wrongCounts.set(item.q, (wrongCounts.get(item.q) || 0) + 1));
    });
    const commonWeak = [...weakCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([key, count]) => ({ key, count }));
    const commonWrong = [...wrongCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([q, count]) => ({ q, count }));
    return { name, members, commonWeak, commonWrong };
  }).filter((group) => group.members.length);
}
