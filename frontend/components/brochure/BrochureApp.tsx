"use client";

import { ApolloProvider, useQuery } from "@apollo/client";
import { apolloClient } from "@/lib/apollo";
import { BROCHURE_CONTENT } from "@/graphql/queries/brochure";
import { mergeContent, DEFAULT_CONTENT } from "@/lib/brochure/content";
import Brochure from "./Brochure";

// Fetches saved content for the current tenant and renders the brochure. Falls
// back to DEFAULT_CONTENT when nothing is saved, the user is anonymous, or the
// request fails (the page stays public and always renders something).
function BrochureInner() {
  const { data } = useQuery(BROCHURE_CONTENT, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  let content = DEFAULT_CONTENT;
  const raw = data?.brochureContent;
  if (raw) {
    try {
      content = mergeContent(JSON.parse(raw));
    } catch {
      content = DEFAULT_CONTENT;
    }
  }

  return <Brochure content={content} />;
}

export default function BrochureApp() {
  return (
    <ApolloProvider client={apolloClient}>
      <BrochureInner />
    </ApolloProvider>
  );
}
