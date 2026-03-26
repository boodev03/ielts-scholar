"use client";

import {
  createConversationService,
  deleteConversationService,
  createMessageService,
  createProjectService,
  getConversationMessagesService,
  getSidebarDataService,
  renameConversationService,
  touchConversationService,
} from "@/services/chat/chat.service";
import type { ApiResponse } from "@/types/api";
import type {
  ConversationMessagesResponse,
  CreateConversationInput,
  CreateConversationResponse,
  CreateMessageInput,
  CreateMessageResponse,
  CreateProjectInput,
  CreateProjectResponse,
  DeleteConversationInput,
  DeleteConversationResponse,
  RenameConversationInput,
  RenameConversationResponse,
  SidebarDataResponse,
  TouchConversationInput,
  TouchConversationResponse,
} from "@/types/chat";

export async function requestSidebarData(): Promise<ApiResponse<SidebarDataResponse>> {
  return getSidebarDataService();
}

export async function requestCreateProject(
  payload: CreateProjectInput
): Promise<ApiResponse<CreateProjectResponse>> {
  return createProjectService(payload);
}

export async function requestCreateConversation(
  payload: CreateConversationInput
): Promise<ApiResponse<CreateConversationResponse>> {
  return createConversationService(payload);
}

export async function requestTouchConversation(
  payload: TouchConversationInput
): Promise<ApiResponse<TouchConversationResponse>> {
  return touchConversationService(payload);
}

export async function requestCreateMessage(
  payload: CreateMessageInput
): Promise<ApiResponse<CreateMessageResponse>> {
  return createMessageService(payload);
}

export async function requestRenameConversation(
  payload: RenameConversationInput
): Promise<ApiResponse<RenameConversationResponse>> {
  return renameConversationService(payload);
}

export async function requestDeleteConversation(
  payload: DeleteConversationInput
): Promise<ApiResponse<DeleteConversationResponse>> {
  return deleteConversationService(payload);
}

export async function requestConversationMessages(
  conversationId: string
): Promise<ApiResponse<ConversationMessagesResponse>> {
  return getConversationMessagesService(conversationId);
}
