"use client";

import {
  DotsThree,
  FolderSimple,
  FolderSimplePlus,
  Layout,
  MagnifyingGlass,
  PencilSimpleLine,
} from "@phosphor-icons/react";
import SidebarUser from "./SidebarUser";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const topItems = [
  { label: "New chat", icon: PencilSimpleLine },
  { label: "Search chats", icon: MagnifyingGlass },
  { label: "More", icon: DotsThree },
];

const projects = ["New project", "Project Ideas", "AWS - SA", "Dinner App"];

const recents = [
  "IELTS Reading Test 4",
  "Band 7 Speaking Notes",
  "Task 2 Environment Essay",
];

function SidebarInner() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <>
      <SidebarHeader className="px-2 py-2">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-fixed-variant))] text-[12px] font-bold text-white">
              I
            </div>
          </div>

          <SidebarTrigger className="size-7 rounded-md text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-on-surface)]">
            <Layout size={16} weight="bold" />
          </SidebarTrigger>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="pt-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {topItems.map(({ label, icon: Icon }, idx) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton
                    tooltip={label}
                    className={`h-9 rounded-lg px-2.5 text-sm font-medium ${
                      idx === 0
                        ? "bg-[var(--color-primary-container)] text-[var(--color-primary)]"
                        : "text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-low)]"
                    }`}
                  >
                    <Icon size={17} weight="bold" />
                    <span className="truncate">{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2 bg-[color:var(--color-outline-variant)]/35" />

        <SidebarGroup>
          <SidebarGroupLabel className="px-2.5 text-[11px] font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Projects
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {projects.map((label, idx) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton
                    tooltip={label}
                    className="h-9 rounded-lg px-2.5 text-sm font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-low)]"
                  >
                    {idx === 0 ? (
                      <FolderSimplePlus size={17} weight="bold" />
                    ) : (
                      <FolderSimple size={17} weight="bold" />
                    )}
                    <span className="truncate">{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2 bg-[color:var(--color-outline-variant)]/35" />

        <SidebarGroup>
          <SidebarGroupLabel className="px-2.5 text-[11px] font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            Recents
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {recents.map((label) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton
                    tooltip={label}
                    className="h-8 rounded-lg px-2.5 text-sm font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-on-surface)]"
                  >
                    <span className="truncate text-[13px]">{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-2 pt-1">
        <SidebarUser collapsed={collapsed} />
      </SidebarFooter>
    </>
  );
}

export default function AppSidebar() {
  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      className="border-r-0 [--sidebar:#f7f9fb] [--sidebar-foreground:#191c1e] [--sidebar-accent:#eef2f4] [--sidebar-accent-foreground:#191c1e] [--sidebar-border:#bec9c2]"
    >
      <SidebarInner />
    </Sidebar>
  );
}
