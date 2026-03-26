"use server";

import { createClient } from "@/lib/supabase/server";
import { apiFailure, apiSuccess, type ApiErrorCode, type ApiResponse } from "@/types/api";
import {
  createConversationSchema,
  deleteConversationSchema,
  createMessageSchema,
  createProjectSchema,
  renameConversationSchema,
  touchConversationSchema,
  type ChatConversation,
  type ChatMessage,
  type ChatProject,
  type ConversationMessagesResponse,
  type CreateConversationResponse,
  type DeleteConversationResponse,
  type CreateMessageResponse,
  type CreateProjectResponse,
  type RenameConversationResponse,
  type SidebarDataResponse,
  type TouchConversationResponse,
} from "@/types/chat";

function mapSupabaseError(status?: number): ApiErrorCode {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  return "SUPABASE_ERROR";
}

async function getAuthedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, userId: null as string | null };
  }

  return { supabase, userId: user.id };
}

function toProject(row: {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_archived: boolean;
  updated_at: string;
}): ChatProject {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    isArchived: row.is_archived,
    updatedAt: row.updated_at,
  };
}

function toConversation(row: {
  id: string;
  project_id: string | null;
  title: string;
  last_message_preview: string | null;
  last_activity_at: string;
  is_archived: boolean;
}): ChatConversation {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    lastMessagePreview: row.last_message_preview,
    lastActivityAt: row.last_activity_at,
    isArchived: row.is_archived,
  };
}

function toMessage(row: {
  id: string;
  conversation_id: string;
  role: "system" | "user" | "assistant";
  content: string;
  created_at: string;
}): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function getSidebarDataService(): Promise<ApiResponse<SidebarDataResponse>> {
  const { supabase, userId } = await getAuthedUserId();
  if (!userId) {
    return apiFailure("UNAUTHORIZED", "You must be logged in.");
  }

  const [{ data: projects, error: projectsError }, { data: recents, error: recentsError }] =
    await Promise.all([
      supabase
        .from("chat_projects")
        .select("id, name, description, color, is_archived, updated_at")
        .eq("user_id", userId)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false }),
      supabase
        .from("chat_conversations")
        .select("id, project_id, title, last_message_preview, last_activity_at, is_archived")
        .eq("user_id", userId)
        .eq("is_archived", false)
        .order("last_activity_at", { ascending: false })
        .limit(20),
    ]);

  if (projectsError) {
    return apiFailure(mapSupabaseError(), projectsError.message);
  }

  if (recentsError) {
    return apiFailure(mapSupabaseError(), recentsError.message);
  }

  return apiSuccess({
    projects: (projects ?? []).map(toProject),
    recents: (recents ?? []).map(toConversation),
  });
}

export async function createProjectService(
  rawInput: unknown
): Promise<ApiResponse<CreateProjectResponse>> {
  const parsed = createProjectSchema.safeParse(rawInput);
  if (!parsed.success) {
    return apiFailure("VALIDATION_ERROR", "Invalid project payload.", parsed.error.flatten());
  }

  const { supabase, userId } = await getAuthedUserId();
  if (!userId) {
    return apiFailure("UNAUTHORIZED", "You must be logged in.");
  }

  const { data, error } = await supabase
    .from("chat_projects")
    .insert({
      user_id: userId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      color: parsed.data.color || null,
    })
    .select("id, name, description, color, is_archived, updated_at")
    .single<{
      id: string;
      name: string;
      description: string | null;
      color: string | null;
      is_archived: boolean;
      updated_at: string;
    }>();

  if (error) {
    return apiFailure(mapSupabaseError(), error.message);
  }

  return apiSuccess({ project: toProject(data) });
}

export async function createConversationService(
  rawInput: unknown
): Promise<ApiResponse<CreateConversationResponse>> {
  const parsed = createConversationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return apiFailure(
      "VALIDATION_ERROR",
      "Invalid conversation payload.",
      parsed.error.flatten()
    );
  }

  const { supabase, userId } = await getAuthedUserId();
  if (!userId) {
    return apiFailure("UNAUTHORIZED", "You must be logged in.");
  }

  if (parsed.data.projectId) {
    const { data: project, error: projectError } = await supabase
      .from("chat_projects")
      .select("id")
      .eq("id", parsed.data.projectId)
      .eq("user_id", userId)
      .maybeSingle<{ id: string }>();

    if (projectError) {
      return apiFailure(mapSupabaseError(), projectError.message);
    }

    if (!project) {
      return apiFailure("FORBIDDEN", "Project not found or not owned by current user.");
    }
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({
      user_id: userId,
      project_id: parsed.data.projectId ?? null,
      title: parsed.data.title,
      last_message_preview: null,
      last_activity_at: now,
    })
    .select("id, project_id, title, last_message_preview, last_activity_at, is_archived")
    .single<{
      id: string;
      project_id: string | null;
      title: string;
      last_message_preview: string | null;
      last_activity_at: string;
      is_archived: boolean;
    }>();

  if (error) {
    return apiFailure(mapSupabaseError(), error.message);
  }

  return apiSuccess({ conversation: toConversation(data) });
}

