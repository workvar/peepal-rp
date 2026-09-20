"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAcademicYears,
  fetchSemesters,
  createAcademicYear,
  createSemester,
  setCurrentAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  deleteSemester,
  clearOrgError,
} from "@/store/slices/orgSlice";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import toast from "react-hot-toast";
import { Plus, Star, ChevronDown, ChevronUp, Edit, Trash2 } from "lucide-react";
import BulkUploadButton from "@/components/ui/BulkUpload/BulkUploadButton";
import Can from "@/components/access/Can";
import { useForm } from "react-hook-form";

interface AcademicYearForm {
  name: string;
  start_date: string;
  end_date: string;
  is_current?: boolean;
}

interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface SemesterForm {
  number: number;
  name: string;
  start_date: string;
  end_date: string;
  academic_year_id: string;
}

export default function AcademicYearsPage() {
  const dispatch = useAppDispatch();
  const { academicYears, semesters, loading, error } = useAppSelector((s) => s.org);
  const [isCreateAYModalOpen, setIsCreateAYModalOpen] = useState(false);
  const [isCreateSemModalOpen, setIsCreateSemModalOpen] = useState(false);
  const [expandedAY, setExpandedAY] = useState<string | null>(null);
  const [selectedAYForSem, setSelectedAYForSem] = useState<string>("");
  const [editingAY, setEditingAY] = useState<AcademicYear | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const ayForm = useForm<AcademicYearForm>();
  const semForm = useForm<SemesterForm>();

  useEffect(() => {
    dispatch(fetchAcademicYears());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchSemesters());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearOrgError());
    }
  }, [error, dispatch]);

  const onCreateAYSubmit = async (data: AcademicYearForm) => {
    if (editingAY) {
      const result = await dispatch(
        updateAcademicYear({
          id: editingAY.id,
          input: {
            name: data.name,
            start_date: data.start_date,
            end_date: data.end_date,
            is_current: data.is_current || false,
          },
        })
      );

      if (updateAcademicYear.fulfilled.match(result)) {
        toast.success("Academic Year updated successfully!");
        setIsCreateAYModalOpen(false);
        setEditingAY(null);
        ayForm.reset();
      }
    } else {
      const result = await dispatch(
        createAcademicYear({
          name: data.name,
          start_date: data.start_date,
          end_date: data.end_date,
          is_current: data.is_current || false,
        })
      );

      if (createAcademicYear.fulfilled.match(result)) {
        toast.success("Academic Year created successfully!");
        setIsCreateAYModalOpen(false);
        ayForm.reset();
      }
    }
  };

  const openEditAY = (ay: AcademicYear) => {
    setEditingAY(ay);
    ayForm.reset({
      name: ay.name,
      start_date: ay.start_date,
      end_date: ay.end_date,
      is_current: ay.is_current,
    });
    setIsCreateAYModalOpen(true);
  };

  const onCreateSemSubmit = async (data: SemesterForm) => {
    const result = await dispatch(
      createSemester({
        academic_year_id: data.academic_year_id,
        number: data.number,
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
      })
    );

    if (createSemester.fulfilled.match(result)) {
      toast.success("Semester created successfully!");
      setIsCreateSemModalOpen(false);
      semForm.reset();
    }
  };

  const handleSetCurrent = async (id: string) => {
    const result = await dispatch(setCurrentAcademicYear(id));
    if (setCurrentAcademicYear.fulfilled.match(result)) {
      toast.success("Academic year set as current!");
    }
  };

  const handleAddSemester = (ayId: string) => {
    setSelectedAYForSem(ayId);
    semForm.reset({ academic_year_id: ayId });
    setIsCreateSemModalOpen(true);
  };

  const handleDeleteSemester = (semId: string, semName: string) => {
    setConfirmState({
      title: "Delete Semester",
      message: `"${semName}" will be permanently removed. This cannot be undone.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        const result = await dispatch(deleteSemester(semId));
        if (deleteSemester.fulfilled.match(result)) {
          toast.success("Semester deleted");
        }
      },
    });
  };

  const handleDeleteAcademicYear = (ay: AcademicYear) => {
    const semCount = semestersForAY(ay.id).length;
    const semNote = semCount > 0
      ? ` This will also delete ${semCount} semester${semCount === 1 ? "" : "s"} inside it.`
      : "";
    setConfirmState({
      title: "Delete Academic Year",
      message: `"${ay.name}" will be permanently removed.${semNote} This cannot be undone.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        const result = await dispatch(deleteAcademicYear(ay.id));
        if (deleteAcademicYear.fulfilled.match(result)) {
          toast.success("Academic year deleted");
        }
      },
    });
  };

  const semestersForAY = (ayId: string) =>
    semesters.filter((s) => s.academic_year_id === ayId).sort((a, b) => a.number - b.number);

  return (
    <div>
      <PageHeader
        title="Academic Years"
        subtitle="Manage academic years and semesters"
        actions={
          <div className="flex gap-2">
            <BulkUploadButton
              resource="academic_years"
              onFinished={() => {
                dispatch(fetchAcademicYears());
                dispatch(fetchSemesters());
              }}
            />
            <Can module="academic-years" action="create">
              <button
                onClick={() => {
                  setEditingAY(null);
                  ayForm.reset();
                  setIsCreateAYModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 btn-primary text-white rounded-lg transition-colors"
              >
                <Plus size={18} />
                Add Year
              </button>
            </Can>
          </div>
        }
      />

      {/* Academic Years List */}
      <div className="space-y-4">
        {loading && !academicYears.length ? (
          <LoadingSpinner text="Loading academic years..." />
        ) : academicYears.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No academic years found</p>
        ) : (
          academicYears.map((ay) => (
            <div
              key={ay.id}
              className="card overflow-hidden"
            >
              {/* Year Header */}
              <div
                className="p-6 flex items-center justify-between cursor-pointer hover:bg-muted/40"
                onClick={() =>
                  setExpandedAY(expandedAY === ay.id ? null : ay.id)
                }
              >
                <div className="flex items-center gap-4 flex-1">
                  <div>
                    {expandedAY === ay.id ? (
                      <ChevronUp size={20} className="text-muted-foreground/70" />
                    ) : (
                      <ChevronDown size={20} className="text-muted-foreground/70" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{ay.name}</h3>
                      {ay.is_current && (
                        <Star size={16} className="text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(ay.start_date).toLocaleDateString()} -{" "}
                      {new Date(ay.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Can module="academic-years" action="edit">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditAY(ay);
                      }}
                      className="px-3 py-1.5 text-sm bg-muted/60 text-foreground/80 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                  </Can>
                  {!ay.is_current && (
                    <Can module="academic-years" action="edit">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetCurrent(ay.id);
                        }}
                        className="px-3 py-1.5 text-sm bg-muted/60 text-foreground/80 rounded hover:bg-gray-200 transition-colors"
                      >
                        Set Current
                      </button>
                    </Can>
                  )}
                  <Can module="academic-years" action="create">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSemester(ay.id);
                      }}
                      className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Semester
                    </button>
                  </Can>
                  <Can module="academic-years" action="delete">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAcademicYear(ay);
                      }}
                      className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors flex items-center gap-1"
                      title="Delete academic year"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Can>
                </div>
              </div>

              {/* Semesters */}
              {expandedAY === ay.id && (
                <div className="border-t border-border bg-muted/40 p-6">
                  <div className="space-y-3">
                    {semestersForAY(ay.id).length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No semesters added yet</p>
                    ) : (
                      semestersForAY(ay.id).map((sem) => (
                        <div
                          key={sem.id}
                          className="bg-card p-4 rounded-lg border border-border flex justify-between items-start"
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              Semester {sem.number}: {sem.name}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(sem.start_date).toLocaleDateString()} -{" "}
                              {new Date(sem.end_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Can module="academic-years" action="delete">
                            <button
                              onClick={() => handleDeleteSemester(sem.id, sem.name)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Delete semester"
                            >
                              <Trash2 size={15} />
                            </button>
                          </Can>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Academic Year Modal */}
      <Modal
        title={editingAY ? "Edit Academic Year" : "Add Academic Year"}
        isOpen={isCreateAYModalOpen}
        onClose={() => {
          setIsCreateAYModalOpen(false);
          setEditingAY(null);
          ayForm.reset();
        }}
        size="sm"
      >
        <form onSubmit={ayForm.handleSubmit(onCreateAYSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Year Name
            </label>
            <input
              type="text"
              {...ayForm.register("name", { required: true })}
              placeholder="E.g., 2024-2025"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Start Date
            </label>
            <input
              type="date"
              {...ayForm.register("start_date", { required: true })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              End Date
            </label>
            <input
              type="date"
              {...ayForm.register("end_date", { required: true })}
              className="input-field"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...ayForm.register("is_current")}
              className="w-4 h-4"
            />
            <label className="text-sm text-foreground/80">Set as current year</label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5"
          >
            {loading ? (editingAY ? "Saving..." : "Creating...") : (editingAY ? "Save Year" : "Create Year")}
          </button>
        </form>
      </Modal>

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />

      {/* Create Semester Modal */}
      <Modal
        title="Add Semester"
        isOpen={isCreateSemModalOpen}
        onClose={() => {
          setIsCreateSemModalOpen(false);
          setSelectedAYForSem("");
          semForm.reset();
        }}
        size="sm"
      >
        <form onSubmit={semForm.handleSubmit(onCreateSemSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Semester Number
            </label>
            <input
              type="number"
              {...semForm.register("number", { required: true, valueAsNumber: true })}
              placeholder="1"
              min="1"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Semester Name
            </label>
            <input
              type="text"
              {...semForm.register("name", { required: true })}
              placeholder="E.g., Odd Semester"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Start Date
            </label>
            <input
              type="date"
              {...semForm.register("start_date", { required: true })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              End Date
            </label>
            <input
              type="date"
              {...semForm.register("end_date", { required: true })}
              className="input-field"
            />
          </div>

          <input type="hidden" {...semForm.register("academic_year_id")} />

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5"
          >
            {loading ? "Creating..." : "Create Semester"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
