import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import styled from "styled-components"

const StyledButton = styled(VSCodeButton)`
	--prompts-button-bg: var(--vscode-button-secondaryBackground);
	--prompts-button-hover: var(--vscode-button-secondaryHoverBackground);
	--prompts-button-active: var(--vscode-button-secondaryBackground);

	background-color: var(--prompts-button-bg) !important;
	border-color: var(--prompts-button-bg) !important;
	width: 100% !important;

	&:hover {
		background-color: var(--prompts-button-hover) !important;
		border-color: var(--prompts-button-hover) !important;
	}

	&:active {
		background-color: var(--prompts-button-active) !important;
		border-color: var(--prompts-button-active) !important;
	}

	i.codicon {
		margin-right: 6px;
		flex-shrink: 0;
		font-size: 16px !important;
	}
`

interface PromptsButtonProps extends React.ComponentProps<typeof VSCodeButton> {}

const PromptsButton: React.FC<PromptsButtonProps> = (props) => {
	return <StyledButton appearance="secondary" {...props} />
}

export default PromptsButton
