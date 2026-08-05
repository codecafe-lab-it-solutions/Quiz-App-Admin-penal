"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { PaginationBar } from "@/components/admin/pagination-bar";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface Faculty {
  roll: string;
  name: string;
  email: string;
}

interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const fetcher = (url: string) => apiClient.get<ListResponse<Faculty>>(url);

export default function FacultyListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const params = new URLSearchParams({ page: String(page), pageSize: "10", search });

  const { data, isLoading } = useSWR(`/api/admin/faculty?${params.toString()}`, fetcher);

  const columns: DataTableColumn<Faculty>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "email", header: "Email", render: (r) => r.email },
    { key: "roll", header: "Roll", render: (r) => r.roll },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <Button asChild variant="ghost" size="icon">
          <Link href={`/admin/faculty/${r.roll}`}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Faculty</h1>
        <p className="text-sm text-muted-foreground">
          Live directory synced from the university system. This data is read-only here.
        </p>
      </div>

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by name, email, roll..."
      />

      <DataTable columns={columns} rows={data?.items ?? []} rowKey={(r) => r.roll} loading={isLoading} />

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
