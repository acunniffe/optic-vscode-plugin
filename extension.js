'use strict'
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode')
const EditorConnection = require('optic-editor-sdk/lib/EditorConnection').EditorConnection
const editorConnection = EditorConnection({name: 'vscode'})
const checkForSearch = require('optic-editor-sdk/lib/EditorConnection').checkForSearch

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
	}
}

// this method is called when your extension is activated, which package.json defines as when vs code loads
function activate(context) {
	vscode.workspace.onDidChangeTextDocument((event) => {
		if(!event.contentChanges.length) {
			return
		}
		const document = event.document
		const file = document.uri.path
		const contents = document.getText()
		const range = event.contentChanges[0].range
		const start = helpers.bufferedRangeToRange(range.start, document)
		const end = helpers.bufferedRangeToRange(range.end, document)
		
		const line = helpers.getLineText(range.start, document)
		const startInLine = range.start.character
		const endInline = (range.end.line !== range.start.line) ? line.length - 1 : range.end.character
		const searchCheck = checkForSearch(line, startInLine, endInline)

		try {
			if (searchCheck.isSearch) {
				editorConnection.actions.search(file, start, end, searchCheck.query, contents)
			} else {
				editorConnection.actions.context(file, start, end, contents)
			}

		} catch (e) {
			console.error(e)
		}
	})
	
	
	vscode.window.onDidChangeTextEditorSelection((event)=> {
		const document = event.textEditor.document
		const file = document.uri.path
		const contents = document.getText()
		const range = event.selections[0]
		const start = helpers.bufferedRangeToRange(range.start, document)
		const end = helpers.bufferedRangeToRange(range.end, document)
		
		const line = helpers.getLineText(range.start, document)
		const startInLine = range.start.character
		const endInline = (range.end.line !== range.start.line) ? line.length - 1 : range.end.character
		const searchCheck = checkForSearch(line, startInLine, endInline)

		try {
			if (!searchCheck.isSearch) {
				editorConnection.actions.context(file, start, end, contents)
			}
		} catch (e) {
			console.error(e)
		}

	})

	/* 
	//VSCode actually automatically updates the text editor as Optic saves the updates to disk
	//So no need for the below code.  Leaving in in case it is needed later.
	editorConnection.onFilesUpdated((msg)=> {
		const fileNames = Object.keys(msg.updates)

		fileNames.forEach((file)=> {
			vscode.workspace.openTextDocument(file).then((document)=> {
				let fullText = document.getText()
				let range = new vscode.Range(document.positionAt(0), document.positionAt(fullText.length))
				let edit = new vscode.WorkspaceEdit()
				edit.replace(vscode.Uri.file(file), range, msg.updates[file])
				vscode.workspace.applyEdit(edit)
			})
		})
	})
	*/
}

exports.activate = activate

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;