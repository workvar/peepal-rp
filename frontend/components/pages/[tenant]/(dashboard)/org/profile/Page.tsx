"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchOrgProfile,
  updateOrgProfile,
  updateOrgIdentity,
  clearOrgError,
} from "@/store/slices/orgSlice";
import { fetchMe } from "@/store/slices/authSlice";
import PageHeader from "@/components/ui/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";

interface OrgProfileForm {
  name: string;
  tagline: string;
  primary_color: string;
  accent_color: string;
  accreditation: string;
  logo_url: string;
}

export default function OrgProfilePage() {
  const dispatch = useAppDispatch();
  const { profile, loading, error } = useAppSelector((s) => s.org);

  // Identity policy lives on the tenant and is surfaced via /auth/me, so read it
  // from the auth user. Saved separately from branding via updateOrgIdentity.
  const authUser = useAppSelector((s) => s.auth.user);
  const [staffEmail, setStaffEmail] = useState(true);
  const [studentEmail, setStudentEmail] = useState(true);
  const [savingIdentity, setSavingIdentity] = useState(false);

  useEffect(() => {
    if (authUser) {
      setStaffEmail(authUser.staff_email_required ?? true);
      setStudentEmail(authUser.student_email_required ?? true);
    }
  }, [authUser]);

  const saveIdentity = async () => {
    setSavingIdentity(true);
    try {
      const result = await dispatch(
        updateOrgIdentity({ staffEmailRequired: staffEmail, studentEmailRequired: studentEmail })
      );
      if (updateOrgIdentity.fulfilled.match(result)) {
        await dispatch(fetchMe()); // refresh the policy carried on the auth user
        toast.success("Login settings updated");
      } else {
        toast.error((result.payload as string) || "Failed to update login settings");
      }
    } finally {
      setSavingIdentity(false);
    }
  };
  const { register, handleSubmit, reset } = useForm<OrgProfileForm>({
    defaultValues: profile || {
      name: "",
      tagline: "",
      primary_color: "#000000",
      accent_color: "#000000",
      accreditation: "",
      logo_url: "",
    },
  });

  useEffect(() => {
    dispatch(fetchOrgProfile());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      reset(profile);
    }
  }, [profile, reset]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearOrgError());
    }
  }, [error, dispatch]);

  const onSubmit = async (data: OrgProfileForm) => {
    const result = await dispatch(updateOrgProfile(data));
    if (updateOrgProfile.fulfilled.match(result)) {
      toast.success("Organisation profile updated successfully!");
    }
  };

  if (loading && !profile) {
    return <LoadingSpinner text="Loading org profile..." />;
  }

  return (
    <div>
      <PageHeader title="Organisation Profile" subtitle="Manage your organization details" />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-6">
          {/* Logo Preview */}
          {profile?.logo_url && (
            <div className="mb-6">
              <p className="text-sm font-medium text-foreground/80 mb-2">Current Logo</p>
              <Image
                src={profile.logo_url}
                alt="Organization Logo"
                width={96}
                height={96}
                unoptimized
                className="h-24 w-24 object-contain rounded-lg border border-border p-2"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              {...register("name")}
              placeholder="Your College/Institution Name"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Tagline
            </label>
            <input
              type="text"
              {...register("tagline")}
              placeholder="Your organization's motto or tagline"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Logo URL
            </label>
            <input
              type="text"
              {...register("logo_url")}
              placeholder="https://example.com/logo.png"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Primary Color
              </label>
              <input
                type="color"
                {...register("primary_color")}
                className="h-10 w-full border border-gray-300 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Accent Color
              </label>
              <input
                type="color"
                {...register("accent_color")}
                className="h-10 w-full border border-gray-300 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Accreditation Info
            </label>
            <textarea
              {...register("accreditation")}
              placeholder="E.g., ISO 9001:2015 Certified, NAAC Accredited"
              rows={3}
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary py-2.5"
          >
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {/* Login & Identity — how each population signs in. */}
        <div className="card p-6 mt-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Login &amp; Identity</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Turn email off for groups that have no email — they sign in with their
              Employee ID / Roll Number instead. Admins always sign in with email.
            </p>
          </div>

          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-foreground/90">Staff &amp; teachers sign in with email</span>
            <input
              type="checkbox"
              checked={staffEmail}
              onChange={(e) => setStaffEmail(e.target.checked)}
              className="rounded border-border"
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-foreground/90">Students sign in with email</span>
            <input
              type="checkbox"
              checked={studentEmail}
              onChange={(e) => setStudentEmail(e.target.checked)}
              className="rounded border-border"
            />
          </label>

          <button
            type="button"
            onClick={saveIdentity}
            disabled={savingIdentity}
            className="btn-primary py-2.5"
          >
            {savingIdentity ? "Saving..." : "Save Login Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
