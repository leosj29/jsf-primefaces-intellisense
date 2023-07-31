import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, Range } from 'vscode-languageserver';
import { ActiveNamespace } from '../DocumentSettings';

/**
 * Extracts XML namespaces configured in the HTML element.
 * @param textDocument
 * @returns list of XML namespaces extracted from the HTML element.
 */
export function getXmlNamespaces(textDocument: TextDocument): ActiveNamespace[] {
    const htmlLoc = textDocument.getText().indexOf("<html");
    if (htmlLoc < 0) {
        return [];
    }
    const htmlRang = Range.create(
        textDocument.positionAt(htmlLoc),
        textDocument.positionAt(htmlLoc + textDocument.getText().substring(htmlLoc).indexOf(">")));
    return textDocument.getText(htmlRang)
        .match(/xmlns:(.*?)\s*=\s*"(.*?)"/g)
        ?.map(en => {
            const colIndex = en.indexOf(":");
            const eqIndex = en.indexOf("=");
            const nsPrefix = en.substring(colIndex + 1, eqIndex).trim();
            const url = en.substring(eqIndex + 1).replaceAll('"', '').trim();
            return {nsPrefix: nsPrefix, url: url} as ActiveNamespace})
        ?? [];
}

/**
 * Gets the name of the component, the attribute and 
 * possible attributes already used in it.
 * 
 * @param document 
 * @param position 
 * @returns 
 */
export function getComponentInformation(document: TextDocument, position: Position): Map<string, string> {
    const componentInfo = new Map<string, string>();
    const start: Position = Position.create(0, 0);
    const range: Range = Range.create(start, position);
    const allText: string = document.getText(range);
    let lastC: number = allText.lastIndexOf('<');
    let text: string = allText.substring(lastC);

    let blank_ = text.indexOf(" ");
    let break_ = text.indexOf("\n");
    let delimiter: number = -1;
    if (blank_ < break_) {
        delimiter = blank_ > -1 ? blank_ : break_;
    }
    else if (break_ < blank_) {
        delimiter = break_ > -1 ? break_ : blank_;
    }
    text = text.substring(0, delimiter);
    text = text.replace("<", "");
    if (text.includes(":")) {
        let div = text.split(':');
        componentInfo.set("xmlnsPrefix", div[0]);
        componentInfo.set("componentName", div[1].trim());

        lastC = allText.lastIndexOf('<' + div[0] + ':' + div[1]);
        text = allText.substring(lastC);

        if (inAttribute(text)) {
            return new Map<string, string>();
        }
        if (text.includes('>')) {
            return new Map<string, string>();
        }

        const attributes = text.match(/(\w+=(["'])([^"|']*)(["']))/g)
            ?.map(item => item.split('=')[0])
            .filter(item => item.length > 0)
            .join("|") ?? '';
        componentInfo.set("attributes", attributes);
    }
    return componentInfo;
}

/**
 * Determines if I am positioned on an attribute.
 * 
 * @param text 
 * @returns 
 */
export function inAttribute(text: string): boolean {
    let character: string = '';
    let index: number = text.lastIndexOf('"');
    if (index === -1) {
        index = text.lastIndexOf("'");
    }
    if (index !== -1) {
        character = text.substring(index - 1, index);
        if (character === '=') {
            return true;
        }
    }
    return false;
}