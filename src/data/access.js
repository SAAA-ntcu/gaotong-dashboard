export const ALL_SUBJECT_IDS = Object.freeze(['math', 'chinese', 'english']);
export const ALL_CLASS_IDS = Object.freeze(['501', '502', '503', '504', '505', '506', '507', '508', '509']);

const SUBJECT_LABELS = Object.freeze({
  math: '數學',
  chinese: '國語文',
  english: '英語文'
});

function classScopeLabel(classIds) {
  if (classIds.length === ALL_CLASS_IDS.length) return '全校 501–509 班';
  return `${classIds.join('、')} 班`;
}

function makeProfile({ id, label, kind, classIds, subjectIds, canViewSchool = false, canViewClass = false }) {
  const profile = {
    id,
    label,
    kind,
    classIds: Object.freeze([...classIds]),
    subjectIds: Object.freeze([...subjectIds]),
    canViewSchool,
    canViewClass
  };
  return Object.freeze({
    ...profile,
    scopeLabel: `${classScopeLabel(profile.classIds)}｜${profile.subjectIds.map((subjectId) => SUBJECT_LABELS[subjectId]).join('・')}`
  });
}

export const ACCESS_PROFILES = Object.freeze([
  makeProfile({
    id: 'principal',
    label: '校長',
    kind: 'school_leader',
    classIds: ALL_CLASS_IDS,
    subjectIds: ALL_SUBJECT_IDS,
    canViewSchool: true,
    canViewClass: true
  }),
  makeProfile({
    id: 'academic_director',
    label: '教務主任',
    kind: 'school_leader',
    classIds: ALL_CLASS_IDS,
    subjectIds: ALL_SUBJECT_IDS,
    canViewSchool: true,
    canViewClass: true
  }),
  ...ALL_CLASS_IDS.map((classId) => makeProfile({
    id: `homeroom_${classId}`,
    label: `${classId} 班導師`,
    kind: 'homeroom_teacher',
    classIds: [classId],
    subjectIds: ALL_SUBJECT_IDS,
    canViewClass: true
  })),
  makeProfile({
    id: 'english_teacher_1',
    label: '英語科任教師 1',
    kind: 'subject_teacher',
    classIds: ['501', '502', '503'],
    subjectIds: ['english']
  }),
  makeProfile({
    id: 'english_teacher_2',
    label: '英語科任教師 2',
    kind: 'subject_teacher',
    classIds: ['504', '505', '506'],
    subjectIds: ['english']
  }),
  makeProfile({
    id: 'english_teacher_3',
    label: '英語科任教師 3',
    kind: 'subject_teacher',
    classIds: ['507', '508', '509'],
    subjectIds: ['english']
  })
]);

const PROFILE_BY_ID = new Map(ACCESS_PROFILES.map((profile) => [profile.id, profile]));

export function getAccessProfile(profileId) {
  return PROFILE_BY_ID.get(String(profileId || '')) || ACCESS_PROFILES[0];
}

export function canAccessSubject(profile, subjectId) {
  return getAccessProfile(profile?.id).subjectIds.includes(String(subjectId));
}

export function canAccessClass(profile, classId) {
  return getAccessProfile(profile?.id).classIds.includes(String(classId));
}

export function getAllowedSubjectIds(profile) {
  return [...getAccessProfile(profile?.id).subjectIds];
}

export function getAllowedClassIds(profile, subject = null) {
  const access = getAccessProfile(profile?.id);
  if (subject?.classIds) return access.classIds.filter((classId) => subject.classIds.includes(classId));
  return [...access.classIds];
}

export function getDefaultLocation(profile) {
  const access = getAccessProfile(profile?.id);
  if (access.canViewSchool) return { name: 'school', query: { role: access.id } };
  if (access.canViewClass) return { name: 'class', query: { role: access.id, class: access.classIds[0] } };
  return {
    name: 'subject',
    query: { role: access.id, subject: access.subjectIds[0], class: access.classIds.join(',') }
  };
}

export function getSubjectLabel(subjectId) {
  return SUBJECT_LABELS[subjectId] || subjectId;
}
