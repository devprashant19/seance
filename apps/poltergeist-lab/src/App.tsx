import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./routes/Landing.js";
import { Join } from "./routes/Join.js";
import { Possession } from "./routes/Possession.js";
import { Lab } from "./routes/Lab.js";
import { LabRunner } from "./routes/LabRunner.js";
import { ReplayController } from "./replay/index.js";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="/possession/:code" element={<Possession />} />
        <Route path="/lab" element={<Lab />} />
        <Route path="/lab/:id" element={<LabRunner />} />
        <Route path="/replay" element={<ReplayController />} />
      </Routes>
    </BrowserRouter>
  );
}
