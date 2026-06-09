import React from "react";
import { adminModules } from "../config/adminModules.js";
import { roleTextMap } from "../constants/roleTextMap.js";
import { AdminSidebar } from "../components/admin/AdminSidebar.jsx";
import { AdminHeader } from "../components/admin/AdminHeader.jsx";
import { AdminMobileNav } from "../components/admin/AdminMobileNav.jsx";
import { AdminMessageBanner } from "../components/admin/AdminMessageBanner.jsx";
import { AdminDataTable } from "../components/admin/AdminDataTable.jsx";
import { AdminFormModal } from "../components/admin/AdminFormModal.jsx";
import { AdminChatSessionPanel } from "../components/admin/AdminChatSessionPanel.jsx";
import { useAdminModuleState } from "../hooks/useAdminModuleState.js";

export function AdminDashboard({ user, onBackHome, onLogout }) {
  const {
    activeKey,
    activeModule,
    rows,
    editingRow,
    isFormOpen,
    setIsFormOpen,
    isLoading,
    isSubmitting,
    message,
    fieldOptionMap,
    searchFieldOptions,
    openCreateForm,
    openEditForm,
    handleSubmit,
    handleDelete,
    switchModule
  } = useAdminModuleState();

  const displayName = user?.name || user?.username || "管理员";
  const roleText = roleTextMap[user?.roleType] ?? "管理员";

  return (
    <main className="flex min-h-screen bg-white text-slate-950">
      <AdminSidebar
        modules={adminModules}
        activeModuleKey={activeKey}
        displayName={displayName}
        roleText={roleText}
        onSwitchModule={switchModule}
        onBackHome={onBackHome}
        onLogout={onLogout}
      />

      <section className="flex min-w-0 flex-1 flex-col bg-[#f7f8fa]">
        <AdminHeader activeModuleLabel={activeModule.label} onBackHome={onBackHome} />
        <AdminMobileNav modules={adminModules} activeModuleKey={activeKey} onSwitchModule={switchModule} />
        <AdminMessageBanner message={message} />

        <div className="min-h-0 flex-1 overflow-auto p-5 sm:p-8">
          {activeModule.readOnlyPanel === "chat-session" ? (
            <AdminChatSessionPanel />
          ) : (
            <AdminDataTable
              activeModule={activeModule}
              isLoading={isLoading}
              rows={rows}
              onCreate={openCreateForm}
              onEdit={openEditForm}
              onDelete={handleDelete}
            />
          )}
        </div>
      </section>

      {activeModule.readOnlyPanel === "chat-session" ? null : (
        <AdminFormModal
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          activeModule={activeModule}
          editingRow={editingRow}
          fieldOptionMap={fieldOptionMap}
          onSearchFieldOptions={searchFieldOptions}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  );
}
