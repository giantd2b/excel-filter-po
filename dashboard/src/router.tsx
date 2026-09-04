import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import InboxLayout from "@/layouts/InboxLayout";

// Lazy-loaded pages
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const InboxPage = lazy(() => import("@/pages/InboxPage"));
const NewCustomersPage = lazy(() => import("@/pages/NewCustomersPage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));
const UserDetailPage = lazy(() => import("@/pages/UserDetailPage"));
const BankAccountsPage = lazy(() => import("@/pages/BankAccountsPage"));
const SlipReportPage = lazy(() => import("@/pages/SlipReportPage"));
const AdminsPage = lazy(() => import("@/pages/AdminsPage"));
const TemplatesPage = lazy(() => import("@/pages/TemplatesPage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const KnowledgePage = lazy(() => import("@/pages/KnowledgePage"));
const ApiKeysPage = lazy(() => import("@/pages/ApiKeysPage"));
const AgendaGeneratorPage = lazy(() => import("@/pages/AgendaGeneratorPage"));
const QuotationsPage = lazy(() => import("@/pages/QuotationsPage"));
const BookingsPage = lazy(() => import("@/pages/BookingsPage"));
const QuoteMatchPage = lazy(() => import("@/pages/QuoteMatchPage"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <SuspenseWrapper><LoginPage /></SuspenseWrapper>,
  },
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper>,
      },
      {
        path: "inbox",
        element: <InboxLayout />,
        children: [
          {
            index: true,
            element: <SuspenseWrapper><InboxPage /></SuspenseWrapper>,
          },
        ],
      },
      {
        path: "new-customers",
        element: <SuspenseWrapper><NewCustomersPage /></SuspenseWrapper>,
      },
      {
        path: "users",
        element: <SuspenseWrapper><UsersPage /></SuspenseWrapper>,
      },
      {
        path: "users/:id",
        element: <SuspenseWrapper><UserDetailPage /></SuspenseWrapper>,
      },
      {
        path: "bank-accounts",
        element: <SuspenseWrapper><BankAccountsPage /></SuspenseWrapper>,
      },
      {
        path: "slip-report",
        element: <SuspenseWrapper><SlipReportPage /></SuspenseWrapper>,
      },
      {
        path: "admins",
        element: <SuspenseWrapper><AdminsPage /></SuspenseWrapper>,
      },
      {
        path: "analytics",
        element: <SuspenseWrapper><AnalyticsPage /></SuspenseWrapper>,
      },
      {
        path: "templates",
        element: <SuspenseWrapper><TemplatesPage /></SuspenseWrapper>,
      },
      {
        path: "knowledge",
        element: <SuspenseWrapper><KnowledgePage /></SuspenseWrapper>,
      },
      {
        path: "api-keys",
        element: <SuspenseWrapper><ApiKeysPage /></SuspenseWrapper>,
      },
      {
        path: "agenda",
        element: <SuspenseWrapper><AgendaGeneratorPage /></SuspenseWrapper>,
      },
      {
        path: "quotations",
        element: <SuspenseWrapper><QuotationsPage /></SuspenseWrapper>,
      },
      {
        path: "quote-match",
        element: <SuspenseWrapper><QuoteMatchPage /></SuspenseWrapper>,
      },
      {
        path: "bookings",
        element: <SuspenseWrapper><BookingsPage /></SuspenseWrapper>,
      },
    ],
  },
]);
