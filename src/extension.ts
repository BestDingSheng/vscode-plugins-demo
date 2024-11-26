import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "component-replacer" is now active!');

    let disposable = vscode.commands.registerCommand('component-replacer.replaceComponents', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const text = document.getText();
            const newText = replaceComponents(text);
            
            editor.edit(editBuilder => {
                const range = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(text.length)
                );
                editBuilder.replace(range, newText);
            }).then(success => {
                if (success) {
                    vscode.window.showInformationMessage('Components replaced successfully!');
                } else {
                    vscode.window.showErrorMessage('Failed to replace components.');
                }
            });
        }
    });

    context.subscriptions.push(disposable);
}

function replaceComponents(text: string): string {
    // 使用正则表达式匹配 FormItemExt 组件
    const formItemExtRegex = /<FormItemExt\s+([^>]*)>\s*<(Input|Select)([^>]*)\/>\s*<\/FormItemExt>/g;

    return text.replace(formItemExtRegex, (match, formItemProps, componentType, componentProps) => {
        // 解析 FormItemExt 的属性
        const nameMatch = formItemProps.match(/name\s*=\s*"([^"]+)"/);
        const labelMatch = formItemProps.match(/label\s*=\s*"([^"]+)"/);
        const styleMatch = formItemProps.match(/style\s*=\s*({[^}]+})/);

        // 构建新的 Form.Item 属性
        let newFormItemProps = nameMatch ? `name="${nameMatch[1]}"` : '';
        if (styleMatch) {
            newFormItemProps += ` style=${styleMatch[1]}`;
        }

        // 构建新的内部组件属性
        let newComponentProps = componentProps;
        if (labelMatch) {
            newComponentProps += ` label="${labelMatch[1]}"`;
        }

        // 根据组件类型选择替换后的组件名
        const newComponentType = componentType === 'Input' ? 'InputOutLineExt' : 'SelectOutLineExt';

        // 构建新的组件结构
        return `<Form.Item ${newFormItemProps}>\n        <${newComponentType}${newComponentProps}/>\n      </Form.Item>`;
    });
}

export function deactivate() {}

