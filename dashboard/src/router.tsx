import { createBrowserRouter } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import DashboardLayout from "@/layouts/DashboardLayout";
import InboxLayout from "@/layouts/InboxLayout";
import DashboardPage from "@/pages/DashboardPage";
import InboxPage from "@/pages/InboxPage";
import NewCustomersPage from "@/pages/NewCustomersPage";
import UsersPage from "@/pages/UsersPage";
import UserDetailPage from "@/pages/UserDetailPage";
import BankAccountsPage from "@/pages/BankAccountsPage";
import SlipReportPage from "@/pages/SlipReportPage";
import AdminsPage from "@/pages/AdminsPage";
import TemplatesPage from "@/pages/TemplatesPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import KnowledgePage from "@/pages/KnowledgePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "inbox",
        element: <InboxLayout />,
        children: [
          {
            index: true,
            element: <InboxPage />,
          },
        ],
      },
      {
        path: "new-customers",
        element: <NewCustomersPage />,
      },
      {
        path: "users",
        element: <UsersPage />,
      },
      {
        path: "users/:id",
        element: <UserDetailPage />,
      },
      {
        path: "bank-accounts",
        element: <BankAccountsPage />,
      },
      {
        path: "slip-report",
        element: <SlipReportPage />,
      },
      {
        path: "admins",
        element: <AdminsPage />,
      },
      {
        path: "analytics",
        element: <AnalyticsPage />,
      },
      {
        path: "templates",
        element: <TemplatesPage />,
      },
      {
        path: "knowledge",
        element: <KnowledgePage />,
      },
    ],
  },
]);
