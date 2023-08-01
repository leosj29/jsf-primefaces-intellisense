import { Hover, MarkupKind } from 'vscode-languageserver';
import { Attribute, Component } from '../model/JsfLibraryDefinitions';
import { JsfLibrary } from '../types/JsfFramework';

export function getJsfNsPrefixHover(xmlNs: JsfLibrary): Hover {
    const documentation = [
        `**${[xmlNs.framework, xmlNs.extension].filter(Boolean).join(" - ")}**\n`,
        `${xmlNs.description}`,
        `* **URL:** ${xmlNs.url}`
    ].join('\n');
    return {
        contents: {
            kind: MarkupKind.Markdown,
            value: documentation
        }
    } as Hover;
}


export function getJsfElementHover(component: Component): Hover {
    const documentation = [
        `**${component.name}**\n`,
        `${component.description}`
    ].join('\n');
    return {
        contents: {
            kind: MarkupKind.Markdown,
            value: documentation
        }
    } as Hover;
}

export function getJsfAttributeHover(attribute: Attribute): Hover {
    const documentation = [
        `**${attribute.name}**\n`,
        `${attribute.description}`,
        `* **Required:** ${attribute.required}`,
        `* **Type:** ${attribute.type}`
    ].join('\n');

    return {
        contents: {
            kind: MarkupKind.Markdown,
            value: documentation
        }
    } as Hover;
}
