'use strict'
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode')
const EditorConnection = require('optic-editor-sdk/lib/EditorConnection').EditorConnection
let editorConnection = EditorConnection({name: 'vscode', autorefreshes: true})
const exec = require('child_process').exec
// const checkForSearch = require('optic-editor-sdk/lib/EditorConnection').checkForSearch
const debugMode = false;
let preventChangeEvent = false; //Debounce for cursor change event after adding a character

const helpers = {
	getLineText:(line, document) => {
		let lineAt = document.lineAt(line)
		let text = document.getText(lineAt.range)
		
		return text
	},
	bufferedRangeToRange:(bufferedRange, document) => {
		let lines = []
		for (let line = 0; line < bufferedRange.line; line++) {
			let text = helpers.getLineText(line, document)
			lines.push(text)
		}

		return lines.join('').length + bufferedRange.line + bufferedRange.character
	},
	log:(...args) => {
		if(debugMode) {
			console.log.apply(console, args);
		}
	},
	checkForSearch: function(line, start, end) {
		//Modified from EditorConnection.js to work with VS Code
		//When backspacing, start and end values are different so don't bother checking
		let searchRegex = /^[\s]*\/\/\/[\s]*(.+)/;
		let match = searchRegex.exec(line);

		let isSearch = match !== null;
		return {
			isSearch: isSearch,
			query: match !== null ? match[1].trim() : undefined
		};
	},
	onFilesUpdatedHandler: function(msg) {
		const fileNames = Object.keys(msg.updates)
		fileNames.forEach((file)=> {
			vscode.workspace.openTextDocument(file).then((document)=> {
				let fullText = document.getText()
				let range = new vscode.Range(document.positionAt(0), document.positionAt(fullText.length))
				let edit = new vscode.WorkspaceEdit()
				edit.replace(vscode.Uri.file(file), range, msg.updates[file])
				vscode.workspace.applyEdit(edit)
				helpers.log('Saving ', file);
				document.save().then((result) => {
					helpers.log('Document save result: ', result)
				},
				(reason) => {
					helpers.log('Document save rejected', reason)
				})
			})
		})
	},
	reconnectEditorConnection: function() {
		//Used for when socket loses connection (VS Code seems to disconnect after app is in background for a minute or two)
		editorConnection = EditorConnection({name: 'vscode', autorefreshes: true})
		editorConnection.onFilesUpdated(helpers.onFilesUpdatedHandler)
	}
}

// this method is called when your extension is activated, which package.json defines as when vs code loads
function activate(context) {
	exec('open /Applications/Optic.app')
	vscode.workspace.onDidChangeTextDocument((event) => {
		preventChangeEvent = true;

		if(!event.contentChanges.length) {
			return
		}
		const document = event.document
		const file = document.uri.path
		const contents = document.getText()
		const contentChange = event.contentChanges[0]
		const range = contentChange.range
		const start = helpers.bufferedRangeToRange(range.start, document)
		const end = helpers.bufferedRangeToRange(range.end, document)
		
		const line = helpers.getLineText(range.start, document)
		const startInLine = range.start.character
		const endInline = (range.end.line !== range.start.line) ? line.length - 1 : range.end.character
		const searchCheck = helpers.checkForSearch(line, startInLine, endInline)

		try {
			if (searchCheck.isSearch) {
				helpers.log('Text change: Send search to optic', searchCheck.query);
				editorConnection.actions.search(file, start, end, searchCheck.query, contents)
			} else {
				helpers.log('Text change: Send context to optic', contentChange.text);
				editorConnection.actions.context(file, start, end, contents)
			}

		} catch (e) {
			console.error(e)
			helpers.reconnectEditorConnection();
		}
		
		setTimeout(() => {
			preventChangeEvent = false;
		}, 300);

	})
	
	
	vscode.window.onDidChangeTextEditorSelection((event)=> {
		if(preventChangeEvent) return;

		const document = event.textEditor.document
		const file = document.uri.path
		const contents = document.getText()
		const range = event.selections[0]
		const start = helpers.bufferedRangeToRange(range.start, document)
		const end = helpers.bufferedRangeToRange(range.end, document)
		
		const line = helpers.getLineText(range.start, document)
		const startInLine = range.start.character
		const endInline = (range.end.line !== range.start.line) ? line.length - 1 : range.end.character
		const searchCheck = helpers.checkForSearch(line, startInLine, endInline)

		try {
			if (!searchCheck.isSearch) {
				helpers.log('\nSelection change: Send context to optic', document.getText(range));
				editorConnection.actions.context(file, start, end, contents)
			}
		} catch (e) {
			console.error(e)
			helpers.reconnectEditorConnection();
		}

	})

	editorConnection.onFilesUpdated(helpers.onFilesUpdatedHandler)
	
}

exports.activate = activate

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;