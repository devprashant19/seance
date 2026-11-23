import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ChoirHome } from "./routes/ChoirHome.js";
import { JoinChoir } from "./routes/JoinChoir.js";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChoirHome />} />
        <Route path="/join/:code" element={<JoinChoir />} />
      </Routes>
    </BrowserRouter>
  );
}
