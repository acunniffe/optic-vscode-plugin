'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const EditorConnection = require('optic-editor-sdk/lib/EditorConnection').EditorConnection;
const checkForSearch = require('optic-editor-sdk/lib/EditorConnection').checkForSearch;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "optic" is now active!');
	
	const editorConnection = EditorConnection({name: 'vscode'});

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello World!');
		console.log(editorConnection);
		let editor = vscode.window.activeTextEditor;
		if(!editor) {
			return; // No open text editor found
		}

		let selection = editor.selection;
		console.log(selection);
		let text = editor.document.getText(selection);

		vscode.window.showInformationMessage('Selected chars:' + text)
	});
	
	editorConnection.onFilesUpdated((msg)=> {
		console.log('file updates', msg)
		const files = Object.keys(msg.updates)
  
		files.forEach(i=> {
		  vscode.workspace.openTextDocument(i).then((document)=> {
			console.log(msg.updates[i], document)
			let fullText = document.getText();
			let range = new vscode.Range(document.positionAt(0), document.positionAt(fullText.length - 1));
			vscode.TextEdit.replace(range, msg.updates[i]);
		  })
		})
  
		// //refresh all
		// atom.workspace.getTextEditors().forEach(i=> {
		//   i.getBuffer().reload()
		// })
  
	});
	function getLineText(line, editor) {
		let lineAt = editor.lineAt(line);
		let text = editor.getText(lineAt.range);

		return text;
	}
	function bufferedRangeToRange(bufferedRange, editor) {
		let lines = [];
		for (let line = 0; line < bufferedRange.line; line++) {
			let text = getLineText(line, editor);
			lines.push(text);
		}
	  
		return lines.join('').length + bufferedRange.line + bufferedRange.character;
	  }

	vscode.workspace.onDidChangeTextDocument((event) => {
		if(!event.contentChanges.length) {
			return;
		}
		const editor = event.document;
		const file = editor.uri.path;
		const contents = editor.getText();
		const range = event.contentChanges[0].range;
		const start = bufferedRangeToRange(range.start, editor);
		const end = bufferedRangeToRange(range.end, editor);

		const line = getLineText(range.start, editor);
		const startInLine = range.start.character
		const endInline = (range.end.line !== range.start.line) ? line.length - 1 : range.end.character
		const searchCheck = checkForSearch(line, startInLine, endInline)
		console.log(editor, event.contentChanges);

		try {
			if (searchCheck.isSearch) {
				editorConnection.actions.search(file, start, end, searchCheck.query, contents)
			} else {
				editorConnection.actions.context(file, start, end, contents)
			}

		} catch (e) {
			console.error(e)
		}
	});

	
	vscode.window.onDidChangeTextEditorSelection((event)=> {
		//Some code duplication of text change event
		const editor = event.textEditor.document;
		const file = editor.uri.path;
		const contents = editor.getText();
		const range = event.selections[0];
		const start = bufferedRangeToRange(range.start, editor);
		const end = bufferedRangeToRange(range.end, editor);

		const line = getLineText(range.start, editor);
		const startInLine = range.start.character
		const endInline = (range.end.line !== range.start.line) ? line.length - 1 : range.end.character
		const searchCheck = checkForSearch(line, startInLine, endInline)

		try {
			if (!searchCheck.isSearch) {
				// console.log(file, start, end, contents);
				editorConnection.actions.context(file, start, end, contents)
			}
		} catch (e) {
			console.error(e)
		}

	})

	

	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;