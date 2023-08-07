import { X2jOptions, XMLParser, XMLValidator } from 'fast-xml-parser';
import * as fs from 'fs';
import { DocumentUri } from 'vscode-languageserver-textdocument';
import { Attribute, Component } from '../model/JsfLibraryDefinitions';
import { JsfLibrary } from '../types/JsfFramework';

const filePrefix = "file://";
const tagLibExtension = ".taglib.xml";

const tagLibArrayElements = [
    "facelet-taglib.tag",
    "facelet-taglib.tag.attribute"
];

const tagLibOptions = {
    ignoreAttributes: false,
    isArray: (name, jpath, isLeafNode, isAttribute) => {
        if (tagLibArrayElements.indexOf(jpath) !== -1) return true;
    }
} as X2jOptions;

export function parseTagLibXml(documentUri: DocumentUri): JsfLibrary {
    if (!documentUri.startsWith(filePrefix)) {
        throw (new Error(`Invalid document uri: ${documentUri}`));
    }

    const document = fs.readFileSync(documentUri.substring(filePrefix.length), "utf8");
    const framework = documentUri.substring(documentUri.lastIndexOf("/") + 1, documentUri.indexOf(tagLibExtension));
    const parser = new XMLParser(tagLibOptions);
    const validation = XMLValidator.validate(document);
    if (validation !== true) {
        throw (new Error(`TagLib validation error: ${validation}`));
    }

    const xmlDoc = parser.parse(document);
    const faceletTaglib = xmlDoc['facelet-taglib'];

    if (!faceletTaglib) {
        throw (new Error(`Missing 'facelet-taglib' root tag: ${faceletTaglib}`));
    }

    const namespace = faceletTaglib['namespace'] as string;
    const compositeLibraryName = faceletTaglib['composite-library-name'] as string ?? namespace;

    const components = (faceletTaglib['tag'] as any[])
        ?.map(tag => {
            const description = tag['description'] as string ?? "";
            const tagName = tag['tag-name'] as string;
            const handlerClass = tag['handler-class'] as string;
            const attributes = (tag["attribute"] as any[])
                ?.map(attribute => {
                    const description = attribute['description'] as string;
                    const name = attribute['name'] as string;
                    const type = attribute['type'] as string;
                    const required = attribute['required'] as boolean ?? false;
                    return {
                        name:        name,
                        required:    required,
                        type:        type,
                        description: description,
                        deprecated:  false
                    } as Attribute
                }) ?? [];
            return {
                name:         tagName,
                description:  description,
                handlerClass: handlerClass,
                deprecated:   false,
                attribute:    attributes
            } as Component
        }) ?? [];

    return {
        url: namespace,
        framework: framework,
        description: "Locally defined JSF Tag Library",
        definitionUri: documentUri,
        compositeLibraryName: compositeLibraryName,
        components: components
    } as JsfLibrary;
}
