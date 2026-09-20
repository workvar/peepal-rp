'use client'

import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { MARKS_REPORT } from '@/graphql/queries/reports'
import QueryError from '@/components/ui/QueryError'
import type { GqlGradeRow, GqlSubjectAvgRow } from '@/types/pages/reports/page'

const GRADE_COLORS: Record<string, string> = {
  O: 'bg-green-500',
  'A+': 'bg-green-400',
  A: 'bg-blue-500',
  'B+': 'bg-blue-400',
  B: 'bg-yellow-400',
  C: 'bg-orange-400',
  F: 'bg-red-500',
}

export default function MarksReportPage() {
  const [courseId, setCourseId] = useState('')
  const [semesterNumber, setSemesterNumber] = useState('')
  const [assessmentType, setAssessmentType] = useState('')

  const { data, loading, error, refetch } = useQuery(MARKS_REPORT, {
    variables: {
      ...(courseId ? { courseId } : {}),
      ...(semesterNumber ? { semesterNumber } : {}),
      ...(assessmentType ? { assessmentType } : {}),
    },
  })

  const grades: GqlGradeRow[] = data?.marksReport?.gradeDistribution ?? []
  const subjects: GqlSubjectAvgRow[] = data?.marksReport?.subjectAverages ?? []
  const totalStudents = grades.reduce((s, r) => s + r.count, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marks &amp; Grade Report</h1>
        <p className="text-sm text-muted-foreground mt-1">Grade distribution and subject-wise performance</p>
      </div>

      {error && <QueryError message={error.message} onRetry={() => void refetch()} />}

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Assessment Type</label>
          <select value={assessmentType} onChange={e => setAssessmentType(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All</option>
            <option value="midterm">Midterm</option>
            <option value="final">Final</option>
            <option value="assignment">Assignment</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Semester</label>
          <select value={semesterNumber} onChange={e => setSemesterNumber(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All</option>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={String(s)}>Sem {s}</option>)}
          </select>
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Grade Distribution</h3>
        {grades.length === 0 ? (
          <p className="text-muted-foreground/70 text-sm">No marks data available</p>
        ) : (
          <div className="space-y-3">
            {grades.map((row) => {
              const pct = totalStudents > 0 ? Math.round((row.count / totalStudents) * 100) : 0
              return (
                <div key={row.grade} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-bold text-center">{row.grade}</span>
                  <div className="flex-1 bg-muted/60 rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${GRADE_COLORS[row.grade] || 'bg-gray-400'} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-20 text-right">{row.count} ({pct}%)</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Subject Averages */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60">
          <h3 className="font-semibold text-foreground text-sm">Subject-wise Performance</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground/70">Loading...</div>
        ) : subjects.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground/70">No subject data available</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subject</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Avg Marks</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Pass</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Fail</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Pass %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {subjects.map((row) => {
                const passPct = row.totalCount > 0 ? Math.round((row.passCount / row.totalCount) * 100) : 0
                return (
                  <tr key={row.subjectId} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5 font-medium text-foreground">{row.subjectName || '(No subject)'}</td>
                    <td className="px-4 py-2.5 text-center">{row.avgMarks.toFixed(1)} / {row.maxMarks}</td>
                    <td className="px-4 py-2.5 text-center text-green-600">{row.passCount}</td>
                    <td className="px-4 py-2.5 text-center text-red-500">{row.failCount}</td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">{row.totalCount}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`font-semibold ${passPct >= 75 ? 'text-green-600' : passPct >= 50 ? 'text-orange-500' : 'text-red-600'}`}>{passPct}%</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
