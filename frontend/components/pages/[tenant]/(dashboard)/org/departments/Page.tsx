"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  clearOrgError,
} from "@/store/slices/orgSlice";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import toast from "react-hot-toast";
import { Plus, Edit2, Trash2 } from "lucide-react";
import BulkUploadButton from "@/components/ui/BulkUpload/BulkUploadButton";
import Can from "@/components/access/Can";
import { useForm } from "react-hook-form";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";

interface DepartmentForm {
  name: string;
  code?: string;
}

export default function DepartmentsPage() {
  const dispatch = useAppDispatch();
  const { departments, loading, error } = useAppSelector((s) => s.org);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const { register, handleSubmit, reset, watch } = useForm<DepartmentForm>();

  useEffect(() => {
    dispatch(fetchDepartments());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearOrgError());
    }
  }, [error, dispatch]);

  const onCreateSubmit = async (data: DepartmentForm) => {
    const result = await dispatch(
      createDepartment({
        name: data.name,
        code: data.code || "",
      })
    );

    if (createDepartment.fulfilled.match(result)) {
      toast.success("Department created successfully!");
      setIsCreateModalOpen(false);
      reset();
    }
  };

  const onEditSubmit = async (data: DepartmentForm) => {
    if (!editingDept) return;

    const result = await dispatch(
      updateDepartment({
        id: editingDept,
        input: {
          name: data.name,
          code: data.code || "",
        },
      })
    );

    if (updateDepartment.fulfilled.match(result)) {
      toast.success("Department updated successfully!");
      setIsEditModalOpen(false);
      setEditingDept(null);
      reset();
    }
  };

  const handleEdit = (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId);
    if (dept) {
      reset({ name: dept.name, code: dept.code });
      setEditingDept(deptId);
      setIsEditModalOpen(true);
    }
  };

  const handleDelete = async (deptId: string) => {
    setConfirmState({
      title: "Delete Department",
      message: "This department will be permanently removed. This cannot be undone.",
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        const result = await dispatch(deleteDepartment(deptId));
        if (deleteDepartment.fulfilled.match(result)) {
          toast.success("Department deleted successfully!");
        }
      },
    });
  };

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Manage organization departments"
        actions={
          <div className="flex gap-2">
            <BulkUploadButton
              resource="departments"
              onFinished={() => dispatch(fetchDepartments())}
            />
            <Can module="departments" action="create">
              <button
                onClick={() => {
                  reset();
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 btn-primary text-white rounded-lg transition-colors"
              >
                <Plus size={18} />
                Add Department
              </button>
            </Can>
          </div>
        }
      />

      <div className="mb-4">
        <input
          className="input-field w-full"
          placeholder="Search department name, code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Departments Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8">
            <LoadingSpinner text="Loading departments..." />
          </div>
        ) : departments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No departments found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-6 font-semibold text-foreground/80">Name</th>
                  <th className="text-left py-3 px-6 font-semibold text-foreground/80">Code</th>
                  <th className="text-left py-3 px-6 font-semibold text-foreground/80">Created</th>
                  <th className="text-center py-3 px-6 font-semibold text-foreground/80">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(search ? departments.filter(d => [d.name, d.code].some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()))) : departments).map((dept) => (
                  <tr key={dept.id} className="border-b border-border/60 hover:bg-muted/40">
                    <td className="py-4 px-6 text-foreground font-medium">{dept.name}</td>
                    <td className="py-4 px-6 text-muted-foreground text-sm">{dept.code || "-"}</td>
                    <td className="py-4 px-6 text-muted-foreground text-sm">
                      {new Date(dept.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-3 justify-center">
                        <Can module="departments" action="edit">
                          <button
                            onClick={() => handleEdit(dept.id)}
                            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={18} className="text-blue-600" />
                          </button>
                        </Can>
                        <Can module="departments" action="delete">
                          <button
                            onClick={() => handleDelete(dept.id)}
                            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        title="Add Department"
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          reset();
        }}
        size="sm"
      >
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Department Name
            </label>
            <input
              type="text"
              {...register("name", { required: true })}
              placeholder="E.g., Computer Science"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Department Code (Optional)
            </label>
            <input
              type="text"
              {...register("code")}
              placeholder="E.g., CS"
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5"
          >
            {loading ? "Creating..." : "Add Department"}
          </button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Department"
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingDept(null);
          reset();
        }}
        size="sm"
      >
        <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Department Name
            </label>
            <input
              type="text"
              {...register("name", { required: true })}
              placeholder="E.g., Computer Science"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Department Code (Optional)
            </label>
            <input
              type="text"
              {...register("code")}
              placeholder="E.g., CS"
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5"
          >
            {loading ? "Updating..." : "Update Department"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
