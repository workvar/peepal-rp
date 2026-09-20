import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  from,
  fromPromise,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import {
  canRefreshSession,
  endSession,
  refreshSession,
} from "@/lib/refreshSession";

// Auth rides on the httpOnly cookies (credentials: "include").
// No token is read from JavaScript-accessible storage.
const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/graphql`
    : "/api/v1/graphql",
  credentials: "include",
});

const tenantLink = setContext((_, { headers }) => {
  const tenantId =
    typeof window !== "undefined"
      ? (localStorage.getItem("tenantId") ?? "")
      : "";
  return {
    headers: {
      ...headers,
      ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
    },
  };
});

// The GraphQL endpoint is behind the same short-lived access token as the REST
// API, so it hits the same 401 the moment that token ages out. Renew the
// session and replay the operation rather than surfacing an error the user
// would read as "logged out". refreshSession() is single-flight, so a page
// firing ten queries at once still refreshes exactly once.
const sessionRefreshLink = onError(({ networkError, operation, forward }) => {
  const status = (networkError as { statusCode?: number } | undefined)
    ?.statusCode;
  if (status !== 401) return;

  // Retry once only: a second 401 means the new token is not the problem.
  if (operation.getContext()._retried) return;

  if (typeof window === "undefined" || !canRefreshSession()) {
    endSession();
    return;
  }

  return fromPromise(
    refreshSession().then((renewed) => {
      if (!renewed) {
        endSession();
        // Surface the original failure to the caller.
        throw networkError;
      }
    })
  ).flatMap(() => {
    operation.setContext({ _retried: true });
    return forward(operation);
  });
});

export const apolloClient = new ApolloClient({
  link: from([sessionRefreshLink, tenantLink, httpLink]),
  cache: new InMemoryCache(),
});
