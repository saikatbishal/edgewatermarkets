import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";

interface RetryableComponentProps {
  children: ReactNode;
  onError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number;
}

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * A component that wraps its children in a try-catch block
 * and retries rendering the children up to a maximum number
 * of times if an error occurs.
 *
 * If the maximum number of retries is reached, the component
 * will render a "Component Failed" message with a reload
 * button.
 *
 * Otherwise, the component will render a "Retrying..."
 * message with the current retry attempt number.
 *
 * @param {ReactNode} children - The children to render
 * @param {(error: Error) => void} onError - An optional callback to handle errors
 * @param {number} maxRetries - The maximum number of retries. Defaults to 3.
 * @param {number} retryDelay - The delay between retries in milliseconds. Defaults to 2000.
 */
/*******  f7610303-0cc9-485d-83cc-ea120f72eeed  *******/const RetryableComponent = ({
  children,
  onError,
  maxRetries = 3,
  retryDelay = 2000,
}: RetryableComponentProps) => {
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = useCallback(
    (error: Error) => {
      setError(error);
      onError?.(error);

      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount((count) => count + 1);
          setError(null);
        }, retryDelay * Math.pow(2, retryCount)); // Exponential backoff
      }
    },
    [maxRetries, retryCount, retryDelay, onError]
  );

  useEffect(() => {
    try {
      if (error) {
        console.error("Component error:", error);
      }
    } catch (err) {
      handleError(err instanceof Error ? err : new Error("Unknown error"));
    }
  }, [error, handleError]);

  const renderChildren = useCallback(() => {
    try {
      return children;
    } catch (err) {
      handleError(err instanceof Error ? err : new Error("Unknown error"));
      return null;
    }
  }, [children, handleError]);

  if (error) {
    if (retryCount >= maxRetries) {
      return (
        <div className="retry-error">
          <h3>Component Failed</h3>
          <p>Maximum retry attempts reached.</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }

    return (
      <div className="retry-loading">
        <p>
          Retrying... Attempt {retryCount + 1} of {maxRetries}
        </p>
      </div>
    );
  }

  return renderChildren();
};

export default RetryableComponent;
