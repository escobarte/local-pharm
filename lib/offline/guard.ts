// Forms while offline. Pure.
//
// Every form that changes data posts to a Server Action; the only GET forms are
// searches, which are plain navigations (the service worker answers them with
// the offline copy). So: offline, anything that is not GET is stopped.

export const OFFLINE_SAVE_MESSAGE = "Нужен интернет, чтобы сохранить.";
export const OFFLINE_SIGN_OUT_MESSAGE = "Нужен интернет, чтобы выйти.";

/** `method` is the form's attribute as written (React action forms may have none). */
export function isBlockedOffline(method: string | null, online: boolean): boolean {
  if (online) return false;
  const m = (method ?? "").trim().toLowerCase();
  return m !== "get" && m !== "dialog";
}
