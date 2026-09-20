"use client";

import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "@/lib/apollo";

// DashboardProviders wraps only the authenticated tenant dashboard so the
// Apollo runtime + GraphQL client (~60 KB gzip) is excluded from marketing,
// login, and the super-admin login bundles where it's never used.
export default function DashboardProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
