import * as _ from "lodash";
import * as VError from "verror";
import {
	commands, CompletionItem, CompletionItemKind, Disposable,
	ExtensionContext, languages, Position, Range, TextDocument, window,
	workspace
} from 'vscode';
import { ComponentDefinition, XmlNamespace } from './common';
import Notifier from "./notifier";
import ParseEngineGateway from './parse-engine-gateway';

enum Command {
	cache = "jsf-primefaces-intellisense.cache"
}

enum Configuration {
	languages = "jsf-primefaces-intellisense.languages",
	primeVersion = "jsf-primefaces-intellisense.primeVersion",
	primeExtVersion = "jsf-primefaces-intellisense.primeExtVersion",
	omniVersion = "jsf-primefaces-intellisense.omniVersion",
	richVersion = "jsf-primefaces-intellisense.richVersion",
	facesVersion = "jsf-primefaces-intellisense.facesVersion"
}

const notifier: Notifier = new Notifier(Command.cache);
const completionTriggerChars = ['"', "'", " ", ".", ":"];
let caching = false;
const htmlDisposables: Disposable[] = [];

const isJakartaVersion = (): boolean => {
	const faces: string = workspace.getConfiguration().get<string>(Configuration.facesVersion) ?? '';
	if (faces === "java-server-faces(1.0 - 2.2)" || faces === "jakarta-server-faces(2.3 - 3.0)") {
		return false;
	}
	return true;
}

const richFacesSubTag = (subtag: string): string => {
	const rich: string = workspace.getConfiguration().get<string>(Configuration.richVersion) ?? '';
	const vers = rich.substring(rich.lastIndexOf('-'));
	return `${subtag}${vers}`;
}

const supportedXmlNamespaces: XmlNamespace[] = [
	{
		id: "a4j",
		urls: ["http://richfaces.org/a4j"],
		dataFilename: richFacesSubTag("a4j"),
		description: "Richfaces - Ajax4Jsf",
		uniqueDefinitions: []
	}, {
		id: "r",
		urls: ["http://richfaces.org/rich"],
		dataFilename: richFacesSubTag("richfaces"),
		description: "Richfaces",
		uniqueDefinitions: []
	},
	{
		id: "o",
		urls: ["http://omnifaces.org/ui"],
		dataFilename: workspace.getConfiguration().get<string>(Configuration.omniVersion) ?? "",
		description: "Omnifaces",
		uniqueDefinitions: []
	},
	{
		id: "p",
		urls: ["http://primefaces.org/ui"],
		dataFilename: workspace.getConfiguration().get<string>(Configuration.primeVersion) ?? "",
		description: "Primefaces",
		uniqueDefinitions: []
	},
	{
		id: "pe",
		urls: ["http://primefaces.org/ui/extensions"],
		dataFilename: workspace.getConfiguration().get<string>(Configuration.primeExtVersion) ?? "",
		description: "Primefaces Extention",
		uniqueDefinitions: []
	},
	{
		id: "c",
		urls: !isJakartaVersion() ? ["http://xmlns.jcp.org/jsp/jstl/core"] : ["jakarta.tags.core"],
		dataFilename: 'c',
		description: "JSF Tags Core",
		uniqueDefinitions: []
	},
	{
		id: "cc",
		urls: !isJakartaVersion() ? ["http://java.sun.com/jsf/composite", "http://xmlns.jcp.org/jsf/composite"] : ["jakarta.faces.composite"],
		dataFilename: 'cc',
		description: "JSF Composite",
		uniqueDefinitions: []
	},
	{
		id: "f",
		urls: !isJakartaVersion() ? ["http://java.sun.com/jsf/core", "http://xmlns.jcp.org/jsf/core"] : ["jakarta.faces.core"],
		dataFilename: 'f',
		description: "JSF Faces Core",
		uniqueDefinitions: []
	},
	{
		id: "h",
		urls: !isJakartaVersion() ? ["http://java.sun.com/jsf/html", "http://xmlns.jcp.org/jsf/html"] : ["jakarta.faces.html"],
		dataFilename: 'h',
		description: "JSF Faces HTML",
		uniqueDefinitions: []
	},
	{
		id: "ui",
		urls: !isJakartaVersion() ? ["http://java.sun.com/jsf/facelets", "http://xmlns.jcp.org/jsf/facelets"] : ["jakarta.faces.facelets"],
		dataFilename: 'ui',
		description: "JSF Facelets",
		uniqueDefinitions: []
	}
];


/**
 * Method for clearing cache
 * 
 */
async function cache(): Promise<void> {
	try {
		notifier.notify("eye", "Clear cache taglib...");
		supportedXmlNamespaces.forEach(xmlns => xmlns.uniqueDefinitions = []);
		notifier.notify("zap", "Clean components cache... (click to clean cache again)");
	} catch (err) {
		notifier.notify("alert", "Failed to clean cache the components");
		throw new VError('err', "Failed to clean cache the component definitions");
	}
}

