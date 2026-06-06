import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/configuracoes")({
  component: () => <Outlet />,
  staticData: { crumb: "Configurações" },
});