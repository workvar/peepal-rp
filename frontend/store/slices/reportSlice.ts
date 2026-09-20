import { createSlice, createAsyncThunk, type SerializedError } from '@reduxjs/toolkit'
import { reportsAPI } from '@/lib/api'
import type {
  DashboardStats, AttendanceReport, MarksReport,
  LeaveReport, FeeReport, PayrollReport
} from '@/types'

interface ReportState {
  dashboardStats: DashboardStats | null
  attendanceReport: AttendanceReport | null
  marksReport: MarksReport | null
  leaveReport: LeaveReport | null
  feeReport: FeeReport | null
  payrollReport: PayrollReport | null
  loading: boolean
  error: string | null
}

const initialState: ReportState = {
  dashboardStats: null,
  attendanceReport: null,
  marksReport: null,
  leaveReport: null,
  feeReport: null,
  payrollReport: null,
  loading: false,
  error: null,
}

export const fetchDashboardStats = createAsyncThunk(
  'report/dashboard',
  async () => {
    const res = await reportsAPI.dashboard()
    return res.data.data as DashboardStats
  }
)

export const fetchAttendanceReport = createAsyncThunk(
  'report/attendance',
  async (params: { from_date?: string; to_date?: string; entity_type?: string; subject_id?: string } | undefined) => {
    const res = await reportsAPI.attendance(params)
    return res.data.data as AttendanceReport
  }
)

export const fetchMarksReport = createAsyncThunk(
  'report/marks',
  async (params: { course_id?: string; semester_number?: string; academic_year_id?: string; assessment_type?: string } | undefined) => {
    const res = await reportsAPI.marks(params)
    return res.data.data as MarksReport
  }
)

export const fetchLeaveReport = createAsyncThunk(
  'report/leaves',
  async (params: { year?: string; department?: string } | undefined) => {
    const res = await reportsAPI.leaves(params)
    return res.data.data as LeaveReport
  }
)

export const fetchFeeReport = createAsyncThunk(
  'report/fees',
  async (params: { academic_year_id?: string } | undefined) => {
    const res = await reportsAPI.fees(params)
    return res.data.data as FeeReport
  }
)

export const fetchPayrollReport = createAsyncThunk(
  'report/payroll',
  async (params: { year?: string } | undefined) => {
    const res = await reportsAPI.payroll(params)
    return res.data.data as PayrollReport
  }
)

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    const setLoading = (state: ReportState) => { state.loading = true; state.error = null }
    const setError = (state: ReportState, action: { error: SerializedError }) => { state.loading = false; state.error = action.error.message || 'Error' }

    builder
      .addCase(fetchDashboardStats.pending, setLoading)
      .addCase(fetchDashboardStats.fulfilled, (state, action) => { state.loading = false; state.dashboardStats = action.payload })
      .addCase(fetchDashboardStats.rejected, setError)

      .addCase(fetchAttendanceReport.pending, setLoading)
      .addCase(fetchAttendanceReport.fulfilled, (state, action) => { state.loading = false; state.attendanceReport = action.payload })
      .addCase(fetchAttendanceReport.rejected, setError)

      .addCase(fetchMarksReport.pending, setLoading)
      .addCase(fetchMarksReport.fulfilled, (state, action) => { state.loading = false; state.marksReport = action.payload })
      .addCase(fetchMarksReport.rejected, setError)

      .addCase(fetchLeaveReport.pending, setLoading)
      .addCase(fetchLeaveReport.fulfilled, (state, action) => { state.loading = false; state.leaveReport = action.payload })
      .addCase(fetchLeaveReport.rejected, setError)

      .addCase(fetchFeeReport.pending, setLoading)
      .addCase(fetchFeeReport.fulfilled, (state, action) => { state.loading = false; state.feeReport = action.payload })
      .addCase(fetchFeeReport.rejected, setError)

      .addCase(fetchPayrollReport.pending, setLoading)
      .addCase(fetchPayrollReport.fulfilled, (state, action) => { state.loading = false; state.payrollReport = action.payload })
      .addCase(fetchPayrollReport.rejected, setError)
  },
})

export default reportSlice.reducer
