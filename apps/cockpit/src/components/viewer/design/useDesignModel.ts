"use client";

import { useEffect, useState } from "react";
import { designGlbUrl, getDesignGeometry, type DesignGeometry } from "@/lib/api";
import { type LoadedModel, loadGlbUrl } from "@/lib/gltf";

interface State {
  id: string | null;
  model: LoadedModel | null;
  geometry: DesignGeometry | null;
  error: string | null;
}

function message(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

/**
 * Loads a server design's display mesh and import record together. The record is optional: a
 * missing geometry.json still leaves a usable display model, just without volume/warning data.
 */
export function useDesignModel(id: string | null): {
  model: LoadedModel | null;
  geometry: DesignGeometry | null;
  error: string | null;
  loading: boolean;
} {
  const [state, setState] = useState<State>({ id: null, model: null, geometry: null, error: null });

  useEffect(() => {
    if (!id) return undefined;
    let live = true;
    void (async () => {
      const [modelResult, geometryResult] = await Promise.allSettled([
        loadGlbUrl(designGlbUrl(id), `${id}.glb`),
        getDesignGeometry(id),
      ]);
      if (!live) return;
      if (modelResult.status === "rejected") {
        setState({ id, model: null, geometry: null, error: message(modelResult.reason) });
        return;
      }
      setState({
        id,
        model: modelResult.value,
        geometry: geometryResult.status === "fulfilled" ? geometryResult.value : null,
        error: null,
      });
    })();
    return () => {
      live = false;
    };
  }, [id]);

  // Never show a previous design's mesh against a newly selected id.
  if (state.id !== id) {
    return { model: null, geometry: null, error: null, loading: id != null };
  }
  return { model: state.model, geometry: state.geometry, error: state.error, loading: false };
}
