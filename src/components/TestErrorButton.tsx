import { useState } from "react";
import { Button } from "./ui/button";

/**
 * Test component to trigger errors for ErrorBoundary testing
 * Remove this component in production
 */
export function TestErrorButton() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error("This is a test error from TestErrorButton component");
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-card-foreground">Error Boundary Test</h3>
      <p className="text-sm text-muted-foreground">
        Click the button below to trigger an error and test the ErrorBoundary.
      </p>
      <Button variant="destructive" onClick={() => setShouldError(true)} className="w-full">
        Trigger Test Error
      </Button>
    </div>
  );
}
