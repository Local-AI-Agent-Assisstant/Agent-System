import { HashRouter, Routes, Route } from "react-router-dom";
import ChatPage from "./pages/ChatPage";
import BubblePage from "./pages/BubblePage";
import DocsLayout from "./docs/DocsLayout";
import Introduction from "./docs/Introduction";
import Installation from "./docs/Installation";
import PlannerGuide from "./docs/tools/PlannerGuide";
import VoiceAssistant from "./docs/VoiceAssistant";
import ToolsSystem from "./docs/ToolsSystem";
import McpArchitecture from "./docs/McpArchitecture";
import FilesUploads from "./docs/FilesUploads";
import Troubleshooting from "./docs/Troubleshooting";
import ScrollToTop from "./common/ScrollToTop";
import WebSearch from "./docs/tools/DeepSearch";
import Calculator from "./docs/tools/Calculator";
import Email from "./docs/tools/Email";
import SystemCommands from "./docs/tools/SystemCommands";
import WriteFiles from "./docs/tools/WriteFiles";
import ThinkerMode from "./docs/ThinkerMode";
import Routine from "./docs/tools/Routine";
import Weather from "./docs/tools/weather";

function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<ChatPage />} />
        {/* Dedicated route for the floating bubble window */}
        <Route path="/bubble" element={<BubblePage />} />
        <Route path="/docs" element={<DocsLayout />}>
          <Route index element={<Introduction />} />
          <Route path="Installation" element={<Installation />} />
          <Route path="voice" element={<VoiceAssistant />} />
          <Route path="thinker" element={<ThinkerMode />} />
          <Route path="tools" element={<ToolsSystem />} />
          <Route path="mcp" element={<McpArchitecture />} />
          <Route path="files" element={<FilesUploads />} />
          <Route path="troubleshooting" element={<Troubleshooting />} />
          {/* Individual tool pages */}
          <Route path="tools/task-planner" element={<PlannerGuide />} />
          <Route path="tools/web-search" element={<WebSearch />} />
          <Route path="tools/calculator" element={<Calculator />} />
          <Route path="tools/email" element={<Email />} />
          <Route path="tools/system-commands" element={<SystemCommands />} />
          <Route path="tools/write-files" element={<WriteFiles />} />
          <Route path="tools/routine" element={<Routine />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
