export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Local login page (email/password against the CWS Mantap Worker API).
// Previously this pointed to a Manus OAuth portal that this project's
// backend does not implement, causing 404s ("Route tidak ditemukan").
export const getLoginUrl = () => {
  return "/login";
};
