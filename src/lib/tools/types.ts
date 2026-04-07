export interface ToolResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export type ToolSuccess<T> = { success: true; data: T }
export type ToolError = { success: false; error: string }
