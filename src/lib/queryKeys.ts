export const QK = {
  session: () => ["auth", "session"] as const,
  profile: (uid: string) => ["auth", "profile", uid] as const,
  role: (uid: string) => ["auth", "role", uid] as const,
  allClasses: () => ["admin", "classes"] as const,
  classDetail: (id: string) => ["admin", "classes", id] as const,
  allStudents: () => ["admin", "students", "all"] as const,
  studentsByClass: (classId: string) => ["students", "class", classId] as const,
  staffList: () => ["admin", "staff"] as const,
  logsByDate: (classId: string, date: string) =>
    ["logs", classId, date] as const,
  logsRange: (start: string, end: string) =>
    ["logs", "range", start, end] as const,
  todayAbsenceCount: (date: string) => ["analytics", "absences", date] as const,
} as const;
