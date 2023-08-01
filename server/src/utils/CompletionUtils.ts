import { CompletionItem, CompletionItemKind, InsertTextFormat } from 'vscode-languageserver';
import { ActiveNamespace } from '../DocumentSettings';
import { Attribute, Component } from '../model/JsfLibraryDefinitions';

export function getJsfNsPrefixDefinition(namespace: ActiveNamespace): CompletionItem {
    return {
        label: namespace.nsPrefix,
        kind: CompletionItemKind.Property,
        documentation: namespace.xmlNs!.description,
        filterText: namespace.nsPrefix,
        insertText: `${namespace.nsPrefix}:`,
        detail: `XMLNS: ${namespace.xmlNs!.description}:${namespace.xmlNs!.version ?? ""}`
    } as CompletionItem;
}

export function getJsfElementDefinition(namespace: ActiveNamespace, component: Component): CompletionItem {
    return {
        label: component.name,
        kind: CompletionItemKind.Property,
        documentation: component.description,
        filterText: component.name,
        insertText: `${component.name} \${1:${getRequiredAttributes(component)}}`,
        insertTextFormat: InsertTextFormat.Snippet,
        detail: `XMLNS: ${namespace.xmlNs!.description}:${namespace.xmlNs!.version ?? ""}`
    } as CompletionItem;
}

export function getJsfAttributeDefinition(namespace: ActiveNamespace, attribute: Attribute): CompletionItem {
    const documentation = `${attribute.description}\n`
        + `Required: ${attribute.required}\n`
        + `Type: ${attribute.type}\n`;
    return {
        label: attribute.name,
        kind: CompletionItemKind.Enum,
        documentation: documentation,
        filterText: attribute.name,
        insertText: `${attribute.name}=""`,
        detail: `XMLNS: ${namespace.xmlNs!.description}:${namespace.xmlNs!.version ?? ""}`
    } as CompletionItem;
}

function getRequiredAttributes(component: Component): string {
    return component.attribute.filter(attribute => attribute.required)
        .map(attribute => `${attribute.name}=""`)
        .join(" ")
}
