import { gql } from "@apollo/client";

// Single query that powers the super-admin live dashboard. Mirrors the
// platformAnalytics resolver (backend/graph/platform.resolvers.go).
export const PLATFORM_ANALYTICS = gql`
  query PlatformAnalytics {
    platformAnalytics {
      generatedAt
      tenants {
        total
        active
        suspended
        newThisMonth
        growth {
          month
          created
          cumulative
        }
        byType {
          type
          count
        }
      }
      people {
        students
        employees
        users
        topTenants {
          tenantId
          tenantName
          students
          employees
        }
      }
      subscriptions {
        active
        unsubscribed
        expiringSoon
        estimatedMrr
        byPlan {
          planId
          planName
          tenants
          priceMonthly
        }
        byStatus {
          status
          count
        }
      }
      quota {
        overQuota
        studentUsage
        studentLimit
        employeeUsage
        employeeLimit
        breaches {
          tenantId
          tenantName
          resource
          limit
          current
          overBy
        }
      }
    }
  }
`;
