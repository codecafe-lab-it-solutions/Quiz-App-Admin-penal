"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { PaginationBar } from "@/components/admin/pagination-bar";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";

type RequestStatus = "pending" | "completed" | "rejected";

interface MatchedAccount {
  type: "student" | "faculty";
  roll: string;
  name: string | null;
  email: string;
}

interface DeletionRequest {
  id: number;
  identifier: string;
  status: RequestStatus;
  createdAt: string;
  reviewedAt: string | null;
  matchedAccount: MatchedAccount | null;
}
interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_BADGE_VARIANT: Record<RequestStatus, "warning" | "success" | "destructive"> = {
  pending: "warning",
  completed: "success",
  rejected: "destructive",
};

const fetcher = (url: string) => apiClient.get<ListResponse<DeletionRequest>>(url);

export default function DeletionRequestsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const params = new URLSearchParams({ page: String(page), pageSize: "10", search, ...(status ? { status } : {}) });
  const { data, isLoading, mutate } = useSWR(`/api/admin/deletion-requests?${params.toString()}`, fetcher);

  const updateStatus = async (id: number, newStatus: RequestStatus) => {
    try {
      await apiClient.patch(`/api/admin/deletion-requests/${id}`, { status: newStatus });
      toast.success("Request updated");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Update failed");
    }
  };

  const columns: DataTableColumn<DeletionRequest>[] = [
    { key: "identifier", header: "Identifier", render: (r) => <span className="font-medium">{r.identifier}</span> },
    {
      key: "matchedAccount",
      header: "Matched Account",
      render: (r) =>
        r.matchedAccount ? (
          <div className="text-sm">
            <div>
              {r.matchedAccount.name ?? r.matchedAccount.roll}{" "}
              <Badge variant="outline" className="ml-1 align-middle">
                {r.matchedAccount.type}
              </Badge>
            </div>
            <div className="text-muted-foreground">
              {r.matchedAccount.roll} · {r.matchedAccount.email}
            </div>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">No matching account</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant={STATUS_BADGE_VARIANT[r.status]}>{r.status}</Badge>,
    },
    {
      key: "createdAt",
      header: "Requested",
      render: (r) => new Date(r.createdAt).toLocaleString(),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          {r.status === "pending" ? (
            <>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" title="Mark completed">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </Button>
                }
                title="Mark request completed?"
                description={`Confirm the account for "${r.identifier}" has been deleted. This marks the request resolved.`}
                confirmLabel="Mark Completed"
                onConfirm={() => updateStatus(r.id, "completed")}
              />
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" title="Reject">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                }
                title="Reject request?"
                description={`Reject the deletion request for "${r.identifier}"?`}
                confirmLabel="Reject"
                onConfirm={() => updateStatus(r.id, "rejected")}
              />
            </>
          ) : (
            <Button variant="ghost" size="icon" title="Reopen" onClick={() => updateStatus(r.id, "pending")}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Delete Account Requests</h1>
        <p className="text-sm text-muted-foreground">
          Requests submitted from the login page. Accounts live in the legacy university system, so process the
          deletion there (Faculty/Students pages), then mark the request completed here.
        </p>
      </div>

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by email or user ID..."
      >
        <SearchableSelect
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
          placeholder="All statuses"
          className="w-44"
        />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        loading={isLoading}
        emptyMessage="No deletion requests."
      />

      {data?.meta && (
        <PaginationBar
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          pageSize={data.meta.pageSize}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
