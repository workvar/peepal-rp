"use client";

// Loads (and saves) the tenant's OPD slip design. The config is one JSON blob,
// so the hook hands callers a parsed object and takes one back.

import { useQuery, useMutation } from "@apollo/client";
import { OPD_SLIP_CONFIG } from "@/graphql/queries/opd-slip";
import { UPDATE_OPD_SLIP_CONFIG } from "@/graphql/mutations/opd-slip";
import { parseSlipConfig } from "./defaults";
import type { OpdSlipConfig } from "./types";

export function useOpdSlipConfig() {
  const { data, loading, refetch } = useQuery(OPD_SLIP_CONFIG, {
    fetchPolicy: "cache-and-network",
  });
  const [saveMut, { loading: saving }] = useMutation(UPDATE_OPD_SLIP_CONFIG);

  const config = parseSlipConfig(data?.opdSlipConfig);

  const save = async (next: OpdSlipConfig) => {
    await saveMut({ variables: { content: JSON.stringify(next) } });
    await refetch();
  };

  return { config, loading, saving, save };
}
