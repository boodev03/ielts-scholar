"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Cards,
  CalendarBlank,
  ChartLineUp,
  DotsThree,
  FolderSimple,
  FolderSimplePlus,
  MagnifyingGlass,
  MicrophoneStage,
  NotePencil,
  PencilSimpleLine,
  Sidebar as SidebarIcon,
  CaretDown,
  Sparkle,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  chatQueryKeys,
  useDeleteConversationMutation,
  useCreateProjectMutation,
  useRenameConversationMutation,
  useSidebarDataQuery,
} from "@/hooks/api/use-chat";

function SidebarInner() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const createProjectMutation = useCreateProjectMutation();
  const renameConversationMutation = useRenameConversationMutation();
  const deleteConversationMutation = useDeleteConversationMutation();
  const { data, isLoading } = useSidebarDataQuery();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string | null;
    title: string;
  }>({
    open: false,
    id: null,
    title: "",
  });
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const activeConversationId = pathname?.startsWith("/chat/")
    ? pathname.split("/")[2] ?? null
    : null;
  const isPracticeRoute = Boolean(
    pathname?.startsWith("/vocabulary") ||
      pathname?.startsWith("/writing-practice") ||
      pathname?.startsWith("/speaking") ||
      pathname?.startsWith("/plan") ||
      pathname?.startsWith("/progress")
  );
  const [practiceToolsManualOpen, setPracticeToolsManualOpen] = useState(!collapsed);
  const practiceToolsOpen = isPracticeRoute || practiceToolsManualOpen;

  const projects = useMemo(
    () => (data?.success ? data.data.projects : []),
    [data]
  );
  const recents = useMemo(() => (data?.success ? data.data.recents : []), [data]);

  const handleCreateProject = async () => {
    const trimmed = projectName.trim();
    if (!trimmed) {
      toast.error("Project name is required.");
      return;
    }

    const result = await createProjectMutation.mutateAsync({ name: trimmed });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: chatQueryKeys.sidebar });
    setProjectName("");
    setCreateProjectDialogOpen(false);
    toast.success("Project created.");
  };

  const handleStartNewChat = async () => {
    router.push("/chat");
  };

  const handleRenameConversation = async (conversationId: string, currentTitle: string) => {
    const nextTitle = window.prompt("Rename conversation", currentTitle)?.trim();
    if (!nextTitle || nextTitle === currentTitle) return;

    const result = await renameConversationMutation.mutateAsync({
      conversationId,
      title: nextTitle,
    });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: chatQueryKeys.sidebar });
    toast.success("Conversation renamed.");
  };

  const handleDeleteConversation = async () => {
    if (!deleteDialog.id) return;

    const result = await deleteConversationMutation.mutateAsync({
      conversationId: deleteDialog.id,
    });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    if (activeConversationId === deleteDialog.id) {
      router.push("/chat");
    }

    await queryClient.invalidateQueries({ queryKey: chatQueryKeys.sidebar });
    setDeleteDialog({ open: false, id: null, title: "" });
    toast.success("Conversation deleted.");
  };

  return (
    <>
      <SidebarHeader className="px-2 py-2">
        {collapsed ? (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={toggleSidebar}
              className="group/logo relative grid h-8 w-8 place-items-center rounded-lg border border-outline-variant/30 bg-white p-0 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
              aria-label="Expand sidebar"
            >
              <Image
                src="/logo.png"
                alt="IELTS Scholar"
                width={28}
                height={28}
                className="row-start-1 col-start-1 h-7 w-7 rounded-md object-cover transition-opacity group-hover/logo:opacity-0 group-focus-visible/logo:opacity-0"
                priority
              />
              <SidebarIcon
                size={16}
                weight="bold"
                className="row-start-1 col-start-1 opacity-0 transition-opacity group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100"
              />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-outline-variant/30 bg-white">
                <Image
                  src="/logo.png"
                  alt="IELTS Scholar"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-cover"
                  priority
                />
              </div>
            </div>

            <SidebarTrigger className="size-7 rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="pt-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="New chat"
                  onClick={() => void handleStartNewChat()}
                  className="h-9 rounded-lg px-2.5 text-sm font-medium bg-primary-container text-primary"
                >
                  <PencilSimpleLine size={17} weight="bold" />
                  <span className="truncate">New chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Search chats"
                  className="h-9 rounded-lg px-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low"
                >
                  <MagnifyingGlass size={17} weight="bold" />
                  <span className="truncate">Search chats</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Practice Tools"
                  onClick={() => {
                    if (collapsed) {
                      toggleSidebar();
                      setPracticeToolsManualOpen(true);
                      return;
                    }
                    setPracticeToolsManualOpen((prev) => !prev);
                  }}
                  className={`h-9 rounded-lg px-2.5 text-sm font-medium ${
                    isPracticeRoute
                      ? "bg-surface-container text-on-surface"
                      : "text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <Sparkle size={17} weight="bold" />
                  <span className="truncate">Practice Tools</span>
                  {!collapsed ? (
                    <CaretDown
                      size={14}
                      weight="bold"
                      className={`ml-auto transition-transform ${practiceToolsOpen ? "rotate-180" : ""}`}
                    />
                  ) : null}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {!collapsed && practiceToolsOpen ? (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="My Vocabulary"
                      onClick={() => router.push("/vocabulary")}
                      className={`h-8 rounded-lg px-2.5 pl-9 text-sm font-medium ${
                        pathname?.startsWith("/vocabulary")
                          ? "bg-surface-container text-on-surface"
                          : "text-on-surface hover:bg-surface-container-low"
                      }`}
                    >
                      <Cards size={15} weight="bold" />
                      <span className="truncate">My Vocabulary</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Writing Practice"
                      onClick={() => router.push("/writing-practice")}
                      className={`h-8 rounded-lg px-2.5 pl-9 text-sm font-medium ${
                        pathname?.startsWith("/writing-practice")
                          ? "bg-surface-container text-on-surface"
                          : "text-on-surface hover:bg-surface-container-low"
                      }`}
                    >
                      <NotePencil size={15} weight="bold" />
                      <span className="truncate">Writing Practice</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Speaking"
                      onClick={() => router.push("/speaking")}
                      className={`h-8 rounded-lg px-2.5 pl-9 text-sm font-medium ${
                        pathname?.startsWith("/speaking")
                          ? "bg-surface-container text-on-surface"
                          : "text-on-surface hover:bg-surface-container-low"
                      }`}
                    >
                      <MicrophoneStage size={15} weight="bold" />
                      <span className="truncate">Speaking</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Study Plan"
                      onClick={() => router.push("/plan")}
                      className={`h-8 rounded-lg px-2.5 pl-9 text-sm font-medium ${
                        pathname?.startsWith("/plan")
                          ? "bg-surface-container text-on-surface"
                          : "text-on-surface hover:bg-surface-container-low"
                      }`}
                    >
                      <CalendarBlank size={15} weight="bold" />
                      <span className="truncate">Study Plan</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Progress"
                      onClick={() => router.push("/progress")}
                      className={`h-8 rounded-lg px-2.5 pl-9 text-sm font-medium ${
                        pathname?.startsWith("/progress")
                          ? "bg-surface-container text-on-surface"
                          : "text-on-surface hover:bg-surface-container-low"
                      }`}
                    >
                      <ChartLineUp size={15} weight="bold" />
                      <span className="truncate">Progress</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2 bg-outline-variant/35 group-data-[collapsible=icon]:hidden" />

            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel className="px-2.5 text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
                Projects
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <Dialog
                  open={createProjectDialogOpen}
                  onOpenChange={(open) => {
                    setCreateProjectDialogOpen(open);
                    if (!open) setProjectName("");
                  }}
                >
                  <DialogTrigger asChild>
                    <SidebarMenuButton
                      tooltip="New project"
                      className="h-9 rounded-lg px-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low"
                    >
                      <FolderSimplePlus size={17} weight="bold" />
                      <span className="truncate">New project</span>
                    </SidebarMenuButton>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl border-outline-variant/35 bg-surface-container-lowest shadow-none sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-base">Create Project</DialogTitle>
                      <DialogDescription className="text-sm text-on-surface-variant">
                        Give your project a clear name so you can group related chats.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <label
                        htmlFor="project-name"
                        className="text-xs font-medium text-on-surface-variant"
                      >
                        Project name
                      </label>
                      <Input
                        id="project-name"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="e.g. IELTS Writing Task 2"
                        maxLength={120}
                        autoFocus
                        className="h-10 rounded-xl border-outline-variant/50 bg-surface-container-lowest px-3 text-sm"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCreateProjectDialogOpen(false);
                          setProjectName("");
                        }}
                        className="rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        disabled={createProjectMutation.isPending}
                        onClick={() => void handleCreateProject()}
                        className="rounded-xl bg-primary text-white hover:bg-primary-fixed-variant"
                      >
                        {createProjectMutation.isPending ? "Creating..." : "Create"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </SidebarMenuItem>

              {projects.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    tooltip={project.name}
                    className="h-9 rounded-lg px-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low"
                  >
                    <FolderSimple size={17} weight="bold" />
                    <span className="truncate">{project.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {!isLoading && projects.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    disabled
                    className="h-8 rounded-lg px-2.5 text-xs font-medium text-on-surface-variant/70"
                  >
                    <span className="truncate">No projects yet</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="my-2 bg-outline-variant/35 group-data-[collapsible=icon]:hidden" />

            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel className="px-2.5 text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
                Recents
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
              {recents.map((conversation) => (
                <SidebarMenuItem key={conversation.id}>
                  <div className="group/item relative">
                    <SidebarMenuButton
                      tooltip={conversation.title}
                      onClick={() => router.push(`/chat/${conversation.id}`)}
                      className={`h-8 rounded-lg px-2.5 pr-9 text-sm font-medium hover:bg-surface-container-low hover:text-on-surface ${
                        activeConversationId === conversation.id
                          ? "bg-primary-container text-primary"
                          : "text-on-surface-variant"
                      }`}
                    >
                      <span className="truncate text-[13px]">{conversation.title}</span>
                    </SidebarMenuButton>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="Conversation options"
                          className="absolute right-1.5 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-on-surface-variant opacity-0 transition hover:bg-surface-container-low group-hover/item:opacity-100 data-[state=open]:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DotsThree size={13} weight="bold" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-32 rounded-xl border border-outline-variant/35 bg-surface-container-lowest p-1"
                      >
                        <DropdownMenuItem
                          onSelect={() =>
                            handleRenameConversation(conversation.id, conversation.title)
                          }
                          className="rounded-md text-xs"
                        >
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            setDeleteDialog({
                              open: true,
                              id: conversation.id,
                              title: conversation.title,
                            })
                          }
                          className="rounded-md text-xs text-red-600 focus:text-red-600"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </SidebarMenuItem>
              ))}

              {!isLoading && recents.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    disabled
                    className="h-8 rounded-lg px-2.5 text-xs font-medium text-on-surface-variant/70"
                  >
                    <span className="truncate">No recents yet</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-2 pt-1">
        <SidebarUser collapsed={collapsed} />
      </SidebarFooter>

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ ...prev, open, id: open ? prev.id : null }))
        }
      >
        <DialogContent className="rounded-2xl border-outline-variant/35 bg-surface-container-lowest shadow-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Delete Conversation</DialogTitle>
            <DialogDescription className="text-sm text-on-surface-variant">
              This will permanently delete{" "}
              <span className="font-semibold text-on-surface">
                {deleteDialog.title || "this conversation"}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, id: null, title: "" })}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleDeleteConversation()}
              disabled={deleteConversationMutation.isPending}
              className="rounded-xl bg-red-600 text-white hover:bg-red-700"
            >
              {deleteConversationMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
