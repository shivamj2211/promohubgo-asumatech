export type ChatbotActionType =
  | "REDIRECT"
  | "REQUIRE_AUTH"
  | "UPDATE_ONBOARDING"
  | "OPEN_PACKAGE";

export interface ChatbotAction {
  id: string;
  label: string;
  description?: string;
  type: ChatbotActionType;
  payload?: any;
  requiresAuth?: boolean;
}
