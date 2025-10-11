import { useState, useEffect } from "react";

interface UseErrorPageReturn {
  isReloading: boolean;
  retry: () => void;
  hasSourcePage: boolean;
}

/**
 * Custom hook for error page functionality
 * Manages reload state and focuses the first button on mount
 */
export function useErrorPage(): UseErrorPageReturn {
  const [isReloading, setIsReloading] = useState(false);
  const [hasSourcePage, setHasSourcePage] = useState(false);

  useEffect(() => {
    // Set document title
    document.title = "Unexpected Error";

    // Check if we have a source page to retry
    const sourcePage = sessionStorage.getItem("errorSourcePage");
    setHasSourcePage(!!sourcePage);

    // Focus first button for accessibility
    const firstButton = document.querySelector("button");
    if (firstButton) {
      firstButton.focus();
    }
  }, []);

  const retry = () => {
    if (isReloading) return;

    setIsReloading(true);

    // Get the original page that had the error
    const sourcePage = sessionStorage.getItem("errorSourcePage");

    if (sourcePage) {
      sessionStorage.removeItem("errorSourcePage");
      // Navigate back to the original page
      // eslint-disable-next-line react-compiler/react-compiler
      window.location.href = sourcePage;
    } else {
      // Fallback: reload current page (though this shouldn't happen)
      window.location.reload();
    }
  };

  return { isReloading, retry, hasSourcePage };
}
