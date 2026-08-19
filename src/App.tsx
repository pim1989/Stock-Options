import { useState } from "react";
import { Layout, type TabId } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Recommendations } from "./pages/Recommendations";
import { Positions } from "./pages/Positions";
import { TaxModule } from "./pages/TaxModule";
import { Education } from "./pages/Education";
import { usePortfolio } from "./hooks/usePortfolio";
import { buildDarfAlerts, computeMonthlyTax } from "./lib/darf";
import { CARTEIRA_REVISADA_EM } from "./data/meta";

export default function App() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const portfolio = usePortfolio();

  const taxResults = computeMonthlyTax(portfolio.positions);
  const darfAlerts = buildDarfAlerts(taxResults, portfolio.paidDarfKeys);
  const pendingCount = darfAlerts.filter((a) => a.level === "ATRASADO" || a.level === "PROXIMO").length;

  return (
    <Layout active={tab} onChange={setTab} darfBadge={pendingCount} revisedAt={CARTEIRA_REVISADA_EM}>
      {tab === "dashboard" && <Dashboard positions={portfolio.positions} darfAlerts={darfAlerts} />}
      {tab === "recomendacoes" && <Recommendations portfolio={portfolio} />}
      {tab === "operacoes" && <Positions portfolio={portfolio} />}
      {tab === "ir" && <TaxModule portfolio={portfolio} />}
      {tab === "educacao" && <Education />}
    </Layout>
  );
}
