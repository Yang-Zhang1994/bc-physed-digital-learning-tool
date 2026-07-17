import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/api";

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 20000;
const RETRY_DELAY_MS = 1500;
const NOTICE_DELAY_MS = 1000;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function ServerWakeupNotice() {
  const [status, setStatus] = useState<"checking" | "ready" | "error">("checking");
  const [showNotice, setShowNotice] = useState(false);
  const runIdRef = useRef(0);

  const checkServer = useCallback(async () => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setStatus("checking");
    setShowNotice(true);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        await api.get("/health", { signal: controller.signal });
        window.clearTimeout(timeout);
        if (runIdRef.current === runId) {
          setStatus("ready");
        }
        return;
      } catch {
        window.clearTimeout(timeout);
        if (attempt < MAX_ATTEMPTS) {
          await wait(RETRY_DELAY_MS);
        }
      }
    }

    if (runIdRef.current === runId) {
      setStatus("error");
      setShowNotice(true);
    }
  }, []);

  useEffect(() => {
    const noticeTimer = window.setTimeout(() => setShowNotice(true), NOTICE_DELAY_MS);
    void checkServer();

    return () => {
      window.clearTimeout(noticeTimer);
      runIdRef.current += 1;
    };
  }, [checkServer]);

  if (status === "ready" || !showNotice) {
    return null;
  }

  if (status === "error") {
    return (
      <aside className="server-status server-status--error" role="alert">
        <div>
          <strong>The demo server is taking longer than expected.</strong>
          <span>
            {" "}
            Free-tier hosting sleeps after inactivity. Please wait about 1 minute, then click Try
            again.
          </span>
        </div>
        <button type="button" className="server-status__button" onClick={() => void checkServer()}>
          Try again
        </button>
      </aside>
    );
  }

  return (
    <aside className="server-status" role="status" aria-live="polite">
      <span className="server-status__indicator" aria-hidden="true" />
      <div>
        <strong>Starting the demo server…</strong>
        <span>
          {" "}
          Please wait about 1 minute. Free-tier hosting sleeps after inactivity, so the first visit
          must wake the API before the app can load data.
        </span>
      </div>
    </aside>
  );
}
