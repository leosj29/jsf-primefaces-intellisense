import { join } from 'path';
import {
    TextDocument
} from 'vscode-languageserver-textdocument';
import {
    CompletionItem,
    DidChangeConfigurationNotification,
    Hover,
    HoverParams,
    InitializeParams,
    InitializeResult,
    NotificationType,
    Position,
    ProposedFeatures,
    Range,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    TextDocuments,
    createConnection
} from 'vscode-languageserver/node';
import DocumentSettings, { ActiveNamespace } from './DocumentSettings';
import UserSettings from './UserSettings';
import { Component, JsfLibraryDefinitions } from './model/JsfLibraryDefinitions';
import { JsfFramework, JsfLibrary } from './types/JsfFramework';
import { Resolving } from './types/Resolving';
import { getJsfAttributeDefinition, getJsfElementDefinition, getJsfNsPrefixDefinition } from './utils/CompletionUtils';
import { getComponentInformation, getXmlNamespaces } from './utils/DocumentUtils';
import { getJsfAttributeHover, getJsfElementHover, getJsfNsPrefixHover } from './utils/HooverUtils';
import { substringAfterLast, substringBeforeFirst } from './utils/StringUtils';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    hasConfigurationCapability = capabilities.workspace?.configuration ?? false;
    hasWorkspaceFolderCapability = capabilities.workspace?.workspaceFolders ?? false;
    hasDiagnosticRelatedInformationCapability = capabilities.textDocument?.publishDiagnostics?.relatedInformation ?? false;

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // Tell the client that this server supports code completion.
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['"', "'", " ", ".", ":"]
            },
            // Enables Hover Support
            hoverProvider: true
        }
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }
    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

const documentSettings: Map<string, DocumentSettings> = new Map();

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultUserSettings: UserSettings = new UserSettings();
let globalUserSettings: UserSettings = defaultUserSettings;

// Cache the settings of all open documents
const userSettings: Map<string, Thenable<UserSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        userSettings.clear();
    } else {
        globalUserSettings = <UserSettings>(change.settings["jsf-primefaces-intellisense"] || defaultUserSettings);
    }

    documents.all().forEach(document => {(async () => await findNamespaces(document))()});
});

function getUserSettings(resource: string): Thenable<UserSettings> {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalUserSettings);
    }
    let result = userSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'jsf-primefaces-intellisense'
        });
        userSettings.set(resource, result);
    }
    return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
    userSettings.delete(e.document.uri);
    documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
    findNamespaces(change.document);
});

documents.onDidOpen(change => {
    findNamespaces(change.document)
})

async function findNamespaces(textDocument: TextDocument) {
    let settings = await getUserSettings(textDocument.uri);

    const xmlNs = getXmlNamespaces(textDocument)
        .map(ans => {
            const xmlNs = getJsfLibrary(ans.url, settings);
            return {xmlNs: xmlNs, ...ans} as ActiveNamespace})
        .filter(ans => ans.xmlNs);

    documentSettings.set(textDocument.uri, {activeNamespaces: xmlNs} as DocumentSettings);
}


connection.onDidChangeWatchedFiles(change => {
    // Monitored files have change in VSCode
    connection.console.log('We received an file change event');
});

connection.onHover((hoverParams: HoverParams): Hover | undefined | null => {
        const documentUri = hoverParams.textDocument.uri;
        const hoverPosition = hoverParams.position;
        const document = documents.get(documentUri);

        if (!document) {
            return null;
        }

        const [textBeforeHover, indexBeforeElement] = substringAfterLast(
            document.getText(Range.create(Position.create(hoverPosition.line, 0), hoverPosition)),
            "\t", " ", "\"", "<", "</", ":");

        const [textAfterHover, indexAfterElement] = substringBeforeFirst(
            document.getText(Range.create(hoverPosition, Position.create(hoverPosition.line, Number.MAX_VALUE))),
            " ", "=", ">", "/>", ":");
        const hoverText = textBeforeHover + textAfterHover;

        let searchRangeAfterElement = Range.create(
            Position.create(hoverPosition.line, hoverPosition.character + indexAfterElement),
            Position.create(hoverPosition.line, Number.MAX_VALUE));
        let textAfterElement = document.getText(searchRangeAfterElement);

        let searchRangeBeforeElement = Range.create(
            Position.create(hoverPosition.line, 0), Position.create(hoverPosition.line, indexBeforeElement));
        let textBeforeElement = document.getText(searchRangeBeforeElement);
        // Find start of Tag
        while (textBeforeElement.lastIndexOf("<") <= -1) {
            searchRangeBeforeElement = Range.create(
                Position.create(searchRangeBeforeElement.start.line - 1, 0),
                Position.create(hoverPosition.line, indexBeforeElement));
            if (searchRangeBeforeElement.start.line < 0) {
                return null;
            }
            textBeforeElement = document.getText(searchRangeBeforeElement);
        }

        //Hover Element
        if (/<\/?\w+:$/.test(textBeforeElement)) {
            let nsPrefix = textBeforeElement.substring(
                textBeforeElement.lastIndexOf("<") + 1, textBeforeElement.lastIndexOf(":"));
            if (nsPrefix.startsWith("/")) {
                nsPrefix = nsPrefix.substring(1);
            }
            const component = documentSettings.get(documentUri)
                ?.activeNamespaces
                ?.find(namespace => namespace.nsPrefix === nsPrefix)
                ?.xmlNs
                ?.components
                ?.find(component => component.name === hoverText);
            return component
                ? getJsfElementHover(component)
                : null;
        //Hover Attribute
        } else if (RegExp(/\s$/).exec(textBeforeElement)) {
            const match = RegExp(/<(\w+):(\w+)\s.*/).exec(textBeforeElement);
            if (match?.length !== 3) {
                return null;
            } else {
                const attribute = documentSettings.get(documentUri)
                    ?.activeNamespaces
                    ?.find(namespace => namespace.nsPrefix === match[1])
                    ?.xmlNs
                    ?.components
                    ?.find(component => component.name === match[2])
                    ?.attribute
                    .find(attribute => attribute.name === hoverText);
                return attribute
                    ? getJsfAttributeHover(attribute)
                    : null;
            }
        //Hover XML Namespace Prefix
        } else if (/<\/?$/.test(textBeforeElement) && textAfterElement.startsWith(":")) {
            const namespace = documentSettings.get(documentUri)
                ?.activeNamespaces
                ?.find(namespace => namespace.nsPrefix === hoverText);
            return namespace?.xmlNs
                ? getJsfNsPrefixHover(namespace.xmlNs)
                : null;
        } else {
            return null;
        }
    }
);

