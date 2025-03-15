import React, { useState } from "react"
import { VSCodeButton, VSCodeTextField, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react"
import styled from "styled-components"
import { Prompt } from "../../../../src/types/prompts"
import { vscode } from "../../utils/vscode"

const Form = styled.div`
	padding: 20px;
	border: 1px solid var(--vscode-button-secondaryBackground);
	border-radius: 4px;
	margin-bottom: 20px;
`

const FormTitle = styled.h3`
	margin: 0 0 16px 0;
`

const FormField = styled.div`
	margin-bottom: 16px;
`

const ButtonGroup = styled.div`
	display: flex;
	justify-content: flex-end;
	gap: 8px;
`

interface PromptFormProps {
	prompt?: Prompt
	onCancel: () => void
}

const PromptForm: React.FC<PromptFormProps> = ({ prompt, onCancel }) => {
	const [name, setName] = useState(prompt?.name || "")
	const [description, setDescription] = useState(prompt?.description || "")
	const [category, setCategory] = useState(prompt?.category || "")
	const [tags, setTags] = useState(prompt?.tags?.join(", ") || "")
	const [content, setContent] = useState(prompt?.content || "")

	const handleSubmit = () => {
		if (!name || !content) return

		const updatedPrompt: Prompt = {
			id: prompt?.id || "",
			name,
			description,
			content,
			category,
			tags: tags
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean),
			createdAt: prompt?.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		vscode.postMessage({
			type: prompt ? "editPrompt" : "addPrompt",
			prompt: updatedPrompt,
		})

		onCancel()
	}

	return (
		<Form>
			<FormTitle>{prompt ? "编辑提示词" : "添加提示词"}</FormTitle>
			<FormField>
				<VSCodeTextField
					value={name}
					onChange={(e: any) => setName(e.target.value)}
					style={{ width: "100%" }}
					placeholder="提示词名称">
					名称
				</VSCodeTextField>
			</FormField>
			<FormField>
				<VSCodeTextField
					value={description}
					onChange={(e: any) => setDescription(e.target.value)}
					style={{ width: "100%" }}
					placeholder="提示词描述（可选）">
					描述
				</VSCodeTextField>
			</FormField>
			<FormField>
				<VSCodeTextField
					value={category}
					onChange={(e: any) => setCategory(e.target.value)}
					style={{ width: "100%" }}
					placeholder="提示词分类（可选）">
					分类
				</VSCodeTextField>
			</FormField>
			<FormField>
				<VSCodeTextField
					value={tags}
					onChange={(e: any) => setTags(e.target.value)}
					style={{ width: "100%" }}
					placeholder="标签，用逗号分隔（可选）">
					标签
				</VSCodeTextField>
			</FormField>
			<FormField>
				<VSCodeTextArea
					value={content}
					onChange={(e: any) => setContent(e.target.value)}
					style={{ width: "100%" }}
					placeholder="提示词内容"
					rows={4}>
					内容
				</VSCodeTextArea>
			</FormField>
			<ButtonGroup>
				<VSCodeButton appearance="secondary" onClick={onCancel}>
					取消
				</VSCodeButton>
				<VSCodeButton onClick={handleSubmit}>{prompt ? "保存" : "添加"}</VSCodeButton>
			</ButtonGroup>
		</Form>
	)
}

export default PromptForm
