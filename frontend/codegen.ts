import type { CodegenConfig } from "@graphql-codegen/cli";

/**
 * GraphQL type generation.
 *
 * The schema of record is the backend's `graph/schema.graphqls`, read straight
 * from the repo rather than by introspecting a running server: generation must
 * work in CI and on a laptop with nothing running, and a checked-in schema is
 * the same artefact gqlgen builds the resolvers from, so client and server
 * cannot disagree about what exists.
 *
 * Output is one file, `types/graphql.ts`, holding the schema's types plus a
 * typed result and variables pair for every named operation in `graphql/`. It
 * is committed. That matters for the mobile client: it can consume the same
 * generated types without a Go toolchain or a backend checkout.
 *
 * Run `npm run gen:graphql` after changing either the schema or a document.
 * `npm run gen:graphql:check` fails when the committed output is stale, which
 * is what CI should run.
 */
const config: CodegenConfig = {
  schema: "../backend/graph/schema.graphqls",
  documents: ["graphql/**/*.ts", "queries/**/*.ts", "components/**/*.{ts,tsx}"],
  ignoreNoDocuments: true,
  generates: {
    "types/graphql.ts": {
      plugins: ["typescript", "typescript-operations"],
      config: {
        // The API returns ISO 8601 strings for every date and time; typing
        // them as `string` keeps the generated types honest about what
        // actually arrives over the wire.
        scalars: { Time: "string", Date: "string", Upload: "File" },
        // Apollo's cache keys off __typename, and several UI branches read it,
        // so it belongs in the types rather than being cast in at each use.
        skipTypename: false,
        // Nullable fields come back as null, not undefined. Saying so stops
        // `?? fallback` chains from being typed as unreachable.
        avoidOptionals: { field: true, inputValue: false, object: false },
        enumsAsTypes: true,
        useTypeImports: true,
      },
    },
  },
};

export default config;
