// Android's back button (handled natively in MainActivity.java, which calls
// window.__mbwBack and only leaves the app when it returns false):
// 1. an open dialog/sheet closes,
// 2. during a workout it asks "End workout?" instead of dropping the session,
// 3. otherwise it goes to the previous screen,
// 4. on Home (or the first onboarding screen) it leaves the app.

type Navigate = (to: string) => void;

const EXIT_PATHS = new Set(["/", "/home", "/onboarding/welcome"]);

function closeOpenDialog(): boolean {
  const open = document.querySelector<HTMLElement>(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [aria-modal="true"]',
  );
  if (!open) return false;
  const closeButton = open.querySelector<HTMLElement>(
    '[aria-label*="close" i], [data-ocid$="close_button"], [data-ocid$="cancel_button"]',
  );
  if (closeButton) {
    closeButton.click();
    return true;
  }
  const esc = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
  open.dispatchEvent(esc);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  return true;
}

export function installAndroidBack(navigate: Navigate) {
  (window as unknown as { __mbwBack: () => boolean }).__mbwBack = () => {
    if (closeOpenDialog()) return true;
    const path = window.location.pathname;
    if (EXIT_PATHS.has(path)) return false;
    if (path === "/workout/session") {
      document
        .querySelector<HTMLElement>('[data-ocid="workout-session.quit_button"]')
        ?.click();
      return true;
    }
    const index = (window.history.state as { __TSR_index?: number } | null)
      ?.__TSR_index;
    if (typeof index === "number" && index > 0) window.history.back();
    else navigate("/home");
    return true;
  };
}
