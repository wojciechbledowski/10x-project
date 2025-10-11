import { ErrorBoundary } from "./ErrorBoundary";
import { TestErrorButton } from "./TestErrorButton";

/**
 * Wrapper component that combines ErrorBoundary and TestErrorButton
 * in a single React tree for proper error catching.
 * This is necessary because Astro islands with different hydration
 * strategies create separate React roots.
 */
export function TestErrorBoundary() {
  return (
    <ErrorBoundary>
      <TestErrorButton />
    </ErrorBoundary>
  );
}