// This handler provides the initial list of the completion items.
connection.onCompletion(
    (textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
        // The pass parameter contains the position of the text document in
        // which code complete got requested. For the example we ignore this
        // info and always provide the same completion items.
        const documentUri = textDocumentPosition.textDocument.uri;
        const position = textDocumentPosition.position;
        const document = documents.get(documentUri);
        const start = Position.create(position.line, 0);
        const range = Range.create(start, position);
        if (!document) {
            return [];
        }
        const trimmedText = document.getText(range).trimStart();
        let resolving: Resolving;
        let xmlnsPrefix: string;

        if (trimmedText.startsWith("<")) {
            let indFirstCol = trimmedText.indexOf(':');
            if (indFirstCol > -1 && indFirstCol <= trimmedText.length) {
                xmlnsPrefix = trimmedText.substring(1, indFirstCol);
                let indFirstSpace = trimmedText.indexOf(' ');
                if (indFirstSpace > -1 && indFirstSpace <= trimmedText.length) {
                    resolving = Resolving.Attribute;
                } else {
                    resolving = Resolving.Element;
                }
                
            } else {
                xmlnsPrefix = trimmedText.substring(1);
                resolving = Resolving.NsPrefix;
            }
        } else {
            resolving = Resolving.Attribute;
        }

        // Find available namespaces
        if (resolving === Resolving.NsPrefix) {
            return documentSettings.get(documentUri)?.activeNamespaces
                .map(getJsfNsPrefixDefinition) ?? [];
        }
        // Find the components
        else if (resolving === Resolving.Element) {
            const xmlns = documentSettings.get(documentUri)?.activeNamespaces.find(ans => ans.nsPrefix === xmlnsPrefix);
            return xmlns?.xmlNs?.components!
                .map(component => getJsfElementDefinition(xmlns, component)) ?? [];
        }
        // Find component attributes
        else if (resolving === Resolving.Attribute) {
            const componentInfo: Map<string, string> = getComponentInformation(document, position);
            const xmlnsPrefix = componentInfo.get("xmlnsPrefix") ?? "";
            const componentName = componentInfo.get("componentName");
            const existingAttributes = componentInfo.get("attributes")?.split('|') ?? [];

            if (xmlnsPrefix !== "") {
                const xmlns = documentSettings.get(documentUri)?.activeNamespaces.find(ans => ans.nsPrefix === xmlnsPrefix);
                return xmlns
                    ?.xmlNs
                    ?.components!
                    .find(definition => definition.name === componentName)
                    ?.attribute
                    // Removes from the collection the attributes already specified on the component
                    .filter(definition => !existingAttributes.includes(definition.name))
                    .map(definition => getJsfAttributeDefinition(xmlns, definition)) ?? [];
            }
        }
        return [];
    }
);

const jsfLibraryCache: Map<string, JsfLibrary> = new Map();

function getJsfLibrary(url: string, userSettings: UserSettings): JsfLibrary | undefined {
    if (!jsfLibraryCache.has(url)) {
        const jsfLibrary = getSupportedXmlNamespaces(userSettings, url);
        if (jsfLibrary) {
            jsfLibraryCache.set(url, jsfLibrary);
        } else {
            notify(Status.ERROR, `URL ${url} is not supported`);
            return;
        }
    }
    return loadJsfElements(jsfLibraryCache.get(url)!);
}

function loadJsfElements(jsfLibrary: JsfLibrary): JsfLibrary {
    if (!jsfLibrary.components || jsfLibrary.components.length === 0) {
        jsfLibrary.components = loadElementDefinitions(jsfLibrary);
    }
    return jsfLibrary;
}

