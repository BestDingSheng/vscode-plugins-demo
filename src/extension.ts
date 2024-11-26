import * as vscode from 'vscode';
import { parse } from '@babel/parser';
import generate from '@babel/generator';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as prettier from 'prettier';

export function activate(context: vscode.ExtensionContext) {
    console.log('Your extension "component-replacer" is now active!');

    let disposable = vscode.commands.registerCommand('component-replacer.replaceComponents', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const code = document.getText();
            const newCode = replaceComponents(code);

            editor.edit(editBuilder => {
                const range = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(code.length)
                );
                editBuilder.replace(range, newCode);
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

function replaceComponents(code: string): string {
    const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
    });

    let hasInputOutLineExt = false;
    let hasSelectOutLineExt = false;

    traverse(ast, {
        ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
            if (path.node.source.value === '@m-tools/antd-ext') {
                const importedComponents = path.node.specifiers.map(spec => spec.local.name);
                if (importedComponents.includes('InputOutLineExt')) hasInputOutLineExt = true;
                if (importedComponents.includes('SelectOutLineExt')) hasSelectOutLineExt = true;
            }
        },
        JSXElement(path: NodePath<t.JSXElement>) {
            const openingElement = path.node.openingElement;

            if (t.isJSXIdentifier(openingElement.name, { name: 'FormItemExt' })) {
                const attributes = openingElement.attributes as t.JSXAttribute[];

                // 过滤掉 label 属性，保留其他所有属性
                const newAttributes = attributes.filter(attr => {
                    return !t.isJSXIdentifier(attr.name, { name: 'label' });
                });

                const nameAttr = newAttributes.find(attr => t.isJSXIdentifier(attr.name, { name: 'name' }));
                const styleAttr = newAttributes.find(attr => t.isJSXIdentifier(attr.name, { name: 'style' }));

                const childElement = path.node.children.find(child =>
                    t.isJSXElement(child) &&
                    ['Input', 'Select'].includes((child.openingElement.name as t.JSXIdentifier).name)
                ) as t.JSXElement;

                if (childElement) {
                    const childName = (childElement.openingElement.name as t.JSXIdentifier).name;
                    const newChildName = childName === 'Input' ? 'InputOutLineExt' : 'SelectOutLineExt';

                    // 更新子组件名称
                    childElement.openingElement.name = t.jsxIdentifier(newChildName);
                    if (childElement.closingElement) {
                        childElement.closingElement.name = t.jsxIdentifier(newChildName);
                    }

                    // 将 `label` 属性添加到子组件中
                    if (nameAttr) {
                        childElement.openingElement.attributes.push(
                            t.jsxAttribute(
                                t.jsxIdentifier('label'),
                                nameAttr.value // 通过 `name` 属性赋值给 `label`
                            )
                        );
                    }

                    // 替换父组件名称为 Form.Item
                    openingElement.name = t.jsxMemberExpression(
                        t.jsxIdentifier('Form'),
                        t.jsxIdentifier('Item')
                    );

                    // 设置新的属性列表
                    openingElement.attributes = newAttributes;
                }

                // 修改闭合标签
                const closingElement = path.node.closingElement;
                if (closingElement) {
                    closingElement.name = t.jsxMemberExpression(
                        t.jsxIdentifier('Form'),
                        t.jsxIdentifier('Item')
                    );
                }
            }
        },
    });

    traverse(ast, {
        Program(path: NodePath<t.Program>) {
            if (!hasInputOutLineExt || !hasSelectOutLineExt) {
                const newSpecifiers: t.ImportSpecifier[] = [];
                if (!hasInputOutLineExt) {
                    newSpecifiers.push(
                        t.importSpecifier(t.identifier('InputOutLineExt'), t.identifier('InputOutLineExt'))
                    );
                }
                if (!hasSelectOutLineExt) {
                    newSpecifiers.push(
                        t.importSpecifier(t.identifier('SelectOutLineExt'), t.identifier('SelectOutLineExt'))
                    );
                }
                // 单独插入 import 语句
                const newImport = t.importDeclaration(newSpecifiers, t.stringLiteral('@m-tools/antd-ext'));
                path.node.body.unshift(newImport);
            }
        },
    });

    // 处理 import 的格式，确保每个 import 都在单独一行
    const output = generate(ast, {
        retainLines: true, // 保留行号
        concise: false, // 生成格式化的代码
    });

    // 获取生成代码，手动将 import 放到单独一行
    const outCode = output.code.replace(/import\s+{.*}\s+from\s+['"](.*)['"];/g, (match, p1) => {
        return match.replace(/,/g, ',\n');
    });

    return outCode;
}

export function deactivate() {}
