// Learning Matrix TypeScript types.
//
// Mirrors the GraphQL schema: keep in sync with backend/graph/schema.graphqls
// (LearningGoal, LearningSection, LearningItem, etc.).

export type ItemType = "unit" | "assignment";
export type VideoType = "none" | "upload" | "external";
export type AssessmentType = "completion" | "score";
export type QuestionKind = "mcq" | "multi" | "true_false";

export type GoalStatus = "not_started" | "in_progress" | "completed";
export type UnitStatus = "pending" | "completed";
export type AssignmentStatus = "pending" | "passed" | "failed";

export interface LearningQuestion {
  id: string;
  assignmentID: string;
  kind: QuestionKind;
  prompt: string;
  options: string[];
  correctAnswers: string[];
  points: number;
  orderIndex: number;
}

export interface LearningItem {
  id: string;
  sectionId: string;
  itemType: ItemType;
  orderIndex: number;
  title: string;
  description?: string | null;
  // Unit only
  videoType?: VideoType | null;
  videoUrl?: string | null;
  content?: string | null;
  // Assignment only
  assessmentType?: AssessmentType | null;
  passScore?: number | null;
  questions?: LearningQuestion[] | null;
}

export interface QuizSubmissionResult {
  progress: ItemProgress;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
}

export interface LearningSection {
  id: string;
  goalId: string;
  title: string;
  orderIndex: number;
  items: LearningItem[];
}

export interface LearningGoal {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  isMandatory: boolean;
  sections: LearningSection[];
  createdAt: string;
}

export interface GoalAssignmentItem {
  id: string;
  goalId: string;
  departmentId: string;
  goal: LearningGoal;
  department: { id: string; name: string };
  createdAt: string;
}

export interface ItemProgress {
  id: string;
  itemId: string;
  itemType: ItemType;
  status: UnitStatus | AssignmentStatus;
  score?: number | null;
  completedAt?: string | null;
}

export interface EmployeeGoalProgress {
  id: string;
  employeeId: string;
  goalId: string;
  status: GoalStatus;
  completedAt?: string | null;
  goal: LearningGoal;
  itemProgress: ItemProgress[];
}

export interface ModuleVideoUpload {
  unitId: string;
  uploadUrl: string;
  videoStoragePath: string;
}

// ── Form helpers ──────────────────────────────────────────────────────────

export interface GoalForm {
  title: string;
  description: string;
  dueDate: string;
  isMandatory: boolean;
}

export interface UnitForm {
  title: string;
  description: string;
  videoType: VideoType;
  videoUrl: string;
  content: string;
}

export interface AssignmentForm {
  title: string;
  description: string;
  assessmentType: AssessmentType;
  passScore: number;
}

export interface QuestionForm {
  kind: QuestionKind;
  prompt: string;
  options: string[];
  correctAnswers: string[]; // for mcq -> ["1"], multi -> ["0","2"], true_false -> ["true"]
  points: number;
}

export const emptyQuestionForm = (kind: QuestionKind = "mcq"): QuestionForm => ({
  kind,
  prompt: "",
  options: kind === "true_false" ? [] : ["", ""],
  correctAnswers: [],
  points: 1,
});

// ── Progress helpers ──────────────────────────────────────────────────────

/** Flatten a goal's sections into a single ordered list of items. */
export function flattenItems(goal: LearningGoal): LearningItem[] {
  const sorted = [...(goal.sections ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
  return sorted.flatMap((s) => [...(s.items ?? [])].sort((a, b) => a.orderIndex - b.orderIndex));
}

/** Determine unlocked state per item in order, mirroring backend rules. */
export function computeLockedMap(
  goal: LearningGoal,
  progress: ItemProgress[],
): Record<string, boolean> {
  const items = flattenItems(goal);
  const byId = new Map(progress.map((p) => [`${p.itemType}:${p.itemId}`, p]));
  const locked: Record<string, boolean> = {};
  let prevDone = true; // first item always unlocked
  for (const it of items) {
    locked[it.id] = !prevDone;
    const p = byId.get(`${it.itemType}:${it.id}`);
    const done =
      (it.itemType === "unit" && p?.status === "completed") ||
      (it.itemType === "assignment" && p?.status === "passed");
    prevDone = !!done;
  }
  return locked;
}

/** (completed, total) tuple for a progress row. */
export function progressStats(p: EmployeeGoalProgress): { completed: number; total: number; pct: number } {
  const items = p.itemProgress ?? [];
  const total = items.length;
  const completed = items.filter(
    (i) =>
      (i.itemType === "unit" && i.status === "completed") ||
      (i.itemType === "assignment" && i.status === "passed"),
  ).length;
  return { completed, total, pct: total === 0 ? 0 : Math.round((completed / total) * 100) };
}
