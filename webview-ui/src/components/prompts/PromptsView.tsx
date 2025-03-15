import React, { useEffect, useState } from "react"
import { VSCodeButton, VSCodeTextArea, VSCodeTextField, VSCodeDivider } from "@vscode/webview-ui-toolkit/react"
import styled from "styled-components"
import { Prompt } from "../../../../src/types/prompts"
import { vscode } from "../../utils/vscode"
import PromptForm from "./PromptForm"

const Container = styled.div`
	padding: 20px;
	height: 100%;
	display: flex;
	flex-direction: column;
`

const Header = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
`

const Title = styled.h2`
	margin: 0;
`

const PromptList = styled.div`
	flex: 1;
	overflow-y: auto;
`

const PromptItem = styled.div`
	border: 1px solid var(--vscode-button-secondaryBackground);
	border-radius: 4px;
	padding: 12px;
	margin-bottom: 12px;
`

const PromptHeader = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8px;
`

const PromptName = styled.h3`
	margin: 0;
	font-size: 16px;
`

const PromptDescription = styled.p`
	margin: 8px 0;
	color: var(--vscode-descriptionForeground);
`

const PromptContent = styled.pre`
	margin: 8px 0;
	padding: 8px;
	background-color: var(--vscode-editor-background);
	border-radius: 4px;
	overflow-x: auto;
	white-space: pre-wrap;
`

const ButtonGroup = styled.div`
	display: flex;
	gap: 8px;
`

const TagsContainer = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 8px;
`

const Tag = styled.span`
	background-color: var(--vscode-badge-background);
	color: var(--vscode-badge-foreground);
	padding: 2px 6px;
	border-radius: 4px;
	font-size: 12px;
`

const SearchContainer = styled.div`
	margin-bottom: 20px;
`

type PromptsViewProps = {
	onDone: () => void
}

const PromptsView: React.FC<PromptsViewProps> = ({ onDone }) => {
	const [prompts, setPrompts] = useState<Prompt[]>([])
	const [isAdding, setIsAdding] = useState(false)
	const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
	const [searchText, setSearchText] = useState("")

	useEffect(() => {
		vscode.postMessage({ type: "getPrompts" })

		const messageHandler = (event: MessageEvent) => {
			const message = event.data
			if (message.type === "promptsUpdated") {
				setPrompts(message.prompts)
			}
		}

		window.addEventListener("message", messageHandler)
		return () => window.removeEventListener("message", messageHandler)
	}, [])

	const handleUsePrompt = (prompt: Prompt) => {
		const fullPrompt: Prompt = {
			id: prompt.id,
			name: prompt.name,
			content: prompt.content,
			description: prompt.description || "",
			category: prompt.category || "",
			tags: prompt.tags || [],
			createdAt: prompt.createdAt,
			updatedAt: prompt.updatedAt,
		}
		vscode.postMessage({
			type: "usePrompt",
			prompt: fullPrompt,
		})
		onDone()
	}

	const handleCancelForm = () => {
		setIsAdding(false)
		setEditingPrompt(null)
	}

	const handleDeletePrompt = (promptId: string) => {
		vscode.postMessage({
			type: "deletePrompt",
			promptId,
		})
	}

	const handleExportPrompts = () => {
		vscode.postMessage({
			type: "exportPrompts",
		})
	}

	const handleImportPrompts = () => {
		vscode.postMessage({
			type: "importPrompts",
		})
	}

	const filteredPrompts = prompts.filter((prompt) => {
		const searchLower = searchText.toLowerCase()
		return (
			prompt.name.toLowerCase().includes(searchLower) ||
			(prompt.description?.toLowerCase() || "").includes(searchLower) ||
			(prompt.category?.toLowerCase() || "").includes(searchLower) ||
			prompt.tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ||
			false ||
			prompt.content.toLowerCase().includes(searchLower)
		)
	})

	return (
		<Container>
			<Header>
				<Title>提示词管理</Title>
				<ButtonGroup>
					<VSCodeButton appearance="secondary" onClick={onDone}>
						返回
					</VSCodeButton>
					<VSCodeButton appearance="secondary" onClick={handleExportPrompts}>
						导出
					</VSCodeButton>
					<VSCodeButton appearance="secondary" onClick={handleImportPrompts}>
						导入
					</VSCodeButton>
					{!isAdding && !editingPrompt && <VSCodeButton onClick={() => setIsAdding(true)}>添加</VSCodeButton>}
				</ButtonGroup>
			</Header>

			<SearchContainer>
				<VSCodeTextField
					value={searchText}
					onChange={(e: any) => setSearchText(e.target.value)}
					style={{ width: "100%" }}
					placeholder="搜索提示词...">
					搜索
				</VSCodeTextField>
			</SearchContainer>

			{(isAdding || editingPrompt) && <PromptForm prompt={editingPrompt || undefined} onCancel={handleCancelForm} />}

			<PromptList>
				{filteredPrompts.map((prompt) => (
					<PromptItem key={prompt.id}>
						<PromptHeader>
							<PromptName>{prompt.name}</PromptName>
							<ButtonGroup>
								<VSCodeButton onClick={() => handleUsePrompt(prompt)}>使用</VSCodeButton>
								<VSCodeButton appearance="secondary" onClick={() => setEditingPrompt(prompt)}>
									编辑
								</VSCodeButton>
								<VSCodeButton appearance="secondary" onClick={() => handleDeletePrompt(prompt.id)}>
									删除
								</VSCodeButton>
							</ButtonGroup>
						</PromptHeader>
						{prompt.description && <PromptDescription>{prompt.description}</PromptDescription>}
						<PromptContent>{prompt.content}</PromptContent>
						{prompt.tags && prompt.tags.length > 0 && (
							<TagsContainer>
								{prompt.tags.map((tag, index) => (
									<Tag key={index}>{tag}</Tag>
								))}
							</TagsContainer>
						)}
					</PromptItem>
				))}
			</PromptList>
		</Container>
	)
}

export default PromptsView
