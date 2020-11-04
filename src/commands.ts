import { DiffieHellman } from 'crypto';
import * as vscode from 'vscode';

enum FileType
{
    H,
    HPP,
    UNKNOWN
}

export async function hello(args: any[]) : Promise<void>
{
    vscode.window.showInformationMessage('Hello World from auto-header!');
}

function getFileExt(editor : vscode.TextEditor) : FileType
{
    let extRegex = new RegExp("(\\.[a-zA-Z]+)");
    let regRes = extRegex.exec(editor.document.fileName);
    let ret = FileType.UNKNOWN;
    if(regRes != null)
    {
        let fileExt = regRes[0].substring(1).toLowerCase();
        if(fileExt === "hpp")
            ret = FileType.HPP
        else if(fileExt === "h")
            ret = FileType.H

    }
    return ret;
}

function getFileName(editor : vscode.TextEditor, type : FileType)
{
    let ret = null
    let fileName = null
    let str = editor.document.fileName;
    let winPath = str.split('\\').pop();
    if (winPath != undefined)
    {
        fileName = winPath.split('/').pop();
    } else {
        fileName = null;
    }

    if (fileName != null || fileName != undefined)
    {
        ret = fileName.split('.').slice(0, -1).join('.');
    } else if (fileName == undefined)
    {
        ret = null
    }
    

    return ret;
}

function camelize(str : string) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
}

class HeaderWriter
{
    type : FileType;
    filename : string;
    document : vscode.TextDocument;
    define : string;

    constructor(type : FileType, filename : string, document : vscode.TextDocument)
    {
        this.type = type;
        this.filename = filename;
        this.document = document;
        this.createHeader = this.createHeader.bind(this);
        this.createFooter = this.createFooter.bind(this);
        this.write = this.write.bind(this);
        this.define = "";
    }

    createHeader()
    {
        let ret = [];
        this.define = this.filename.toUpperCase() + "_";

        if(this.type == FileType.H)
        {
            this.define = this.define + "H"
        } else if (this.type == FileType.HPP)
        {
            this.define = this.define + "HPP"
        }

        ret.push("#ifndef " + this.define + "\n");
        ret.push("#define " + this.define + "\n");


        if(this.type == FileType.H)
        {
            ret.push("#ifdef __cplusplus"  + "\n")
            ret.push("\textern \"C\" {"  + "\n")
            ret.push("#endif //__cplusplus"  + "\n")
            ret.push("\n");
        } else if (this.type == FileType.HPP)
        {
            let classExist = this.document.getText().includes("class")
            if(!classExist)
            {
                let className = camelize(this.filename)
                className = className.charAt(0).toUpperCase() + className.slice(1);
                ret.push("\n");
                ret.push("class " + className  + "\n")
                ret.push("{" + "\n" + "\n")
                ret.push("} //" + className + "\n")
            }
        }

        return ret;
    }

    createFooter()
    {
        let ret = [];

        ret.push("\n");

        if(this.type == FileType.H)
        {
            ret.push("#ifdef __cplusplus"  + "\n")
            ret.push("}"  + "\n")
            ret.push("#endif //__cplusplus" + "\n")
        }

        ret.push("#endif //" + this.define  + "\n");

        return ret;
    }

    write(edit:vscode.TextEditorEdit) 
    {
        const bottomLine = this.document.lineAt(this.document.lineCount - 1).text;

        if (bottomLine.length !== 0) {
            edit.insert(new vscode.Position(this.document.lineCount, 0), "\n");
        }

        let header = this.createHeader();
        let footer = this.createFooter();

        let insertLine = 0;

        for (let item of header)
        {
            let pos = new vscode.Position(insertLine, 0)
            edit.insert(pos, item)
        }

        let endLine = this.document.lineCount;

        for (let item of footer)
        {
            let pos = new vscode.Position(endLine, 0)
            edit.insert(pos, item)
        }
    }
}

export async function insertHeader(extEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, args: any[]) 
{
    let type = getFileExt(extEditor);
    if (type != FileType.UNKNOWN)
    {
        let fn = getFileName(extEditor, type);
        if (fn != null)
        {   
            let writer = new HeaderWriter(type, fn, extEditor.document);
            extEditor.edit(writer.write);
        }
    } else {
        vscode.window.showErrorMessage('Invalid file type, cannot insert header');
    }
    
}