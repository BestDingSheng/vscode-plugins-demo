import * as vscode from 'vscode';
import { parse } from '@babel/parser';
import generate from '@babel/generator';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as prettier from 'prettier';

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

  let hasInputOutLineExt = false;
  let hasSelectOutLineExt = false;
  let antdExtImport: NodePath<t.ImportDeclaration> | null = null;

  traverse(ast, {
    ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
      if (path.node.source.value === '@m-tools/antd-ext') {
        antdExtImport = path;
        const importedComponents = path.node.specifiers.map(spec => spec.local.name);
        hasInputOutLineExt = importedComponents.includes('InputOutLineExt');
        hasSelectOutLineExt = importedComponents.includes('SelectOutLineExt');
      }
    },
    JSXElement(path: NodePath<t.JSXElement>) {
      const openingElement = path.node.openingElement;

      if (t.isJSXIdentifier(openingElement.name, { name: 'FormItemExt' })) {
        const attributes = openingElement.attributes as t.JSXAttribute[];
        const newAttributes = attributes.filter(attr => !t.isJSXIdentifier(attr.name, { name: 'label' }));
        const nameAttr = newAttributes.find(attr => t.isJSXIdentifier(attr.name, { name: 'name' }));

        const childElement = path.node.children.find(child =>
          t.isJSXElement(child) &&
          ['Input', 'Select'].includes((child.openingElement.name as t.JSXIdentifier).name)
        ) as t.JSXElement;

        if (childElement) {
          const childName = (childElement.openingElement.name as t.JSXIdentifier).name;
          const newChildName = childName === 'Input' ? 'InputOutLineExt' : 'SelectOutLineExt';

          childElement.openingElement.name = t.jsxIdentifier(newChildName);
          if (childElement.closingElement) {
            childElement.closingElement.name = t.jsxIdentifier(newChildName);
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
          newSpecifiers.push(t.importSpecifier(t.identifier('InputOutLineExt'), t.identifier('InputOutLineExt')));
        }
        if (!hasSelectOutLineExt) {
          newSpecifiers.push(t.importSpecifier(t.identifier('SelectOutLineExt'), t.identifier('SelectOutLineExt')));
        }

        if (antdExtImport) {
          // 如果已存在 @m-tools/antd-ext 的导入，则添加新的 specifiers
          antdExtImport.node.specifiers.push(...newSpecifiers);
        } else {
          // 如果不存在，则创建新的导入声明
          const newImport = t.importDeclaration(newSpecifiers, t.stringLiteral('@m-tools/antd-ext'));
          path.node.body.unshift(newImport);
        }
      }
    },
  });

  const output = generate(ast, { retainLines: true, concise: false });
  const formattedCode = await prettier.format(output.code, {
    parser: 'typescript',
    singleQuote: true,
    trailingComma: 'es5',
    bracketSpacing: true,
    jsxBracketSameLine: false,
    semi: true,
    printWidth: 100,
  });

  return formattedCode;
}

export function deactivate() {}

// Format the code using Prettier
const prettierConfig = {
  parser: 'typescript',
  singleQuote: true,
//   trailingComma: 'es5',
  bracketSpacing: true,
  jsxBracketSameLine: false,
  semi: true,
  printWidth: 100,
};

prettier.format(replaceAndFormatComponents.toString(), prettierConfig).then(formattedCode => {
  console.log('Formatted code:');
  console.log(formattedCode);
}).catch(error => {
  console.error('Error formatting code:', error);
});

