"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  requestConversationMessages,
  requestCreateConversation,
  requestDeleteConversation,
  requestCreateMessage,
  requestCreateProject,
  requestRenameConversation,
  requestSidebarData,
  requestTouchConversation,
} from "@/requests/chat.request";
import type {
  CreateConversationInput,
  DeleteConversationInput,
  CreateMessageInput,
  CreateProjectInput,
  RenameConversationInput,
  TouchConversationInput,
} from "@/types/chat";

export const chatQueryKeys = {
  sidebar: ["chat", "sidebar"] as const,
  conversationMessages: (conversationId: string) =>
    ["chat", "conversation", conversationId, "messages"] as const,
};

export function useSidebarDataQuery() {
  return useQuery({
    queryKey: chatQueryKeys.sidebar,
    queryFn: requestSidebarData,
  });
}

export function useCreateProjectMutation() {
  return useMutation({
    mutationFn: (payload: CreateProjectInput) => requestCreateProject(payload),
  });
}

export function useCreateConversationMutation() {
  return useMutation({
    mutationFn: (payload: CreateConversationInput) => requestCreateConversation(payload),
  });
}

export function useTouchConversationMutation() {
  return useMutation({
    mutationFn: (payload: TouchConversationInput) => requestTouchConversation(payload),
  });
}

export function useCreateMessageMutation() {
  return useMutation({
    mutationFn: (payload: CreateMessageInput) => requestCreateMessage(payload),
  });
}

export function useRenameConversationMutation() {
  return useMutation({
    mutationFn: (payload: RenameConversationInput) => requestRenameConversation(payload),
  });
}

export function useDeleteConversationMutation() {
  return useMutation({
    mutationFn: (payload: DeleteConversationInput) => requestDeleteConversation(payload),
  });
}

export function useConversationMessagesQuery(conversationId: string | null) {
  return useQuery({
    queryKey: chatQueryKeys.conversationMessages(conversationId ?? "none"),
    queryFn: () => requestConversationMessages(conversationId ?? ""),
    enabled: Boolean(conversationId),
  });
}
