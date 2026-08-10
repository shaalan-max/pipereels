"use client";
import { createContext, useContext } from "react";

export const WorkspaceContext = createContext(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within the client workspace layout");
  return ctx;
}
