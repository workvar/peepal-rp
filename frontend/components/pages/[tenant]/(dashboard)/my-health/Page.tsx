"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, ClipboardPlus, FlaskConical, Share2 } from "lucide-react";
import {
  MY_PATIENT_SUMMARY, MY_PATIENT_VISITS,
  MY_PATIENT_LAB_ORDERS, MY_PATIENT_RADIOLOGY, MY_PATIENT_REFERRALS, MY_PATIENT_TELECONSULTS,
} from "@/graphql/queries/portal";
import AppointmentsTab from "./AppointmentsTab";

type Tab = "appointments" | "visits" | "labs" | "imaging" | "referrals" | "tele";

export default function MyHealthPage() {
  const { data, loading } = useQuery(MY_PATIENT_SUMMARY);
  const [tab, setTab] = useState<Tab>("appointments");

  const profile = data?.myPatientProfile;
  const s = data?.myPatientSummary;

  if (loading) return <div><Header title="My Health" subtitle="Your care at a glance" /><LoadingSpinner /></div>;
  if (!profile) return (
    <div><Header title="My Health" subtitle="Your care at a glance" />
      <div className="card text-center py-12 text-muted-foreground/70">No patient profile is linked to your account.</div>
    </div>
  );

  const stat = (icon: React.ReactNode, label: string, value: number) => (
    <div className="card flex items-center gap-3">
      <div className="text-primary">{icon}</div>
      <div><div className="text-2xl font-semibold">{value}</div><div className="text-xs text-muted-foreground/70">{label}</div></div>
    </div>
  );

  const tabBtn = (t: Tab, label: string) => (
    <button onClick={() => setTab(t)} className={`px-3 py-2 text-sm font-medium rounded-lg ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
  );

  return (
    <div>
      <Header title={`Hello, ${profile.firstName}`} subtitle={`MRN ${profile.mrn}${profile.bloodGroup ? ` · ${profile.bloodGroup}` : ""}`} />

      {(profile.allergies || profile.chronicConditions) && (
        <div className="card mb-4 border-amber-300/50 bg-amber-500/5">
          {profile.allergies && <div className="text-sm"><span className="font-medium">Allergies:</span> {profile.allergies}</div>}
          {profile.chronicConditions && <div className="text-sm"><span className="font-medium">Conditions:</span> {profile.chronicConditions}</div>}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {stat(<CalendarCheck size={22} />, "Upcoming appts", s?.upcomingAppointments ?? 0)}
        {stat(<ClipboardPlus size={22} />, "Visits", s?.visits ?? 0)}
        {stat(<FlaskConical size={22} />, "Lab orders", s?.labOrders ?? 0)}
        {stat(<Share2 size={22} />, "Active referrals", s?.activeReferrals ?? 0)}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabBtn("appointments", "Appointments")}{tabBtn("visits", "Visits")}{tabBtn("labs", "Lab Results")}
        {tabBtn("imaging", "Imaging")}{tabBtn("referrals", "Referrals")}{tabBtn("tele", "Tele-consults")}
      </div>

      {tab === "appointments" && <AppointmentsTab />}
      {tab === "visits" && <Visits />}
      {tab === "labs" && <Labs />}
      {tab === "imaging" && <Imaging />}
      {tab === "referrals" && <Referrals />}
      {tab === "tele" && <Tele />}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="card text-center py-10 text-muted-foreground/70">{text}</div>;
}

function Visits() {
  const { data, loading } = useQuery(MY_PATIENT_VISITS);
  if (loading) return <LoadingSpinner />;
  const rows = data?.myPatientVisits ?? [];
  if (rows.length === 0) return <Empty text="No visits." />;
  return (
    <div className="space-y-2">
      {rows.map((v: { id: string; visitDate: string; visitType: string; clinicianName?: string | null; diagnosis?: string | null; prescription?: string | null }) => (
        <div key={v.id} className="card">
          <div className="font-medium capitalize">{v.visitDate} · {v.visitType}</div>
          <div className="text-xs text-muted-foreground/70">{v.clinicianName}</div>
          {v.diagnosis && <div className="text-sm mt-1"><span className="font-medium">Diagnosis:</span> {v.diagnosis}</div>}
          {v.prescription && <div className="text-sm text-muted-foreground">{v.prescription}</div>}
        </div>
      ))}
    </div>
  );
}

function Labs() {
  const { data, loading } = useQuery(MY_PATIENT_LAB_ORDERS);
  if (loading) return <LoadingSpinner />;
  const rows = data?.myPatientLabOrders ?? [];
  if (rows.length === 0) return <Empty text="No lab results." />;
  return (
    <div className="space-y-3">
      {rows.map((o: { id: string; orderDate: string; status: string; items: { id: string; testName: string; resultValue?: string | null; unit?: string | null; flag?: string | null; refText?: string | null }[] }) => (
        <div key={o.id} className="card">
          <div className="flex items-center justify-between"><span className="text-sm font-medium">{o.orderDate}</span><Badge label={o.status} variant={o.status === "resulted" ? "green" : "yellow"} className="capitalize" /></div>
          <div className="mt-2 flex flex-wrap gap-2">
            {o.items.map((it) => (
              <span key={it.id} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2 py-1 text-xs">
                {it.testName}: {it.resultValue ? <span className="font-mono font-semibold">{it.resultValue}{it.unit ? ` ${it.unit}` : ""}</span> : <span className="text-muted-foreground/60">pending</span>}
                {it.flag && it.flag !== "normal" && <Badge label={it.flag} variant="red" className="capitalize" />}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Imaging() {
  const { data, loading } = useQuery(MY_PATIENT_RADIOLOGY);
  if (loading) return <LoadingSpinner />;
  const rows = data?.myPatientRadiologyOrders ?? [];
  if (rows.length === 0) return <Empty text="No imaging." />;
  return (
    <div className="space-y-2">
      {rows.map((o: { id: string; studyName: string; modality: string; orderDate: string; status: string; impression?: string | null }) => (
        <div key={o.id} className="card">
          <div className="flex items-center justify-between"><div className="font-medium">{o.studyName} <span className="text-xs uppercase text-muted-foreground/70">({o.modality})</span></div><Badge label={o.status} variant={o.status === "reported" ? "green" : "yellow"} className="capitalize" /></div>
          <div className="text-xs text-muted-foreground/70">{o.orderDate}</div>
          {o.impression && <div className="text-sm mt-1"><span className="font-medium">Impression:</span> {o.impression}</div>}
        </div>
      ))}
    </div>
  );
}

function Referrals() {
  const { data, loading } = useQuery(MY_PATIENT_REFERRALS);
  if (loading) return <LoadingSpinner />;
  const rows = data?.myPatientReferrals ?? [];
  if (rows.length === 0) return <Empty text="No referrals." />;
  return (
    <div className="space-y-2">
      {rows.map((r: { id: string; referredTo: string; specialty?: string | null; urgency: string; referralDate?: string | null; status: string }) => (
        <div key={r.id} className="card flex items-center justify-between">
          <div><div className="font-medium">→ {r.referredTo}{r.specialty ? ` · ${r.specialty}` : ""}</div><div className="text-xs text-muted-foreground/70">{r.referralDate} · {r.urgency}</div></div>
          <Badge label={r.status} variant={r.status === "completed" ? "green" : r.status === "declined" ? "gray" : "yellow"} className="capitalize" />
        </div>
      ))}
    </div>
  );
}

function Tele() {
  const { data, loading } = useQuery(MY_PATIENT_TELECONSULTS);
  if (loading) return <LoadingSpinner />;
  const rows = data?.myPatientTeleConsults ?? [];
  if (rows.length === 0) return <Empty text="No tele-consults." />;
  return (
    <div className="space-y-2">
      {rows.map((c: { id: string; clinicianName?: string | null; scheduledAt: string; meetingLink?: string | null; status: string }) => (
        <div key={c.id} className="card flex items-center justify-between">
          <div><div className="font-medium">{new Date(c.scheduledAt).toLocaleString()}</div><div className="text-xs text-muted-foreground/70">{c.clinicianName}</div>
            {c.meetingLink && c.status === "scheduled" && <a href={c.meetingLink} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Join link</a>}</div>
          <Badge label={c.status.replace("_", " ")} variant={c.status === "completed" ? "green" : c.status === "cancelled" ? "gray" : "blue"} className="capitalize" />
        </div>
      ))}
    </div>
  );
}
