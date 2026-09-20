"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client";
import { useAppSelector } from "@/store/hooks";
import {
  LIST_LEARNING_GOALS,
  GOAL_ASSIGNMENTS,
  DEPARTMENT_LEARNING_PROGRESS,
} from "@/graphql/queries/learning";
import {
  ASSIGN_GOAL_TO_DEPARTMENT,
  REMOVE_GOAL_ASSIGNMENT,
} from "@/graphql/mutations/learning";
import { LIST_DEPARTMENTS } from "@/graphql/queries/employees";
import Header from "@/components/layout/Header";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import {
  LearningGoal,
  GoalAssignmentItem,
  EmployeeGoalProgress,
  progressStats,
} from "@/types/pages/learning/page";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Can from "@/components/access/Can";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface Department {
  id: string;
  name: string;
}

export default function LearningAssignmentsPage() {
  const router = useRouter();
  const params = useParams();
  const tenant = (params?.tenant as string) ?? "";
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ goalId: "", departmentId: "" });

  const { data: goalsData, loading: goalsLoading } = useQuery(LIST_LEARNING_GOALS);
  const { data: deptsData } = useQuery(LIST_DEPARTMENTS);

  const goals: LearningGoal[] = goalsData?.learningGoals ?? [];
  const departments: Department[] = deptsData?.departments ?? [];

  // Initialize default selection once data arrives
  useEffect(() => {
    if (!selectedGoalId && goals.length > 0) {
      setSelectedGoalId(goals[0].id);
    }
  }, [goals, selectedGoalId]);
  useEffect(() => {
    if (!selectedDeptId && departments.length > 0) {
      setSelectedDeptId(departments[0].id);
    }
  }, [departments, selectedDeptId]);

  const { data: assignData, loading: assignLoading } = useQuery(GOAL_ASSIGNMENTS, {
    variables: { goalId: selectedGoalId },
    skip: !selectedGoalId,
  });
  const assignments: GoalAssignmentItem[] = assignData?.goalAssignments ?? [];

  const { data: progressData, loading: progressLoading } = useQuery(DEPARTMENT_LEARNING_PROGRESS, {
    variables: { deptId: selectedDeptId },
    skip: !selectedDeptId,
  });
  const progress: EmployeeGoalProgress[] = progressData?.departmentLearningProgress ?? [];

  const [assignGoalMut] = useMutation(ASSIGN_GOAL_TO_DEPARTMENT);
  const [removeAssignmentMut] = useMutation(REMOVE_GOAL_ASSIGNMENT);

  const selectedGoal = useMemo(
    () => goals.find((g) => g.id === selectedGoalId),
    [goals, selectedGoalId],
  );

  const refetchQueries = useMemo(
    () => [
      { query: GOAL_ASSIGNMENTS, variables: { goalId: selectedGoalId } },
      { query: DEPARTMENT_LEARNING_PROGRESS, variables: { deptId: selectedDeptId } },
    ],
    [selectedGoalId, selectedDeptId],
  );

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await assignGoalMut({
        variables: { goalId: assignForm.goalId, departmentId: assignForm.departmentId },
        refetchQueries,
      });
      toast.success("Goal assigned to department");
      setShowAssignModal(false);
      setAssignForm({ goalId: "", departmentId: "" });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to assign"));
    }
  };

  const handleRemove = async (a: GoalAssignmentItem) => {
    if (
      !confirm(
        `Remove "${a.goal?.title ?? "goal"}" from ${a.department?.name ?? "department"}? Employee progress will be deleted.`,
      )
    )
      return;
    try {
      await removeAssignmentMut({ variables: { assignmentId: a.id }, refetchQueries });
      toast.success("Assignment removed");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to remove"));
    }
  };

  const statusVariant: Record<string, "green" | "yellow" | "gray"> = {
    completed: "green",
    in_progress: "yellow",
    not_started: "gray",
  };

  if (!isAdmin) {
    return (
      <div>
        <Header title="Learning Assignments" subtitle="Admin only" />
        <div className="card p-8 text-center text-muted-foreground">
          You do not have access to this page.
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Department Assignments"
        subtitle="Assign learning goals to departments and monitor progress"
        action={
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={() => router.push(`/${tenant}/learning`)}
            >
              <ArrowLeft size={16} /> Library
            </button>
            <Can module="learning-assignments" action="create">
              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => {
                  setAssignForm({
                    goalId: selectedGoalId || "",
                    departmentId: selectedDeptId || "",
                  });
                  setShowAssignModal(true);
                }}
                disabled={goals.length === 0 || departments.length === 0}
              >
                <Plus size={16} /> Assign Goal
              </button>
            </Can>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assignments per goal */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Goal → Departments</h3>
            <div className="max-w-[220px]">
              <SearchableSelect
                value={selectedGoalId}
                onChange={setSelectedGoalId}
                options={goals.map((g) => ({ value: g.id, label: g.title }))}
                placeholder="Select goal"
              />
            </div>
          </div>
          {goalsLoading || assignLoading ? (
            <LoadingSpinner />
          ) : !selectedGoal ? (
            <div className="text-muted-foreground text-sm">No goals available.</div>
          ) : assignments.length === 0 ? (
            <div className="text-sm text-muted-foreground/70 italic">
              This goal is not yet assigned to any department.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {assignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{a.department?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground/70">
                      Assigned {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <Can module="learning-assignments" action="delete">
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleRemove(a)}
                      title="Remove assignment"
                    >
                      <Trash2 size={15} />
                    </button>
                  </Can>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Progress per department */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Department Progress</h3>
            <div className="max-w-[220px]">
              <SearchableSelect
                value={selectedDeptId}
                onChange={setSelectedDeptId}
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                placeholder="Select department"
              />
            </div>
          </div>
          {progressLoading ? (
            <LoadingSpinner />
          ) : progress.length === 0 ? (
            <div className="text-sm text-muted-foreground/70 italic">
              No progress data for this department.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="table-th">Employee ID</th>
                    <th className="table-th">Goal</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Progress</th>
                    <th className="table-th">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {progress.map((p) => {
                    const { completed, total, pct } = progressStats(p);
                    return (
                      <tr key={p.id} className="hover:bg-muted/40">
                        <td className="table-td text-xs font-mono">{p.employeeId}</td>
                        <td className="table-td text-sm">{p.goal?.title ?? "—"}</td>
                        <td className="table-td">
                          <Badge
                            label={p.status.replace("_", " ")}
                            variant={statusVariant[p.status] ?? "gray"}
                          />
                        </td>
                        <td className="table-td text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground/70">
                              {completed}/{total} ({pct}%)
                            </span>
                          </div>
                        </td>
                        <td className="table-td text-xs text-muted-foreground/70">
                          {p.completedAt ? new Date(p.completedAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        title="Assign Goal to Department"
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
      >
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Learning Goal
            </label>
            <SearchableSelect
              value={assignForm.goalId}
              onChange={(v) => setAssignForm({ ...assignForm, goalId: v })}
              required
              options={goals.map((g) => ({ value: g.id, label: g.title }))}
              placeholder="Select a goal…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Department</label>
            <SearchableSelect
              value={assignForm.departmentId}
              onChange={(v) => setAssignForm({ ...assignForm, departmentId: v })}
              required
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              placeholder="Select a department…"
            />
          </div>
          <p className="text-xs text-muted-foreground/70">
            Progress rows are created for every employee currently in the selected department.
          </p>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              Assign
            </button>
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => setShowAssignModal(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
