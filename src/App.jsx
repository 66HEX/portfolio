import "./App.css";
import { Routes, Route, useLocation } from "react-router-dom";
import Preloader from "./components/Preloader/Preloader";
import Dock from "./components/Dock/Dock";
import Home from "./pages/Home/Home";
import About from "./pages/About/About";
import Projects from "./pages/Projects/Projects";
import Photos from "./pages/Photos/Photos";


function App() {
  const location = useLocation();
  return (
    <>
      <Preloader />
      <Dock />
      <Routes location={location} key={location.pathname}>
        <Route index element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/photos" element={<Photos />} />
      </Routes>
    </>
  );
}

export default App;
