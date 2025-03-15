import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"
import { Prompt, PromptsConfig, PromptQuickPickItem } from "../types/prompts"
import { v4 as uuidv4 } from "uuid"
import { ClineProvider } from "../core/webview/ClineProvider"

export class PromptsManager {
	private static instance: PromptsManager
	private prompts: Prompt[] = []
	private configPath: string
	private disposables: vscode.Disposable[] = []
	private readonly context: vscode.ExtensionContext

	private constructor(context: vscode.ExtensionContext) {
		this.context = context
		this.configPath = path.join(context.globalStorageUri.fsPath, "prompts.json")
		this.loadPrompts()
		this.registerCommands()
	}

	public static getInstance(context: vscode.ExtensionContext): PromptsManager {
		if (!PromptsManager.instance) {
			PromptsManager.instance = new PromptsManager(context)
		}
		return PromptsManager.instance
	}

	public async getPrompts(): Promise<Prompt[]> {
		return this.prompts
	}

	public async addPrompt(promptData: Partial<Prompt>): Promise<void> {
		const newPrompt: Prompt = {
			id: uuidv4(),
			name: promptData.name || "",
			description: promptData.description,
			content: promptData.content || "",
			category: promptData.category,
			tags: promptData.tags || [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}
		this.prompts.push(newPrompt)
		await this.savePrompts()
		this.notifyPromptsUpdated()
	}

	public async editPrompt(prompt: Prompt): Promise<void> {
		const index = this.prompts.findIndex((p) => p.id === prompt.id)
		if (index !== -1) {
			this.prompts[index] = {
				...prompt,
				updatedAt: new Date().toISOString(),
			}
			await this.savePrompts()
			this.notifyPromptsUpdated()
		}
	}

	public async deletePrompt(promptId: string): Promise<void> {
		const index = this.prompts.findIndex((p) => p.id === promptId)
		if (index !== -1) {
			this.prompts.splice(index, 1)
			await this.savePrompts()
			this.notifyPromptsUpdated()
		}
	}

	private notifyPromptsUpdated(): void {
		const provider = ClineProvider.getVisibleInstance()
		if (provider) {
			provider.postMessageToWebview({
				type: "promptsUpdated",
				prompts: this.prompts,
			})
		}
	}

	private async loadPrompts(): Promise<void> {
		try {
			const dir = path.dirname(this.configPath)
			if (!fs.existsSync(dir)) {
				await fs.promises.mkdir(dir, { recursive: true })
			}

			if (fs.existsSync(this.configPath)) {
				const content = await fs.promises.readFile(this.configPath, "utf-8")
				const config: PromptsConfig = JSON.parse(content)
				this.prompts = config.prompts
			} else {
				const oldConfigPath = path.join(this.context.extensionPath, "prompts.json")
				if (fs.existsSync(oldConfigPath)) {
					const content = await fs.promises.readFile(oldConfigPath, "utf-8")
					const config: PromptsConfig = JSON.parse(content)
					this.prompts = config.prompts
					await this.savePrompts()
				} else {
					const defaultConfig: PromptsConfig = {
						version: "1.0.0",
						prompts: [],
					}
					await fs.promises.writeFile(this.configPath, JSON.stringify(defaultConfig, null, 2))
				}
			}
		} catch (error) {
			console.error("Failed to load prompts:", error)
			vscode.window.showErrorMessage("加载提示词配置失败")
		}
	}

	private async savePrompts(): Promise<void> {
		try {
			const config: PromptsConfig = {
				version: "1.0.0",
				prompts: this.prompts,
			}
			await fs.promises.writeFile(this.configPath, JSON.stringify(config, null, 2))
		} catch (error) {
			console.error("Failed to save prompts:", error)
			vscode.window.showErrorMessage("Failed to save prompts configuration")
		}
	}

	public async exportPrompts(targetPath: string): Promise<void> {
		try {
			const config: PromptsConfig = {
				version: "1.0.0",
				prompts: this.prompts,
			}
			await fs.promises.writeFile(targetPath, JSON.stringify(config, null, 2))
			vscode.window.showInformationMessage("提示词导出成功")
		} catch (error) {
			console.error("Failed to export prompts:", error)
			vscode.window.showErrorMessage("导出提示词失败")
		}
	}

	public async importPrompts(sourcePath: string): Promise<void> {
		try {
			const content = await fs.promises.readFile(sourcePath, "utf-8")
			const importedConfig: PromptsConfig = JSON.parse(content)

			// 为导入的提示词生成新的ID，并检查重复
			const importedPrompts = importedConfig.prompts
				.filter((importedPrompt) => {
					// 检查是否已存在相同名称和内容的提示词
					const isDuplicate = this.prompts.some(
						(existingPrompt) =>
							existingPrompt.name === importedPrompt.name && existingPrompt.content === importedPrompt.content,
					)
					return !isDuplicate
				})
				.map((prompt) => ({
					...prompt,
					id: uuidv4(),
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				}))

			if (importedPrompts.length === 0) {
				vscode.window.showInformationMessage("没有新的提示词需要导入")
				return
			}

			// 合并提示词
			this.prompts = [...this.prompts, ...importedPrompts]
			await this.savePrompts()
			this.notifyPromptsUpdated()
			vscode.window.showInformationMessage(`成功导入 ${importedPrompts.length} 个提示词`)
		} catch (error) {
			console.error("Failed to import prompts:", error)
			vscode.window.showErrorMessage("导入提示词失败")
		}
	}

	private registerCommands() {
		this.disposables.push(
			vscode.commands.registerCommand("cline.listPrompts", async () => await this.showPromptsList()),
			vscode.commands.registerCommand("cline.addPrompt", async () => {
				const name = await vscode.window.showInputBox({ prompt: "输入提示词名称" })
				if (!name) {
					return
				}

				const description = await vscode.window.showInputBox({ prompt: "输入提示词描述（可选）" })
				const category = await vscode.window.showInputBox({ prompt: "输入提示词分类（可选）" })
				const tagsInput = await vscode.window.showInputBox({ prompt: "输入标签，用逗号分隔（可选）" })
				const content = await vscode.window.showInputBox({ prompt: "输入提示词内容" })

				if (!content) {
					return
				}

				const newPrompt: Prompt = {
					id: uuidv4(),
					name,
					description,
					content,
					category,
					tags: tagsInput ? tagsInput.split(",").map((tag) => tag.trim()) : [],
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				}

				await this.addPrompt(newPrompt)
				vscode.window.showInformationMessage("提示词添加成功")
			}),
			vscode.commands.registerCommand("cline.editPrompt", async () => {
				const items: PromptQuickPickItem[] = this.prompts.map((prompt) => ({
					label: prompt.name,
					description: prompt.description || "",
					detail: `Tags: ${prompt.tags?.join(", ") || "None"} | Category: ${prompt.category || "None"}`,
					prompt,
				}))

				const selected = await vscode.window.showQuickPick(items, {
					placeHolder: "选择要编辑的提示词",
				})

				if (!selected) {
					return
				}

				const name = await vscode.window.showInputBox({
					prompt: "输入新的提示词名称",
					value: selected.prompt.name,
				})
				if (!name) {
					return
				}

				const description = await vscode.window.showInputBox({
					prompt: "输入新的提示词描述（可选）",
					value: selected.prompt.description,
				})

				const category = await vscode.window.showInputBox({
					prompt: "输入新的提示词分类（可选）",
					value: selected.prompt.category,
				})

				const tagsInput = await vscode.window.showInputBox({
					prompt: "输入新的标签，用逗号分隔（可选）",
					value: selected.prompt.tags?.join(", "),
				})

				const content = await vscode.window.showInputBox({
					prompt: "输入新的提示词内容",
					value: selected.prompt.content,
				})

				if (!content) {
					return
				}

				const updatedPrompt: Prompt = {
					...selected.prompt,
					name,
					description,
					content,
					category,
					tags: tagsInput ? tagsInput.split(",").map((tag) => tag.trim()) : [],
					updatedAt: new Date().toISOString(),
				}

				await this.editPrompt(updatedPrompt)
				vscode.window.showInformationMessage("提示词更新成功")
			}),
			vscode.commands.registerCommand("cline.deletePrompt", async () => {
				const items: PromptQuickPickItem[] = this.prompts.map((prompt) => ({
					label: prompt.name,
					description: prompt.description || "",
					detail: `Tags: ${prompt.tags?.join(", ") || "None"} | Category: ${prompt.category || "None"}`,
					prompt,
				}))

				const selected = await vscode.window.showQuickPick(items, {
					placeHolder: "选择要删除的提示词",
				})

				if (!selected) {
					return
				}

				const confirmed = await vscode.window.showWarningMessage(
					`确定要删除提示词 "${selected.prompt.name}" 吗？`,
					{ modal: true },
					"确定",
				)

				if (confirmed === "确定") {
					await this.deletePrompt(selected.prompt.id)
					vscode.window.showInformationMessage("提示词删除成功")
				}
			}),
			vscode.commands.registerCommand("cline.usePrompt", async (prompt: Prompt) => await this.usePrompt(prompt)),
		)
	}

	private async showPromptsList() {
		const items: PromptQuickPickItem[] = this.prompts.map((prompt) => ({
			label: prompt.name,
			description: prompt.description || "",
			detail: `Tags: ${prompt.tags?.join(", ") || "None"} | Category: ${prompt.category || "None"}`,
			prompt,
		}))

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: "选择提示词",
			matchOnDescription: true,
			matchOnDetail: true,
		})

		if (selected) {
			await this.usePrompt(selected.prompt)
		}
	}

	public async usePrompt(prompt: Prompt) {
		const provider = ClineProvider.getVisibleInstance()
		if (provider) {
			await provider.postMessageToWebview({
				type: "invoke",
				invoke: "setChatBoxMessage",
				text: prompt.content,
			})
			vscode.window.showInformationMessage("提示词已插入到聊天窗口")
		} else {
			vscode.window.showErrorMessage("未找到聊天窗口，请先打开 Cline")
		}
	}

	public dispose() {
		this.disposables.forEach((d) => d.dispose())
	}
}
