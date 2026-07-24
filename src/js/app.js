import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "../css/main.css";
import { initNavbar } from "./components/navbar.js";

export async function initApp() {
  await initNavbar();
}
