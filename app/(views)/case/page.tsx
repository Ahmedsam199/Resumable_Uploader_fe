/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, DataTableRef } from "@/components/ui/DataTable";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Routes from "@/Routes.json";

import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import CaseForm from "./CaseForm";

type Data = {
  ID: number;
};

export default function CasesPage() {
  const tableRef = useRef<DataTableRef | null>(null);

  const [modalState, setModalState] = useState({
    open: false,
    data: null,
  });
  const [search, setSearch] = useState<any>({
    search: "",
  });

  const columns: ColumnDef<Data>[] = [
    { accessorKey: "id", header: "id", enableResizing: true },
    { accessorKey: "name", header: "name", enableResizing: true },

    {
      accessorKey: "Actions",
      header: "Actions",
      enableResizing: true,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="default"
            size="icon"
            type="button"
            aria-label="Edit"
            className="hover:scale-105"
            onClick={() => {
              setModalState({ open: true, data: row.original });
            }}
          >
            <Eye size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <Card className="animate-fade-in-up">
        <CardHeader className="text-2xl font-bold tracking-tight">
          <div className="mb-8 flex justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Cases</h1>
              <p className="text-neutral-600 text-lg">All Cases</p>
            </div>
            <CaseForm
              tableRef={tableRef}
              setModalState={setModalState}
              modalState={modalState}
            />
            <Button
              onClick={() => {
                setModalState({ open: true, data: null });
              }}
            >
              New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            classNames="animate-fade-in-up"
            ref={tableRef}
            columns={columns}
            API={Routes.case}
            search={search}
          />
        </CardContent>
      </Card>
    </div>
  );
}
