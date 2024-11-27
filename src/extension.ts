import * as vscode from 'vscode';
import { parse } from '@babel/parser';
import generate from '@babel/generator';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as prettier from 'prettier';

// 定义组件替换规则的接口
interface ComponentReplaceRule {
  from: string;
  to: string;
  importFrom: string;
}

// 定义组件替换规则
const componentReplaceRules: ComponentReplaceRule[] = [
  { from: 'Input', to: 'InputOutLineExt', importFrom: '@m-tools/antd-ext' },
  { from: 'Select', to: 'SelectOutLineExt', importFrom: '@m-tools/antd-ext' },
  // 在这里添加更多的替换规则
];

export function activate(context: vscode.ExtensionContext) {
  console.log('Your extension "component-replacer" is now active!');

  let disposable = vscode.commands.registerCommand('component-replacer.replaceComponents', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const document = editor.document;
      const code = document.getText();
      const newCode = await replaceAndFormatComponents(code);

      const success = await editor.edit(editBuilder => {
        const range = new vscode.Range(
          document.positionAt(0),
          document.positionAt(code.length)
        );
        editBuilder.replace(range, newCode);
      });

      if (success) {
        vscode.window.showInformationMessage('Components replaced and formatted successfully!');
      } else {
        vscode.window.showErrorMessage('Failed to replace and format components.');
      }
    }
  });

  context.subscriptions.push(disposable);
}

async function replaceAndFormatComponents(code: string): Promise<string> {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  const importedComponents: Set<string> = new Set();
  let antdExtImport: NodePath<t.ImportDeclaration> | null = null;

  traverse(ast, {
    ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
      componentReplaceRules.forEach(rule => {
        if (path.node.source.value === rule.importFrom) {
          antdExtImport = path;
          path.node.specifiers.forEach(spec => {
            if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
              importedComponents.add(spec.imported.name);
            }
          });
        }
      });
    },
    JSXElement(path: NodePath<t.JSXElement>) {
      const openingElement = path.node.openingElement;

      if (t.isJSXIdentifier(openingElement.name, { name: 'FormItemExt' })) {
        const attributes = openingElement.attributes as t.JSXAttribute[];
        const newAttributes = attributes.filter(attr => !t.isJSXIdentifier(attr.name, { name: 'label' }));
        const nameAttr = newAttributes.find(attr => t.isJSXIdentifier(attr.name, { name: 'name' }));

        const childElement = path.node.children.find(child =>
          t.isJSXElement(child) &&
          componentReplaceRules.some(rule => rule.from === (child.openingElement.name as t.JSXIdentifier).name)
        ) as t.JSXElement;

        if (childElement) {
          const childName = (childElement.openingElement.name as t.JSXIdentifier).name;
          const rule = componentReplaceRules.find(r => r.from === childName);
          if (rule) {
            childElement.openingElement.name = t.jsxIdentifier(rule.to);
            if (childElement.closingElement) {
              childElement.closingElement.name = t.jsxIdentifier(rule.to);
            }

            if (nameAttr) {
              childElement.openingElement.attributes.push(
                t.jsxAttribute(t.jsxIdentifier('label'), nameAttr.value)
              );
            }

            openingElement.name = t.jsxMemberExpression(
              t.jsxIdentifier('Form'),
              t.jsxIdentifier('Item')
            );

            openingElement.attributes = newAttributes;
          }
        }

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
      const newSpecifiers: t.ImportSpecifier[] = [];
      componentReplaceRules.forEach(rule => {
        if (!importedComponents.has(rule.to)) {
          newSpecifiers.push(t.importSpecifier(t.identifier(rule.to), t.identifier(rule.to)));
        }
      });

      if (newSpecifiers.length > 0) {
        if (antdExtImport) {
          // 如果已存在相应的导入，则添加新的 specifiers
          antdExtImport.node.specifiers.push(...newSpecifiers);
        } else {
          // 如果不存在，则创建新的导入声明
          const newImport = t.importDeclaration(newSpecifiers, t.stringLiteral(componentReplaceRules[0].importFrom));
          path.node.body.unshift(newImport);
        }
      }
    },
  });

  const output = generate(ast, { retainLines: true, concise: false });
  const formattedCode = await prettier.format(output.code, {
    parser: 'typescript',
    singleQuote: false, // 使用双引号
    trailingComma: 'es5',
    bracketSpacing: true,
    jsxBracketSameLine: true, // 闭合标签放在新的一行
    semi: true,
    printWidth: 100,
  });

  return formattedCode;
}

export function deactivate() {}

