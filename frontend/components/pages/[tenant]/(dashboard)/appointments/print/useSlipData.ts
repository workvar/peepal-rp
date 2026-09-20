"use client";

// Gathers everything one printed slip needs: the booking, the patient record
// behind it, and the tenant's branding.

import { useQuery } from "@apollo/client";
import { GET_APPOINTMENT_FOR_SLIP } from "@/graphql/queries/opd-slip";
import { GET_PATIENT } from "@/graphql/queries/clinical";
import { GET_ORG_PROFILE } from "@/graphql/queries/org";
import type { SlipData } from "@/components/opd-slip/types";

export function useSlipData(appointmentId: string) {
  const { data: apptData, loading: apptLoading } = useQuery(GET_APPOINTMENT_FOR_SLIP, {
    variables: { id: appointmentId },
    skip: !appointmentId,
  });
  const appointment = apptData?.appointment ?? null;

  const { data: patientData, loading: patientLoading } = useQuery(GET_PATIENT, {
    variables: { id: appointment?.patientId },
    skip: !appointment?.patientId,
  });
  const { data: orgData } = useQuery(GET_ORG_PROFILE);

  const data: SlipData | null = appointment
    ? {
        appointment,
        patient: patientData?.patient ?? null,
        org: orgData?.orgProfile ?? null,
      }
    : null;

  return { data, loading: apptLoading || patientLoading };
}
