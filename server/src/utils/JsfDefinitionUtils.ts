import { X2jOptions, XMLParser, XMLValidator } from 'fast-xml-parser';
import * as fs from 'fs';
import { DocumentUri, TextDocument } from 'vscode-languageserver-textdocument';
import { Attribute, Component } from '../model/JsfLibraryDefinitions';
import { JsfLibrary } from '../types/JsfFramework';
import path = require('path');
import { getXmlNamespaces } from './DocumentUtils';

const filePrefix = "file://";
const tagLibExtension = ".taglib.xml";
const xhtmlExtension = ".xhtml";
const attributePrefix = "@_";

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
    const compositeLibraryName = faceletTaglib['composite-library-name'] as string;

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
                attributes:   attributes
            } as Component
        }) ?? [];
    const library = {
        url: namespace,
        framework: framework,
        description: "Locally defined JSF Tag Library",
        definitionUri: documentUri,
        compositeLibraryName: compositeLibraryName,
        components: components
    } as JsfLibrary;
    if (compositeLibraryName) {
        const components = findCompositeComponets(documentUri, compositeLibraryName);
        library.components = components;
    }

    return library;
}

export function findCompositeComponets(tagLibXmlUri: DocumentUri, compositeLibraryName: string): Component[] {
    const componentDir = path.join(
        tagLibXmlUri.substring(filePrefix.length, tagLibXmlUri.lastIndexOf("/")),
        "resources",
        compositeLibraryName);
    return fs.readdirSync(componentDir)
        .filter(filePath => filePath.endsWith(xhtmlExtension))
        .map(filePath => filePrefix + path.join(componentDir, filePath))
        .map(parseComponentXml)
        .filter(component => component) as Component[];
}

function parseComponentXml(componentUri: DocumentUri): Component | undefined {
    if (!componentUri.startsWith(filePrefix)) {
        console.error(`Invalid document uri: ${componentUri}`);
        return;
    }

    const document = fs.readFileSync(componentUri.substring(filePrefix.length), "utf8");
    const componentName = componentUri.substring(componentUri.lastIndexOf("/") + 1, componentUri.indexOf(xhtmlExtension));
    const activeNamespaces = getXmlNamespaces(TextDocument.create(componentUri, "html", 1, document));

    const urlHtml = [
        "http://java.sun.com/jsf/html",
        "http://xmlns.jcp.org/jsf/html",
        "jakarta.faces.html"];

    const hPrefix = activeNamespaces
        .find(namespace => urlHtml.includes(namespace.url))
        ?.nsPrefix
        ?? "h";

    const urlCc = [
        "http://java.sun.com/jsf/composite",
        "http://xmlns.jcp.org/jsf/composite",
        "jakarta.faces.composite"];

    const ccPrefix = activeNamespaces
        .find(namespace => urlCc.includes(namespace.url))
        ?.nsPrefix
        ?? "cc";
    const htmlTag = "html";
    const bodyTag = `${hPrefix}:body`;
    const interfaceTag = `${ccPrefix}:interface`;
    const attributeTag = `${ccPrefix}:attribute`;

    const componentArrayElements = [
        [htmlTag, interfaceTag, attributeTag].join("."),
        [htmlTag, bodyTag, interfaceTag, attributeTag].join(".")
    ];
    
    const componentOptions = {
        ignoreAttributes: false,
        isArray: (name, jpath, isLeafNode, isAttribute) => {
            if (componentArrayElements.indexOf(jpath) !== -1) return true;
        }
    } as X2jOptions;

    const parser = new XMLParser(componentOptions);
    const validation = XMLValidator.validate(document);
    if (validation !== true) {
        console.error(`TagLib validation error: ${validation}`);
        return;
    }

    const xmlDoc = parser.parse(document);

    let rootElement = xmlDoc[htmlTag];
    if (!rootElement) {
        console.error(`Missing '${htmlTag}' root tag: ${rootElement}`);
        return;
    } else if (rootElement[bodyTag]) {
        rootElement = rootElement[bodyTag];
    }

    const attributes = (rootElement[interfaceTag][attributeTag] as any[])
        ?.map(attribute => {
            const name = attribute[attributePrefix + "name"];
            const required = attribute[attributePrefix + "reqired"] as boolean ?? false;
            const defaultValue = attribute[attributePrefix + "default"] as string;
            const methodSignature = attribute[attributePrefix + "method-signature"] as string;
            const type = attribute[attributePrefix + "type"] as string ?? "java.lang.Object";
            const description = attribute[attributePrefix + "shortDescription"] as string ?? "";
            const deprecated = attribute[attributePrefix + "deprecated"] as boolean ?? false;

            return {
                name: name,
                required: required,
                defaultValue: defaultValue,
                methodSignature: methodSignature,
                type: type,
                description: description,
                deprecated: deprecated
            } as Attribute
        }) ?? [];
    return {
        name: componentName,
        description: "",
        deprecated: false,
        handlerClass: "",
        definitionUri: componentUri,
        attributes: attributes
    };
}