enum Resolving {
	NsPrefix,
	Element,
	Attribute
}

/**
 * Main method
 * 
 * @param languageSelector 
 * @param classPrefix 
 * @returns 
 */
const registerCompletionProvider = (
	languageSelector: string,
	classPrefix = ""
) => languages.registerCompletionItemProvider(languageSelector, {
	provideCompletionItems(document: TextDocument, position: Position): CompletionItem[] {
		const start: Position = new Position(position.line, 0);
		const range: Range = new Range(start, position);
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
		aliasFromDocument(document, position);

		// Find available namespaces
		if (resolving === Resolving.NsPrefix) {
			return supportedXmlNamespaces
				.filter(xmlns => xmlns.aliasInDoc)
				.map(xmlns => {
					const completionItem = new CompletionItem(xmlns.aliasInDoc!, CompletionItemKind.Property);
					completionItem.documentation = xmlns.description;
					const completionClassName = `${xmlns.aliasInDoc}`;
					completionItem.filterText = completionClassName;
					completionItem.insertText = completionClassName + ":";
					completionItem.detail = `XMLNS: ${xmlns.dataFilename.toUpperCase()} - ${xmlns.description}`;
					return completionItem;
				});
		}
		// Find the components
		else if (resolving === Resolving.Element) {
			const xmlns = supportedXmlNamespaces.find(xmlns => xmlns.aliasInDoc === xmlnsPrefix);
			return xmlns?.uniqueDefinitions
				.map(definition => {
					const completionItem = new CompletionItem(definition.component.name, CompletionItemKind.Property);
					completionItem.documentation = definition.component.description;
					const completionClassName = `${classPrefix}${definition.component.name}`;
					completionItem.filterText = completionClassName;
					completionItem.insertText = completionClassName;
					completionItem.detail = `XMLNS: ${xmlns.dataFilename.toUpperCase()} - ${xmlns.description}`;
					return completionItem;
				}) ?? [];
		}
		// Find component attributes
		else {
			const componentInfo: Map<string, string> = getComponentInfomation(document, position);
			const xmlnsPrefix = componentInfo.get("xmlnsPrefix") ?? "";
			const componentName = componentInfo.get("componentName");
			const attibutes = componentInfo.get("attibutes");

			if (xmlnsPrefix !== "") {
				aliasFromDocument(document, position);
				let xmlns = supportedXmlNamespaces.find(xmlns => xmlns.aliasInDoc === xmlnsPrefix);
				if (xmlnsPrefix !== "" && xmlns) {

					let componentItem = xmlns.uniqueDefinitions
						.filter(definition => definition.component.name === componentName)
						.find(() => true);

					if (componentItem === undefined) {
						return [];
					}

					let completionItems = componentItem.component.attributes.map(definition => {
						const text: string = `${definition.description}\n`
							+ `Required: ${definition.required}\n`
							+ `Type: ${definition.type}\n`;
						const completionItem = new CompletionItem(definition.name, CompletionItemKind.Enum);
						completionItem.documentation = text;
						const completionClassName = `${classPrefix}${definition.name}`;
						completionItem.filterText = completionClassName;
						completionItem.insertText = completionClassName + "=\"\"";
						completionItem.detail = `XMLNS: ${xmlns!.dataFilename.toUpperCase()} - ${xmlns!.description}`;
						return completionItem;
					});

					if (attibutes && attibutes.length > 0) {
						const attributesOnComponent = attibutes.split('|');
						// Removes from the collection the attributes already specified on the component
						for (const attributeOnComponent of attributesOnComponent) {
							for (let j = 0; j < completionItems.length; j++) {
								if (completionItems[j].insertText === attributeOnComponent + "=\"\"") {
									completionItems.splice(j, 1);
								}
							}
						}
					}
					return completionItems;
				}
			}
		}
		return [];
	},
}, ...completionTriggerChars);

/**
 * Get all the xmlns prefixes used in the document 
 * and register them in each of the supportedXmlNamespaces.
 * 
 * @param document 
 * @param position 
 */
function aliasFromDocument(document: TextDocument, position: Position): void {
	let start: Position = new Position(0, 0);
	let range: Range = new Range(start, position);
	let allText = document.getText(range).toLowerCase();
	supportedXmlNamespaces.forEach(xmlns => {
		xmlns.aliasInDoc = "";
		xmlns.urls.forEach(url => {
			if (allText.includes("\"" + url + "\"")) {
				xmlns.aliasInDoc = getXmlnsAlias(allText, url);
				loadAllXmlnsContent(xmlns);
			}
		});
	});
}

/**
 * Get the prefix used in the xmlns.
 * 
 * @param allText 
 * @param xmlnsTag 
 * @returns 
 */
