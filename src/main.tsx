import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const hideLovableBadgeInterval = setInterval(() => {
  const lovableBadge = document.querySelector("#lovable-badge") as HTMLElement | null;
  if (lovableBadge) {
    lovableBadge.style.display = "none";
    clearInterval(hideLovableBadgeInterval);
  }
}, 100);

createRoot(document.getElementById("root")!).render(<App />);
