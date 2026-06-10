import React from "react";
import { Chip, Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { AdminDataForm } from "./AdminDataForm.jsx";

export function AdminFormModal({
  isOpen,
  onOpenChange,
  activeModule,
  editingRow,
  fieldOptionMap,
  onSearchFieldOptions,
  isSubmitting,
  onSubmit
}) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      radius="sm"
      scrollBehavior="inside"
      size="2xl"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-3 pr-12">
              <div>
                <p className="text-xs font-bold uppercase text-[#d96f3f]">{editingRow ? "Edit" : "Create"}</p>
                <h3 className="text-xl font-black text-slate-950">{editingRow ? "编辑数据" : "创建数据"}</h3>
              </div>
              <Chip className="w-fit bg-[#f7d7c6] text-[#99441f]" radius="sm" variant="flat">
                {activeModule.tableName}
              </Chip>
              <p className="text-sm font-normal leading-6 text-slate-600">{activeModule.description}</p>
            </ModalHeader>
            <ModalBody>
              <AdminDataForm
                activeModule={activeModule}
                fieldOptionMap={fieldOptionMap}
                initialValues={editingRow}
                isSubmitting={isSubmitting}
                onClose={onClose}
                onSearchFieldOptions={onSearchFieldOptions}
                onSubmit={onSubmit}
              />
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
