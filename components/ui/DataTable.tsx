/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader,
} from "lucide-react";
import axios from "axios";

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  enableColumnResizing?: boolean;
  search?: Record<string, string>;
  API: string;
  classNames: string;
};

export interface DataTableRef {
  refetch: () => void;
}

export const DataTable = forwardRef<DataTableRef, DataTableProps<any, any>>(
  function DataTable<TData, TValue>(
    {
      columns,
      enableColumnResizing = true,
      search = {},
      API = "",
      classNames,
    }: DataTableProps<TData, TValue>,
    ref
  ) {
    const [pageSize, setPageSize] = React.useState(10);
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
      try {
        setLoading(true);
        const queryParams = Object.fromEntries(
          Object.entries(search).filter(
            ([, value]) => value !== null && value !== undefined && value !== ""
          )
        );

        const { data } = (await axios.get(API, { params: queryParams })) ?? [];
        setData(data);
        setLoading(false);
      } catch (error) {
        setLoading(false);
        console.error("Error fetching data:", error);
      }
    };

    // Expose refetch function to parent components
    useImperativeHandle(ref, () => ({
      refetch: fetchData,
    }));

    useEffect(() => {
      const timeout = setTimeout(() => {
        fetchData();
      }, 300);

      return () => clearTimeout(timeout);
    }, [search]);

    const table = useReactTable({
      data: data,
      columns,
      state: {
        sorting,
      },
      onSortingChange: setSorting,

      enableColumnResizing,
      columnResizeMode: "onChange",
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
    });

    React.useEffect(() => {
      table.setPageSize(pageSize);
    }, [pageSize, table]);

    if (loading) {
      return (
        <div className="flex justify-center items-center py-10">
          <Loader className="animate-spin h-6 w-6 text-gray-500" />
        </div>
      );
    }

    return (
      <div className={`space-y-4 ${classNames}`}>
        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="relative cursor-pointer select-none border-r  last:border-r-0"
                      onClick={header.column.getToggleSortingHandler()}
                      style={{
                        width: header.getSize(),
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: " ↑",
                            desc: " ↓",
                          }[header.column.getIsSorted() as string] ?? null}
                        </span>
                      </div>

                      {/* Column Resize Handle */}
                      {enableColumnResizing && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none bg-background hover:bg-background-100 ${
                            header.column.getIsResizing() ? "bg-background" : ""
                          }`}
                        />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    style={{
                      borderRightWidth: "0px",
                    }}
                    key={row.id}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="border-r border-gray-100 last:border-r-0"
                        style={{
                          width: cell.column.getSize(),
                          borderRightWidth: "0px",
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center">
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Info & Pagination */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border cursor-pointer rounded px-2 py-1 text-sm"
            >
              {[5, 10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  Show {size}
                </option>
              ))}
            </select>

            <span>
              Showing {table.getRowModel().rows.length} of {data.length} entries
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <div className="space-x-1">
              <Button
                variant="outline"
                className="cursor-pointer"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                className="cursor-pointer"
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                className="cursor-pointer"
                variant="outline"
                size="sm"
                onClick={() => {
                  table.nextPage();
                }}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                className="cursor-pointer"
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
