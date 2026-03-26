import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required.")
    .max(120, "Project name is too long."),
  description: z
    .string()
    .trim()
    .max(500, "Project description is too long.")
    .optional(),
  color: z
    .string()
    .trim()
    .max(20, "Project color is too long.")
    .optional(),
});

export const createConversationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Conversation title is required.")
    .max(200, "Conversation title is too long."),
  projectId: z.uuid().optional(),
});

export const touchConversationSchema = z.object({
  conversationId: z.uuid(),
  title: z
    .string()
    .trim()
    .min(1, "Conversation title is required.")
    .max(200, "Conversation title is too long.")
    .optional(),
  lastMessagePreview: z
    .string()
    .trim()
    .min(1, "Message preview is required.")
    .max(500, "Message preview is too long.")
    .optional(),
});

export const renameConversationSchema = z.object({
  conversationId: z.uuid(),
  title: z
    .string()
    .trim()
    .min(1, "Conversation title is required.")
    .max(200, "Conversation title is too long."),
});

export const deleteConversationSchema = z.object({
  conversationId: z.uuid(),
});

export const createMessageSchema = z.object({
  conversationId: z.uuid(),
  role: z.enum(["system", "user", "assistant"]),
  content: z
    .string()
    .trim()
    .min(1, "Message content is required.")
    .max(10000, "Message content is too long."),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type TouchConversationInput = z.infer<typeof touchConversationSchema>;
export type RenameConversationInput = z.infer<typeof renameConversationSchema>;
export type DeleteConversationInput = z.infer<typeof deleteConversationSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;

export type ChatProject = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isArchived: boolean;
  updatedAt: string;
};

export type ChatConversation = {
  id: string;
  projectId: string | null;
  title: string;
  lastMessagePreview: string | null;
  lastActivityAt: string;
  isArchived: boolean;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: string;
};

export type SidebarDataResponse = {
  projects: ChatProject[];
  recents: ChatConversation[];
};

export type CreateProjectResponse = {
  project: ChatProject;
};

export type CreateConversationResponse = {
  conversation: ChatConversation;
};

export type TouchConversationResponse = {
  updated: true;
};

export type RenameConversationResponse = {
  updated: true;
};

export type DeleteConversationResponse = {
  deleted: true;
};

export type CreateMessageResponse = {
  message: ChatMessage;
};

export type ConversationMessagesResponse = {
  conversationId: string;
  messages: ChatMessage[];
};
