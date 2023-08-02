import { CompletionItem, CompletionItemKind, CompletionItemTag, InsertTextFormat, MarkupKind } from 'vscode-languageserver';
import { ActiveNamespace } from '../DocumentSettings';
import { Attribute, Component } from '../model/JsfLibraryDefinitions';

export function getJsfNsPrefixCompletion(namespace: ActiveNamespace): CompletionItem {
    const documentation = [
        `${namespace.xmlNs?.description ?? ""}`,
        `* **URL:** ${namespace.xmlNs?.url ?? ""}`
    ].join("\n")
    return {
        label: namespace.nsPrefix,
        kind: CompletionItemKind.Property,
        documentation: {
            kind: MarkupKind.Markdown,
            value: documentation
        },
        filterText: namespace.nsPrefix,
        insertText: `${namespace.nsPrefix}:`,
        detail: `XMLNS: ${namespace.xmlNs!.description}:${namespace.xmlNs!.version ?? ""}`
    } as CompletionItem;
}

export function getJsfElementCompletion(namespace: ActiveNamespace, component: Component): CompletionItem {
    return {
        label: component.name,
        kind: CompletionItemKind.Property,
        tags: getTags(component.deprecated),
        documentation: component.description,
        filterText: component.name,
        insertText: `${component.name} \${1:${getRequiredAttributes(component)}}`,
        insertTextFormat: InsertTextFormat.Snippet,
        detail: `XMLNS: ${namespace.xmlNs!.description}:${namespace.xmlNs!.version ?? ""}`
    } as CompletionItem;
}

export function getJsfAttributeCompletion(namespace: ActiveNamespace, attribute: Attribute): CompletionItem {
    const documentation = [
        `${attribute.description}`,
        `* **Required:** ${attribute.required}`,
        `* **Type:** ${attribute.type}`].join("\n");
    return {
        label: attribute.name,
        kind: CompletionItemKind.Enum,
        tags: getTags(attribute.deprecated),
        documentation: {
            kind: MarkupKind.Markdown,
            value: documentation
        },
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

function getTags(deprecated: boolean): CompletionItemTag[] | null {
    return deprecated
        ? [CompletionItemTag.Deprecated]
        : null;
}
