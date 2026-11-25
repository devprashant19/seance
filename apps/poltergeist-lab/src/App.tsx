import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LiveRoomProvider } from "./live/LiveRoom.js";
const Landing = lazy(() =>
  import("./routes/Landing.js").then((m) => ({ default: m.Landing }))
);
const Join = lazy(() =>
  import("./routes/Join.js").then((m) => ({ default: m.Join }))
);

const Possession = lazy(() =>
  import("./routes/Possession.js").then((m) => ({ default: m.Possession }))
);
const Lab = lazy(() =>
  import("./routes/Lab.js").then((m) => ({ default: m.Lab }))
);
const LabRunner = lazy(() =>
  import("./routes/LabRunner.js").then((m) => ({ default: m.LabRunner }))
);
const ReplayController = lazy(() =>
  import("./replay/index.js").then((m) => ({ default: m.ReplayController }))
);
const GhostEar = lazy(() =>
  import("./accessibility/ghost-ear/GhostEarRoute.js").then((m) => ({ default: m.GhostEarRoute }))
);
const WraithBench = lazy(() =>
  import("./routes/WraithBench.js").then((m) => ({ default: m.WraithBench }))
);
const ArrayRoute = lazy(() =>
  import("./routes/ArrayRoute.js").then((m) => ({ default: m.ArrayRoute }))
);
const GateRoute = lazy(() =>
  import("./routes/GateRoute.js").then((m) => ({ default: m.GateRoute }))
);
const CircleRoute = lazy(() =>
  import("./routes/CircleRoute.js").then((m) => ({ default: m.CircleRoute }))
);
const SkepticRoute = lazy(() =>
  import("./routes/SkepticRoute.js").then((m) => ({ default: m.SkepticRoute }))
);

function RouteFallback() {
  return (
    <div style={{ padding: "2rem", color: "#888", textAlign: "center" }}>
      Summoning...
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      {/* One séance room for every page: the phone joins once and stays while you switch pages. */}
      <LiveRoomProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/join/:code" element={<Join />} />
          <Route path="/possession/:code" element={<Possession />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/lab/:id" element={<LabRunner />} />
          <Route path="/replay" element={<ReplayController />} />
          <Route path="/hear" element={<GhostEar />} />
          <Route path="/bench" element={<WraithBench />} />
          <Route path="/array" element={<ArrayRoute />} />
          <Route path="/gate" element={<GateRoute />} />
          <Route path="/circle" element={<CircleRoute />} />
          <Route path="/skeptic" element={<SkepticRoute />} />
        </Routes>
      </Suspense>
      </LiveRoomProvider>
    </BrowserRouter>
  );
}
