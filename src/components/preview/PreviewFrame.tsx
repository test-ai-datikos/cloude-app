"use client";

import { useEffect, useRef, useState } from "react";
import { useFileSystem } from "@/lib/contexts/file-system-context";
import {
  createImportMap,
  createPreviewHTML,
} from "@/lib/transform/jsx-transformer";
import { AlertCircle } from "lucide-react";

export function PreviewFrame() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { getAllFiles, refreshTrigger } = useFileSystem();
  // Initialize error based on whether files already exist to avoid an initial
  // white-flash before the welcome screen appears.
  const [error, setError] = useState<string | null>(() => {
    const initialFiles = getAllFiles();
    return initialFiles.size === 0 ? "firstLoad" : null;
  });
  const [entryPoint, setEntryPoint] = useState<string>("/App.jsx");
  // Use a ref instead of state so that updating it does not trigger the effect
  // to re-run (which would cause the iframe srcdoc to be rebuilt unnecessarily).
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    const updatePreview = () => {
      try {
        const files = getAllFiles();

        // Find the entry point - look for App.jsx, App.tsx, index.jsx, or index.tsx
        let foundEntryPoint = entryPoint;
        const possibleEntries = [
          "/App.jsx",
          "/App.tsx",
          "/index.jsx",
          "/index.tsx",
          "/src/App.jsx",
          "/src/App.tsx",
        ];

        if (!files.has(entryPoint)) {
          const found = possibleEntries.find((path) => files.has(path));
          if (found) {
            foundEntryPoint = found;
            setEntryPoint(found);
          } else if (files.size > 0) {
            // Just use the first .jsx/.tsx file found
            const firstJSX = Array.from(files.keys()).find(
              (path) => path.endsWith(".jsx") || path.endsWith(".tsx")
            );
            if (firstJSX) {
              foundEntryPoint = firstJSX;
              setEntryPoint(firstJSX);
            }
          }
        }

        if (files.size === 0) {
          if (isFirstLoadRef.current) {
            setError("firstLoad");
          } else {
            setError("No files to preview");
          }
          return;
        }

        // We have files, so it's no longer the first load
        isFirstLoadRef.current = false;

        if (!foundEntryPoint || !files.has(foundEntryPoint)) {
          setError(
            "No React component found. Create an App.jsx or index.jsx file to get started."
          );
          return;
        }

        const { importMap, styles, errors } = createImportMap(files);
        const previewHTML = createPreviewHTML(foundEntryPoint, importMap, styles, errors);

        if (iframeRef.current) {
          const iframe = iframeRef.current;

          // Need both allow-scripts and allow-same-origin for blob URLs in import map
          iframe.setAttribute(
            "sandbox",
            "allow-scripts allow-same-origin allow-forms"
          );
          iframe.srcdoc = previewHTML;

          setError(null);
        }
      } catch (err) {
        console.error("Preview error:", err);
        setError(err instanceof Error ? err.message : "Unknown preview error");
      }
    };

    updatePreview();
  // error and isFirstLoad intentionally omitted: both are mutated inside this
  // effect. Including them would cause the effect (and the iframe rebuild) to
  // run again every time error/isFirstLoad change — producing a visible flicker.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, getAllFiles, entryPoint]);

  return (
    <div className="relative w-full h-full">
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0 bg-white"
        title="Preview"
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-8 bg-gray-50">
          {error === "firstLoad" ? (
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                <svg
                  className="h-8 w-8 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Welcome to UI Generator
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Start building React components with AI assistance
              </p>
              <p className="text-xs text-gray-500">
                Ask the AI to create your first component to see it live here
              </p>
            </div>
          ) : (
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <AlertCircle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Preview Available
              </h3>
              <p className="text-sm text-gray-500">{error}</p>
              <p className="text-xs text-gray-400 mt-2">
                Start by creating a React component using the AI assistant
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
