import {
    DocumentUri,
    TextDocument
} from 'vscode-languageserver-textdocument';
import {
    CompletionItem,
    DidChangeConfigurationNotification,
    DidChangeWatchedFilesParams,
    FileChangeType,
    Hover,
    HoverParams,
    InitializeParams,
    InitializeResult,
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
import { DefinitionCache } from './services/DefinitionCache';
import { NotificationService } from './services/NotificationService';
import { getJsfAttributeCompletion, getJsfElementCompletion, getJsfNsPrefixCompletion } from './utils/CompletionUtils';
import { getAttributesInTag, getTagTextBeforPosition, getXmlNamespaces } from './utils/DocumentUtils';
import { getJsfAttributeHover, getJsfElementHover, getJsfNsPrefixHover } from './utils/HooverUtils';
import { substringAfterLast, substringBeforeFirst } from './utils/StringUtils';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);
const definitionCache = new DefinitionCache();
const notificationService: NotificationService = new NotificationService(connection);

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
            const xmlNs = definitionCache.getJsfLibrary(ans.url, settings);
            return {xmlNs: xmlNs, ...ans} as ActiveNamespace})
        .filter(ans => ans.xmlNs);

    documentSettings.set(textDocument.uri, {activeNamespaces: xmlNs} as DocumentSettings);
}

// Handler providing indexing of taglib.xml files
connection.onNotification("taglib/add", (handler: DocumentUri[]) => {
    handler.forEach(fileUri => definitionCache.addTagLibXml(fileUri));
})

connection.onDidChangeWatchedFiles((change: DidChangeWatchedFilesParams): void => {
    change.changes
        .forEach(fileEvent => {
            switch (fileEvent.type) {
                case FileChangeType.Created:
                case FileChangeType.Changed:
                    definitionCache.addTagLibXml(fileEvent.uri)
                    break;
                case FileChangeType.Deleted:
                    definitionCache.deleteTagLibXml(fileEvent.uri);
                    break;
            }
        });
});

// Handler providing hover information avout element
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

        const searchRangeAfterElement = Range.create(
            Position.create(hoverPosition.line, hoverPosition.character + indexAfterElement),
            Position.create(hoverPosition.line, Number.MAX_VALUE));
        const textAfterElement = document.getText(searchRangeAfterElement);

        const searchRangeBeforeElement = Range.create(
            Position.create(hoverPosition.line, 0), Position.create(hoverPosition.line, indexBeforeElement));
        const textBeforeElement = getTagTextBeforPosition(document, searchRangeBeforeElement);

        if (!textBeforeElement) {
            return null;
        //Hover Element
        } else if (/<\/?\w+:$/.test(textBeforeElement)) {
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
                    ?.attributes
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
        const cursorPosition = textDocumentPosition.position;
        const document = documents.get(documentUri);

        if (!document) {
            return [];
        }

        const [, indexBeforeElement] = substringAfterLast(
            document.getText(Range.create(Position.create(cursorPosition.line, 0), cursorPosition)),
            "\t", " ", "\"", "<", "</", ":");

        const searchRangeBeforeElement = Range.create(
            Position.create(cursorPosition.line, 0), Position.create(cursorPosition.line, indexBeforeElement));
        const textBeforeElement = getTagTextBeforPosition(document, searchRangeBeforeElement);

        if (!textBeforeElement) {
            return [];
        // Completion for Elements
        } else if (/<\/?\w+:$/.test(textBeforeElement)) {
            let nsPrefix = textBeforeElement.substring(
                textBeforeElement.lastIndexOf("<") + 1, textBeforeElement.lastIndexOf(":"));
            if (nsPrefix.startsWith("/")) {
                nsPrefix = nsPrefix.substring(1);
            }

            const xmlns = documentSettings.get(documentUri)?.activeNamespaces.find(ans => ans.nsPrefix === nsPrefix);
            return xmlns
                ?.xmlNs
                ?.components
                ?.map(component => getJsfElementCompletion(xmlns, component)) ?? [];
        // Completion for Attributes
        } else if (RegExp(/\s$/).exec(textBeforeElement)) {
            const match = RegExp(/<(\w+):(\w+)\s.*/).exec(textBeforeElement);
            if (match?.length !== 3) {
                return [];
            } else {
                const existingAttributes = getAttributesInTag(document, cursorPosition);
                const xmlns = documentSettings.get(documentUri)
                    ?.activeNamespaces
                    .find(ans => ans.nsPrefix === match[1]);
                return xmlns
                    ?.xmlNs
                    ?.components
                    ?.find(definition => definition.name === match[2])
                    ?.attributes
                    // Removes from the collection the attributes already specified on the component
                    .filter(definition => !existingAttributes.includes(definition.name))
                    .map(definition => getJsfAttributeCompletion(xmlns, definition)) ?? [];
            }
        // Completion for XML Namespace Prefix
        } else if (/<\/?$/.test(textBeforeElement)) {
            return documentSettings.get(documentUri)
                ?.activeNamespaces
                .map(getJsfNsPrefixCompletion) ?? [];
        } else {
            return [];
        }
    }
);

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
