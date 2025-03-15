import * as vscode from "vscode"

export interface Prompt {
	id: string
	name: string
	description?: string
	content: string
	tags?: string[]
	category?: string
	createdAt: string
	updatedAt: string
}

export interface PromptsConfig {
	version: string
	prompts: Prompt[]
}

export interface PromptQuickPickItem extends vscode.QuickPickItem {
	prompt: Prompt
}