function getSupportedXmlNamespaces(userSettings: UserSettings, url: string): JsfLibrary | undefined {
    switch (url) {
        case "http://richfaces.org/a4j":
            return {
                id: "a4j",
                url: url,
                framework: JsfFramework.Richfaces,
                extension: "a4j",
                version: userSettings.richVersion,
                description: "Richfaces - Ajax4Jsf"
            };
        case "http://richfaces.org/rich":
            return {
                id: "r",
                url: url,
                version: userSettings.richVersion,
                framework: JsfFramework.Richfaces,
                description: "Richfaces"
            };
        case "http://omnifaces.org/ui":
            return {
                id: "o",
                url: url,
                version: userSettings.omniVersion,
                framework: JsfFramework.Omnifaces,
                description: "Omnifaces"
            };
        case "http://primefaces.org/ui":
            return {
                id: "p",
                url: url,
                version: userSettings.primeVersion,
                framework: JsfFramework.Primefaces,
                description: "Primefaces"
            };
        case "http://primefaces.org/ui/extensions":
            return {
                id: "pe",
                url: url,
                framework: JsfFramework.Primefaces,
                extension: "extensions",
                version: userSettings.primeExtVersion ?? userSettings.primeVersion,
                description: "Primefaces Extention"
            };
        case "http://java.sun.com/jsf/":
        case "http://xmlns.jcp.org/jsp/jstl/core":
            return {
                id: "c",
                url: url,
                framework: JsfFramework.Jsf,
                extension: "c",
                description: "JSF Tags Core"
            };
        case "jakarta.tags.core":
            return {
                id: "c",
                url: url,
                framework: JsfFramework.Jakarta,
                extension: "c",
                version: userSettings.facesVersion,
                description: "Jakarta Tags Core"
            };
        case "http://java.sun.com/jsf/composite":
        case "http://xmlns.jcp.org/jsf/composite":
            return {
                id: "cc",
                url: url,
                framework: JsfFramework.Jsf,
                extension: "cc",
                description: "JSF Composite"
            };
        case "jakarta.faces.composite":
            return {
                id: "cc",
                url: url,
                framework: JsfFramework.Jakarta,
                extension: "cc",
                version: userSettings.facesVersion,
                description: "Jakarta Composite"
            };
        case "http://java.sun.com/jsf/core":
        case "http://xmlns.jcp.org/jsf/core":
            return {
                id: "f",
                url: url,
                framework: JsfFramework.Jsf,
                extension: "f",
                description: "JSF Faces Core"
            };
        case "jakarta.faces.core":
            return {
                id: "f",
                url: url,
                framework: JsfFramework.Jakarta,
                extension: "f",
                version: userSettings.facesVersion,
                description: "Jakarta Faces Core"
            };
        case "http://java.sun.com/jsf/html":
        case "http://xmlns.jcp.org/jsf/html":
            return {
                id: "h",
                url: url,
                framework: JsfFramework.Jsf,
                extension: "h",
                description: "JSF Faces HTML"
            };
        case "jakarta.faces.html":
            return {
                id: "h",
                url: url,
                framework: JsfFramework.Jakarta,
                extension: "h",
                version: userSettings.facesVersion,
                description: "Jakarta Faces HTML"
            };
        case "http://java.sun.com/jsf/facelets":
        case "http://xmlns.jcp.org/jsf/facelets":
            return {
                id: "ui",
                url: url,
                framework: JsfFramework.Jsf,
                extension: "ui",
                description: "JSF Facelets"
            };
        case "jakarta.faces.facelets": 
            return {
                id: "ui",
                url: url,
                framework: JsfFramework.Jakarta,
                extension: "ui",
                version: userSettings.facesVersion,
                description: "Jakarta Facelets"
            };
        default:
            //TODO: Legge til unsupported melding
    }
}


/**
 * Load all taglib content from xmlns (components and attributes).
 * Loading is only done if the elements have not been loaded previously.
 * 
 * @param xmlns
 */
function loadElementDefinitions(jsfLibrary: JsfLibrary): Component[] {
    const file = [jsfLibrary.framework, jsfLibrary.extension, jsfLibrary.version]
        .filter(string => string)
        .join("-") + ".json"
    const dataFilename = join(__dirname, "parse-engines", "data", jsfLibrary.framework, file);

    const jsonFile = require(dataFilename) as JsfLibraryDefinitions;
    return jsonFile.components.component;
}

enum Status {
    OK = 1,
    WARN = 2,
    ERROR = 3
}

interface StatusParams {
    message: string;
    state: Status;
}

namespace StatusNotification {
    export const type = new NotificationType<StatusParams>(
      'jsf/status'
    )
}

function notify(state: Status, message: string): void {
    connection.sendNotification(StatusNotification.type, {message: message, state: state });
}

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        // if (item.data === 1) {
        //     item.detail = 'TypeScript details';
        //     item.documentation = 'TypeScript documentation';
        // } else if (item.data === 2) {
        //     item.detail = 'JavaScript details';
        //     item.documentation = 'JavaScript documentation';
        // }
        return item;
    }
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
