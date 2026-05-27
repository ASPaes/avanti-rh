import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Building2, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useEmpresasCliente,
  type EmpresaCliente,
} from "@/hooks/useEmpresasCliente";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmpresaFormDialog } from "@/features/empresas/EmpresaFormDialog";

function formatCnpj(cnpj: string): string {
  const digits = (cnpj ?? "").replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function emBreve() {
  toast("Em breve", { description: "Funcionalidade ainda não disponível." });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ativa") {
    return (
      <Badge className="bg-success/10 text-success hover:bg-success/10 border-transparent">
        ativa
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      {status}
    </Badge>
  );
}

function EmpresasPage() {
  const { data, isLoading, error, refetch } = useEmpresasCliente();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState<EmpresaCliente | null>(
    null,
  );

  const abrirCriar = () => {
    setEmpresaEditando(null);
    setDialogOpen(true);
  };

  const abrirEditar = (empresa: EmpresaCliente) => {
    setEmpresaEditando(empresa);
    setDialogOpen(true);
  };

  const verDetalhes = (id: string) => {
    navigate({ to: "/empresas/$id", params: { id } });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            cadastros
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Empresas-cliente
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Empresas atendidas pelo seu escritório. Compartilhadas entre todos
            os módulos.
          </p>
        </div>
        <Button onClick={abrirCriar}>
          <Plus />
          Nova empresa
        </Button>
      </header>

      <div className="bg-surface border border-border rounded-md">
        {error ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTitle>Erro ao carregar empresas</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          </div>
        ) : isLoading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão social</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Colaboradores</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[0, 1, 2].map((i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j} className="py-3 px-4">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Building2
              size={36}
              className="text-muted-foreground/50 mb-3"
              strokeWidth={1.5}
            />
            <p className="text-sm text-muted-foreground mb-4">
              Nenhuma empresa cadastrada
            </p>
            <Button variant="ghost" onClick={abrirCriar}>
              <Plus />
              Cadastrar primeira empresa
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-3 px-4 text-[13px]">
                  Razão social
                </TableHead>
                <TableHead className="py-3 px-4 text-[13px]">CNPJ</TableHead>
                <TableHead className="py-3 px-4 text-[13px]">
                  Cidade/UF
                </TableHead>
                <TableHead className="py-3 px-4 text-[13px]">
                  Colaboradores
                </TableHead>
                <TableHead className="py-3 px-4 text-[13px]">Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((e) => (
                <TableRow key={e.id} className="border-b border-border">
                  <TableCell className="py-3 px-4 text-[13px] font-medium">
                    <div className="flex flex-col">
                      <Link
                        to="/empresas/$id"
                        params={{ id: e.id }}
                        className="text-foreground hover:underline"
                      >
                        {e.razao_social}
                      </Link>
                      {e.nome_fantasia && (
                        <span className="text-[11px] text-muted-foreground">
                          {e.nome_fantasia}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4 font-mono text-[12px]">
                    {formatCnpj(e.cnpj)}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-[13px]">
                    {e.endereco_cidade && e.endereco_uf
                      ? `${e.endereco_cidade}/${e.endereco_uf}`
                      : e.endereco_uf ?? "—"}
                  </TableCell>
                  <TableCell className="py-3 px-4 font-mono text-[13px]">
                    {e.qtd_colaboradores_estimado ?? "—"}
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <StatusBadge status={e.status} />
                  </TableCell>
                  <TableCell className="py-3 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Ações"
                          className="h-8 w-8"
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirEditar(e)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => verDetalhes(e.id)}>
                          Ver detalhes
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <EmpresaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        empresa={empresaEditando}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export const Route = createFileRoute("/_auth/empresas")({
  component: EmpresasPage,
  staticData: { crumb: "Empresas-cliente" },
});