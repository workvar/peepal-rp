// A fake booking used only to render the configurator's live preview, so the
// admin can judge the layout without opening a real patient record.

import type { SlipData } from "@/components/opd-slip/types";

export function sampleSlipData(orgName: string, logoUrl: string): SlipData {
  const today = new Date().toISOString().slice(0, 10);
  return {
    appointment: {
      id: "0a1b2c3d-4e5f-6789-abcd-ef0123456789",
      patientId: "sample",
      patientName: "Vishal Gupta",
      patientMrn: "SKDD.894248",
      clinicianName: "Dr. Nitin Leekha",
      departmentName: "Surgical Oncology",
      date: today,
      startTime: "10:30",
      endTime: "10:45",
      reason: "Follow up",
      referredBy: "SELF",
      status: "scheduled",
    },
    patient: {
      id: "sample",
      mrn: "SKDD.894248",
      uhid: "UH-000123",
      firstName: "Vishal",
      lastName: "Gupta",
      gender: "Male",
      dateOfBirth: "1986-11-04",
      bloodGroup: "B+",
      phone: "+91 99999 00000",
      address: "Indraprastha Extension",
      city: "New Delhi",
      allergies: "",
      chronicConditions: "",
    },
    org: { name: orgName, logoUrl, tagline: "", accreditation: "" },
  };
}