function getXmlnsAlias(allText: string, xmlnsTag: string): string {
	const index: number = allText.indexOf(xmlnsTag);
	const tag: string = allText.substring(0, index);
	const indexXMLNS: number = tag.lastIndexOf('xmlns:');
	return tag.substring(indexXMLNS + 6, tag.length - 2);
}

/**
 * Load all taglib content from xmlns (components and attributes).
 * Loading is only done if the elements have not been loaded previously.
 * 
 * @param xmlns
 */
function loadAllXmlnsContent(xmlns: XmlNamespace): void {
	if (xmlns && xmlns?.uniqueDefinitions.length < 1) {
		try {
			let uniqueComponentDefinition: ComponentDefinition[] = [];
			const componentDefinitions: ComponentDefinition[] = [];
			let failedLogs = "";
			let failedLogsCount = 0;
			try {
				Array.prototype.push.apply(componentDefinitions, ParseEngineGateway.callParser(xmlns.dataFilename));
			} catch (err) {
				notifier.notify("alert", "Failed to cache the components in the workspace (click for another attempt)");
				throw new VError('err', "Failed to parse the documents");
			}
			uniqueComponentDefinition = _.uniqBy(componentDefinitions, (def) => def.component.name);
			if (failedLogsCount > 0) {
				console.log(failedLogsCount, "failed attempts to parse. List of the documents:");
				console.log(failedLogs);
			}
			xmlns.uniqueDefinitions = uniqueComponentDefinition;
		} catch (err) {
			notifier.notify("alert", "Failed to cache the components in the workspace (click for another attempt)");
			throw new VError('err', "Failed to cache the component definitions during the iterations over the documents that were found");
		}
	}
}

/**
 * Gets the name of the component, the attribute and 
 * possible attributes already used in it.
 * 
 * @param document 
 * @param position 
 * @returns 
 */
function getComponentInfomation(document: TextDocument, position: Position): Map<string, string> {
	const componentInfo = new Map<string, string>();
	const start: Position = new Position(0, 0);
	const range: Range = new Range(start, position);
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
		componentInfo.set("componentName", div[1]);

		lastC = allText.lastIndexOf('<' + div[0] + ':' + div[1]);
		text = allText.substring(lastC);

		if (inAttribute(text)) {
			return new Map<string, string>();
		}
		if (text.includes('>')) {
			return new Map<string, string>();
		}
		let index: number;
		const rExp: RegExp = /(\w+=(["'])([^"|']*)(["']))/g;
		const rawClasses: RegExpMatchArray | null = text.match(rExp);
		const attributes = (rawClasses && rawClasses.length > 0)
			? rawClasses?.map(item => item.split('=')[0])
				.filter(item => item.length > 0)
				.join("|")
			: '';
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
function inAttribute(text: string): boolean {
	let character: string = '';
	let index: number = text.lastIndexOf('\"');
	if (index === -1) {
		index = text.lastIndexOf('\'');
	}
	if (index !== -1) {
		character = text.substring(index - 1, index);
		if (character === '=') {
			return true;
		}
	}
	return false;
}

const registerComponentProviders = (disposables: Disposable[]) =>
	workspace.getConfiguration()
		?.get<string[]>(Configuration.languages)
		?.forEach((extension) => {
			disposables.push(registerCompletionProvider(extension));
		});

function unregisterProviders(disposables: Disposable[]) {
	disposables.forEach(disposable => disposable.dispose());
	disposables.length = 0;
}

export async function activate(context: ExtensionContext): Promise<void> {
	const disposables: Disposable[] = [];
	workspace.onDidChangeConfiguration(async (e) => {
		try {
			if (e.affectsConfiguration(Configuration.languages)) {
				unregisterProviders(htmlDisposables);
				registerComponentProviders(htmlDisposables);
			}
		} catch (err) {
			const newErr = new VError('err', "Failed to automatically reload the extension after the configuration change");
			console.error(newErr);
			window.showErrorMessage(newErr.message);
		}
	}, null, disposables);

	context.subscriptions.push(...disposables);

	context.subscriptions.push(commands.registerCommand(Command.cache, async () => {
		if (caching) {
			return;
		}
		caching = true;
		try {
			await cache();
		} catch (err) {
			const newErr = new VError('err', "Failed to cache the components in the workspace");
			console.error(newErr);
			window.showErrorMessage(newErr.message);
		} finally {
			caching = false;
		}
	}));
	registerComponentProviders(htmlDisposables);

	caching = true;
	try {
		await cache();
	} catch (err) {
		const newErr = new VError('err', "Failed to cache the components in the workspace for the first time");
		console.error(newErr);
		window.showErrorMessage(newErr.message);
	} finally {
		caching = false;
	}
}

export function deactivate(): void {
	unregisterProviders(htmlDisposables);
}