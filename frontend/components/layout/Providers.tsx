"use client";

import dynamic from "next/dynamic";
import { Provider } from "react-redux";
import { store } from "@/store";
import { ThemeProvider } from "@/context/ThemeContext";

// Toaster is body-portaled; rendering it on the server causes a hydration
// mismatch. Dynamic import with ssr:false defers loading until after mount.
const Toaster = dynamic(
  () => import("react-hot-toast").then((m) => m.Toaster),
  { ssr: false }
);

// Root providers — kept intentionally light so marketing/login pages don't
// pay the cost of Apollo, GraphQL, or any data-fetching layer they don't use.
// Apollo lives in DashboardProviders, mounted only inside the tenant
// dashboard layout where GraphQL queries actually run.
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "500",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            },
            duration: 3500,
          }}
        />
      </ThemeProvider>
    </Provider>
  );
}
