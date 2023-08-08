import { Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import DocumentSettings, { ActiveNamespace } from '../DocumentSettings';
import { substringAfterLast, substringBeforeFirst } from './StringUtils';
import { Component, Attribute } from '../model/JsfLibraryDefinitions';
import { JsfLibrary } from '../types/JsfFramework';

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


export function getAttributesInTag(document: TextDocument, position: Position): string[] {
    return getComponentInformation(document, position).get("attributes")?.split('|') ?? [];
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

/**
 * 
 * @param document Finding all text before and after selected position of tag
 * @param position 
 * @returns 
 */
export function getTagText(document: TextDocument, position: Position ): [string, string, string] {
    const [textBeforePosition, textBeforeElement] = getStartOfTagText(document, position);

    const [textAfterPosition, indexAfterElement] = substringBeforeFirst(
        document.getText(Range.create(position, Position.create(position.line, Number.MAX_VALUE))),
        " ", "=", ">", "/>", ":");
    const elementText = textBeforePosition + textAfterPosition;

    const searchRangeAfterElement = Range.create(
        Position.create(position.line, position.character + indexAfterElement),
        Position.create(position.line, Number.MAX_VALUE));
    const textAfterElement = document.getText(searchRangeAfterElement);

    return [elementText, textBeforeElement, textAfterElement];
}

/**
 * 
 * @param document Finding all text before selected position of tag
 * @param position 
 * @returns 
 */
export function getStartOfTagText(document: TextDocument, position: Position ): [string, string] {
    const [elementText, indexBeforeElement] = substringAfterLast(
        document.getText(Range.create(Position.create(position.line, 0), position)),
        "\t", " ", "\"", "<", "</", ":");

    const searchRangeBeforeElement = Range.create(
        Position.create(position.line, 0), Position.create(position.line, indexBeforeElement));
    const textBeforeElement = getTagTextBeforPosition(document, searchRangeBeforeElement);

    return [elementText, textBeforeElement];
}

/**
 * 
 * @param document 
 * @param searchRangeBeforeElement 
 * @returns Text between start of tag (closest "<") and position
 */
export function getTagTextBeforPosition(document: TextDocument, searchRangeBeforeElement: Range): string {
    let textBeforeElement = document.getText(searchRangeBeforeElement);
        // Find start of Tag
        while (textBeforeElement.lastIndexOf("<") <= -1) {
            searchRangeBeforeElement = Range.create(
                Position.create(searchRangeBeforeElement.start.line - 1, 0),
                searchRangeBeforeElement.end);
            if (searchRangeBeforeElement.start.line < 0) {
                return "";
            }
            textBeforeElement = document.getText(searchRangeBeforeElement);
        }
    return textBeforeElement;
}
