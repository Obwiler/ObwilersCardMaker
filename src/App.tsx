import { useState, useCallback } from "react";
import { Layout } from "./ui/components/Layout";
import { ErrorBoundary } from "./ui/components/ErrorBoundary";
import { HomePage } from "./ui/pages/HomePage";
import { TagsPage } from "./ui/pages/TagsPage";
import { CardsPage } from "./ui/pages/CardsPage";
import { EditorPage } from "./ui/pages/EditorPage";
import { ParserPage } from "./ui/pages/ParserPage";
import { DuelPage } from "./ui/pages/DuelPage";
import { DevToolsPage } from "./ui/pages/DevToolsPage";
import type { PageKey } from "./ui/components/Sidebar";

function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>("home");

  const renderPage = useCallback(() => {
    const page = (() => {
      switch (currentPage) {
        case "home": return <HomePage onNavigate={setCurrentPage} />;
        case "tags": return <TagsPage />;
        case "cards": return <CardsPage />;
        case "editor": return <EditorPage />;
        case "parser": return <ParserPage />;
        case "duel": return <DuelPage />;
        case "devtools": return <DevToolsPage />;
        default: return <HomePage onNavigate={setCurrentPage} />;
      }
    })();
    return <ErrorBoundary key={currentPage}>{page}</ErrorBoundary>;
  }, [currentPage]);

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;
