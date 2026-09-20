package graph

// Cascade delete for clinical records, mirroring cascade_delete.go: removing a
// patient must leave no dangling appointments or encounters behind.

import (
	"collegeerp/models"

	"gorm.io/gorm"
)

// deletePatientCascade removes a patient and every clinical record that
// references them. Runs inside the caller's transaction.
func deletePatientCascade(tx *gorm.DB, tenantID string, patientID string) error {
	if err := tx.Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Delete(&models.Encounter{}).Error; err != nil {
		return err
	}
	if err := tx.Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Delete(&models.Appointment{}).Error; err != nil {
		return err
	}

	// Billing: payments + items per invoice, then the invoices.
	var invoiceIDs []string
	if err := tx.Model(&models.Invoice{}).
		Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Pluck("id", &invoiceIDs).Error; err != nil {
		return err
	}
	if len(invoiceIDs) > 0 {
		if err := tx.Where("invoice_id IN ? AND tenant_id = ?", invoiceIDs, tenantID).
			Delete(&models.InvoicePayment{}).Error; err != nil {
			return err
		}
		if err := tx.Where("invoice_id IN ? AND tenant_id = ?", invoiceIDs, tenantID).
			Delete(&models.InvoiceItem{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id IN ? AND tenant_id = ?", invoiceIDs, tenantID).
			Delete(&models.Invoice{}).Error; err != nil {
			return err
		}
	}

	// Pharmacy: dispense items per dispense, then the dispenses. Stock is NOT
	// restored — the drugs physically left the pharmacy.
	var dispenseIDs []string
	if err := tx.Model(&models.Dispense{}).
		Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Pluck("id", &dispenseIDs).Error; err != nil {
		return err
	}
	if len(dispenseIDs) > 0 {
		if err := tx.Where("dispense_id IN ? AND tenant_id = ?", dispenseIDs, tenantID).
			Delete(&models.DispenseItem{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id IN ? AND tenant_id = ?", dispenseIDs, tenantID).
			Delete(&models.Dispense{}).Error; err != nil {
			return err
		}
	}

	// Laboratory: order items per order, then the orders.
	var labOrderIDs []string
	if err := tx.Model(&models.LabOrder{}).
		Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Pluck("id", &labOrderIDs).Error; err != nil {
		return err
	}
	if len(labOrderIDs) > 0 {
		if err := tx.Where("order_id IN ? AND tenant_id = ?", labOrderIDs, tenantID).
			Delete(&models.LabOrderItem{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id IN ? AND tenant_id = ?", labOrderIDs, tenantID).
			Delete(&models.LabOrder{}).Error; err != nil {
			return err
		}
	}

	// Radiology: orders.
	if err := tx.Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Delete(&models.RadiologyOrder{}).Error; err != nil {
		return err
	}

	// IPD: free any occupied beds, drop transfers, then the admissions.
	var admissionIDs []string
	if err := tx.Model(&models.Admission{}).
		Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Pluck("id", &admissionIDs).Error; err != nil {
		return err
	}
	if len(admissionIDs) > 0 {
		var occupiedBedIDs []string
		if err := tx.Model(&models.Admission{}).
			Where("id IN ? AND status = ? AND bed_id <> ''", admissionIDs, models.AdmissionAdmitted).
			Pluck("bed_id", &occupiedBedIDs).Error; err != nil {
			return err
		}
		if len(occupiedBedIDs) > 0 {
			if err := tx.Model(&models.Bed{}).
				Where("id IN ? AND tenant_id = ?", occupiedBedIDs, tenantID).
				Update("status", models.BedAvailable).Error; err != nil {
				return err
			}
		}
		if err := tx.Where("admission_id IN ? AND tenant_id = ?", admissionIDs, tenantID).
			Delete(&models.BedTransfer{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id IN ? AND tenant_id = ?", admissionIDs, tenantID).
			Delete(&models.Admission{}).Error; err != nil {
			return err
		}
	}

	// Nursing: medication administrations per order, then orders + vitals.
	var medOrderIDs []string
	if err := tx.Model(&models.MedicationOrder{}).
		Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Pluck("id", &medOrderIDs).Error; err != nil {
		return err
	}
	if len(medOrderIDs) > 0 {
		if err := tx.Where("medication_order_id IN ? AND tenant_id = ?", medOrderIDs, tenantID).
			Delete(&models.MedicationAdministration{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id IN ? AND tenant_id = ?", medOrderIDs, tenantID).
			Delete(&models.MedicationOrder{}).Error; err != nil {
			return err
		}
	}
	if err := tx.Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Delete(&models.VitalsRecord{}).Error; err != nil {
		return err
	}

	// Claims, surgeries, triage — all keyed by patient.
	if err := tx.Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Delete(&models.InsuranceClaim{}).Error; err != nil {
		return err
	}
	if err := tx.Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Delete(&models.SurgerySchedule{}).Error; err != nil {
		return err
	}
	if err := tx.Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Delete(&models.TriageCase{}).Error; err != nil {
		return err
	}

	// Phase 5 per-patient records: blood requests, ambulance trips (unlink),
	// telemedicine, referrals. Issued blood units keep their record but unlink.
	if err := tx.Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Delete(&models.BloodRequest{}).Error; err != nil {
		return err
	}
	if err := tx.Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Delete(&models.TeleConsult{}).Error; err != nil {
		return err
	}
	if err := tx.Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Delete(&models.Referral{}).Error; err != nil {
		return err
	}
	if err := tx.Model(&models.AmbulanceTrip{}).
		Where("patient_id = ? AND tenant_id = ?", patientID, tenantID).
		Update("patient_id", "").Error; err != nil {
		return err
	}
	if err := tx.Model(&models.BloodUnit{}).
		Where("issued_to_id = ? AND tenant_id = ?", patientID, tenantID).
		Update("issued_to_id", "").Error; err != nil {
		return err
	}

	// Remove the patient's linked login account, if any.
	var patient models.Patient
	if err := tx.Select("user_id").Where("id = ?", patientID).First(&patient).Error; err == nil && patient.UserID != "" {
		if err := tx.Where("id = ? AND tenant_id = ?", patient.UserID, tenantID).Delete(&models.User{}).Error; err != nil {
			return err
		}
	}

	return tx.Where("id = ? AND tenant_id = ?", patientID, tenantID).
		Delete(&models.Patient{}).Error
}
