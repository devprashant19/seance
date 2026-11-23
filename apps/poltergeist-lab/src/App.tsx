import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./routes/Landing.js";
import { Join } from "./routes/Join.js";
import { Possession } from "./routes/Possession.js";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="/possession/:code" element={<Possession />} />
      </Routes>
    </BrowserRouter>
  );
}
