import React from "react";
import {
  Button,
  Chip,
  Divider,
  Input,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import { roleTextMap } from "../../constants/roleTextMap.js";
import { displayValue } from "../../utils/adminFormUtils.js";
import { cleanInputClassNames } from "../../styles/inputClassNames.js";

export function AdminDataTable({ activeModule, rows, isLoading, onCreate, onEdit, onDelete }) {
  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase text-primary">Table</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{activeModule.label}数据展示</h3>
          <p className="mt-1 text-sm text-slate-500">{activeModule.description}</p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <Input
            className="w-full sm:w-72"
            aria-label="管理端表格搜索"
            classNames={cleanInputClassNames}
            isClearable
            placeholder="搜索当前表"
            radius="sm"
            variant="bordered"
          />
          <Button className="bg-[#d96f3f] font-semibold text-white" radius="sm" onPress={onCreate}>
            新建
          </Button>
        </div>
      </div>

      <Divider />

      <div className="min-h-0 flex-1 overflow-auto p-5">
        <Table aria-label={`${activeModule.label}数据表格`} radius="sm" shadow="none">
          <TableHeader>
            {activeModule.columns.map((column) => (
              <TableColumn key={column.key}>{column.label}</TableColumn>
            ))}
            <TableColumn>操作</TableColumn>
          </TableHeader>
          <TableBody emptyContent={isLoading ? "加载中..." : "暂无数据"} items={rows}>
            {(item) => (
              <TableRow key={item.id}>
                {activeModule.columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.key === "roleType" ? (
                      <Chip color="primary" radius="sm" size="sm" variant="flat">
                        {roleTextMap[item[column.key]] ?? displayValue(item[column.key])}
                      </Chip>
                    ) : (
                      displayValue(item[column.key], column)
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" radius="sm" variant="flat" onPress={() => onEdit(item)}>
                      编辑
                    </Button>
                    <Button size="sm" radius="sm" color="danger" variant="light" onPress={() => onDelete(item)}>
                      删除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