export async function touchConversationService(
  rawInput: unknown
): Promise<ApiResponse<TouchConversationResponse>> {
  const parsed = touchConversationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return apiFailure(
      "VALIDATION_ERROR",
      "Invalid conversation update payload.",
      parsed.error.flatten()
    );
  }

  const { supabase, userId } = await getAuthedUserId();
  if (!userId) {
    return apiFailure("UNAUTHORIZED", "You must be logged in.");
  }

  const payload: {
    last_activity_at: string;
    title?: string;
    last_message_preview?: string;
  } = {
    last_activity_at: new Date().toISOString(),
  };

  if (parsed.data.title) payload.title = parsed.data.title;
  if (parsed.data.lastMessagePreview) {
    payload.last_message_preview = parsed.data.lastMessagePreview;
  }

  const { error } = await supabase
    .from("chat_conversations")
    .update(payload)
    .eq("id", parsed.data.conversationId)
    .eq("user_id", userId);

  if (error) {
    return apiFailure(mapSupabaseError(), error.message);
  }

  return apiSuccess({ updated: true });
}

export async function createMessageService(
  rawInput: unknown
): Promise<ApiResponse<CreateMessageResponse>> {
  const parsed = createMessageSchema.safeParse(rawInput);
  if (!parsed.success) {
    return apiFailure("VALIDATION_ERROR", "Invalid message payload.", parsed.error.flatten());
  }

  const { supabase, userId } = await getAuthedUserId();
  if (!userId) {
    return apiFailure("UNAUTHORIZED", "You must be logged in.");
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("id", parsed.data.conversationId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string }>();

  if (conversationError) {
    return apiFailure(mapSupabaseError(), conversationError.message);
  }

  if (!conversation) {
    return apiFailure("FORBIDDEN", "Conversation not found or not owned by current user.");
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: parsed.data.conversationId,
      user_id: userId,
      role: parsed.data.role,
      content: parsed.data.content,
    })
    .select("id, conversation_id, role, content, created_at")
    .single<{
      id: string;
      conversation_id: string;
      role: "system" | "user" | "assistant";
      content: string;
      created_at: string;
    }>();

  if (error) {
    return apiFailure(mapSupabaseError(), error.message);
  }

  return apiSuccess({ message: toMessage(data) });
}

export async function renameConversationService(
  rawInput: unknown
): Promise<ApiResponse<RenameConversationResponse>> {
  const parsed = renameConversationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return apiFailure(
      "VALIDATION_ERROR",
      "Invalid rename conversation payload.",
      parsed.error.flatten()
    );
  }

  const { supabase, userId } = await getAuthedUserId();
  if (!userId) {
    return apiFailure("UNAUTHORIZED", "You must be logged in.");
  }

  const { error } = await supabase
    .from("chat_conversations")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.conversationId)
    .eq("user_id", userId);

  if (error) {
    return apiFailure(mapSupabaseError(), error.message);
  }

  return apiSuccess({ updated: true });
}

export async function deleteConversationService(
  rawInput: unknown
): Promise<ApiResponse<DeleteConversationResponse>> {
  const parsed = deleteConversationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return apiFailure(
      "VALIDATION_ERROR",
      "Invalid delete conversation payload.",
      parsed.error.flatten()
    );
  }

  const { supabase, userId } = await getAuthedUserId();
  if (!userId) {
    return apiFailure("UNAUTHORIZED", "You must be logged in.");
  }

  const { error } = await supabase
    .from("chat_conversations")
    .delete()
    .eq("id", parsed.data.conversationId)
    .eq("user_id", userId);

  if (error) {
    return apiFailure(mapSupabaseError(), error.message);
  }

  return apiSuccess({ deleted: true });
}

export async function getConversationMessagesService(
  conversationId: string
): Promise<ApiResponse<ConversationMessagesResponse>> {
  if (!conversationId) {
    return apiFailure("VALIDATION_ERROR", "Missing conversation id.");
  }

  const { supabase, userId } = await getAuthedUserId();
  if (!userId) {
    return apiFailure("UNAUTHORIZED", "You must be logged in.");
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string }>();

  if (conversationError) {
    return apiFailure(mapSupabaseError(), conversationError.message);
  }

  if (!conversation) {
    return apiFailure("FORBIDDEN", "Conversation not found or not owned by current user.");
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, conversation_id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    return apiFailure(mapSupabaseError(), error.message);
  }

  return apiSuccess({
    conversationId,
    messages: (data ?? []).map((row) =>
      toMessage({
        id: row.id,
        conversation_id: row.conversation_id,
        role: row.role as "system" | "user" | "assistant",
        content: row.content,
        created_at: row.created_at,
      })
    ),
  });
}
