import * as monaco from 'monaco-editor';
import * as ts from 'typescript'; // TypeScript compiler API
declare global {
    interface Window {
        MonacoEnvironment?: monaco.Environment;
    }
}
// Define the worker URL resolver
// Define the worker URL resolver for CommonJS
window.MonacoEnvironment = {
    getWorker: function (workerId: string, label: string) {
        switch (label) {
            case 'typescript':
            case 'javascript':
                return new Worker(require('monaco-editor/esm/vs/language/typescript/ts.worker.js'));
            case 'css':
                return new Worker(require('monaco-editor/esm/vs/language/css/css.worker.js'));
            case 'html':
                return new Worker(require('monaco-editor/esm/vs/language/html/html.worker.js'));
            case 'json':
                return new Worker(require('monaco-editor/esm/vs/language/json/json.worker.js'));
            default:
                return new Worker(require('monaco-editor/esm/vs/editor/editor.worker.js'));
        }
    },
};
// Reference to VS Code's API
declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

let editor: monaco.editor.IStandaloneCodeEditor | undefined;
let decorationsCollection: monaco.editor.IEditorDecorationsCollection;


// Listen for messages from the extension
window.addEventListener('message', (event) => {
    const { command, content, language } = event.data;

    if (command === 'load') {
        setupEditor(content, language);
    }
});

function findCommonBlockNode(
    sourceFile: ts.SourceFile,
    selectedRange: monaco.IRange
): ts.Node | null {
    let commonBlock: ts.Node | null = null;

    function visit(node: ts.Node) {
        const nodeStart = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const nodeEnd = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

        // Convert Monaco's one-based columns to zero-based offsets
        const selectionStart = {
            line: selectedRange.startLineNumber - 1, // Convert to zero-based line
            character: selectedRange.startColumn - 1, // Convert to zero-based column
        };
        const selectionEnd = {
            line: selectedRange.endLineNumber - 1, // Convert to zero-based line
            character: selectedRange.endColumn - 1, // Convert to zero-based column
        };

        // Check if the node fully contains the selected range
        if (
            (nodeStart.line < selectionStart.line ||
                (nodeStart.line === selectionStart.line &&
                    nodeStart.character <= selectionStart.character)) &&
            (nodeEnd.line > selectionEnd.line ||
                (nodeEnd.line === selectionEnd.line &&
                    nodeEnd.character >= selectionEnd.character))
        ) {
            // Check if the node is a block-like construct
            if (
                node.kind === ts.SyntaxKind.Block ||
                node.kind === ts.SyntaxKind.ModuleBlock ||
                node.kind === ts.SyntaxKind.CaseBlock
            ) {
                commonBlock = node.parent; // Update the common block node
            }

            // Continue traversing child nodes
            ts.forEachChild(node, visit);
        }
    }

    ts.forEachChild(sourceFile, visit);
    if (commonBlock === null) return sourceFile;
    return commonBlock;
}

/**
 * Adds a button above the common block node without blocking the text.
 * @param editor - The Monaco editor instance.
 * @param commonNode - The common block node.
 * @param sourceFile - The source file (AST root).
 */
function showButtonAboveNodeWithoutBlockingText(
    editor: monaco.editor.IStandaloneCodeEditor,
    commonNode: ts.Node,
    sourceFile: ts.SourceFile
) {
    const model = editor.getModel();
    if (!model) return;

    // Get the starting position of the common block node
    const start = sourceFile.getLineAndCharacterOfPosition(commonNode.getStart());
    const lineNumber = start.line + 1; // Convert to Monaco's one-based line number


    // Add a decoration to create space for the button
    decorationsCollection.append([
        {
            range: new monaco.Range(lineNumber, 1, lineNumber, 1), // Decoration on the specific line
            options: {
                isWholeLine: true, // Ensure the decoration affects the entire line
                afterContentClassName: 'experiment-button-line', // Custom CSS for spacing
            },
        },
    ]);

    // Place the button dynamically
    const editorContainer = editor.getDomNode();
    if (!editorContainer) return;

    // Remove any existing button
    const existingButton = editorContainer.querySelector('.experiment-button');
    if (existingButton) existingButton.remove();

    // Create the button
    const button = document.createElement('button');
    button.className = 'experiment-button';
    button.textContent = 'Start Experiments';
    button.style.position = 'absolute';
    button.style.left = '10px'; // Fixed left position (customizable)
    button.style.padding = '5px 10px';
    button.style.backgroundColor = '#007acc';
    button.style.color = '#ffffff';
    button.style.border = 'none';
    button.style.borderRadius = '3px';
    button.style.cursor = 'pointer';
    button.style.zIndex = '1000';

    // Get the position of the line in the editor
    const topPosition = editor.getTopForLineNumber(lineNumber) - 25; // Place above the line
    button.style.top = `${topPosition}px`;

    // Append the button to the editor container
    editorContainer.appendChild(button);

    // Add a click event listener
    button.addEventListener('click', () => {
        console.log('Start Experiments button clicked!');
        vscode.postMessage({
            command: 'startExperiment',
            nodeText: commonNode.getText(sourceFile),
        });
    });
}


/**
 * Sets up the Monaco editor with the provided content and language.
 * @param content The content to display in the editor.
 * @param language The language to set in the editor.
 */
function setupEditor(content: string, language: string) {
    const editorContainer = document.getElementById('editor') as HTMLElement;

    // Create the Monaco editor
    editor = monaco.editor.create(editorContainer, {
        value: content,
        language: language,
        theme: 'vs-dark',
        readOnly: false,
        automaticLayout: true,
    });

    let astTree = createASTTree(content);

    // Listen for selection changes
    editor.onDidChangeCursorSelection((e) => {
        if (!editor) return;
        const selection = e.selection;
        if (!selection.isEmpty() && (language === 'typescript' || language === 'javascript')) {
            const selectedRange = new monaco.Range(
                selection.startLineNumber,
                selection.startColumn,
                selection.endLineNumber,
                selection.endColumn
            );

            if (astTree) {
                const commonNode = findCommonBlockNode(astTree, selectedRange);
                console.log('Common Node:', ts.SyntaxKind[commonNode?.kind!]);
                if (commonNode) {
                    console.log('Common Node Text:', commonNode.getText(astTree));
                    showButtonAboveNodeWithoutBlockingText(editor, commonNode, astTree);
                }
            }
        }
    });
    decorationsCollection = editor.createDecorationsCollection([]);
    // Listen for content changes
    editor.onDidChangeModelContent(() => {
        if (!editor) {
            return;
        }
        const newContent = editor.getValue();
        astTree = createASTTree(newContent);
        vscode.postMessage({
            command: 'save',
            content: newContent,
        });
    });
}
/**
 * Creates an AST tree from the given file content.
 * @param fileContent - The content of the file.
 */
function createASTTree(fileContent: string) {
    try {
        const sourceFile = ts.createSourceFile(
            'temp',
            fileContent,
            ts.ScriptTarget.ESNext,
            true,
            ts.ScriptKind.TS
        );

        return sourceFile;
    } catch (error) {
        console.error('Error parsing AST:', error);
    }
}