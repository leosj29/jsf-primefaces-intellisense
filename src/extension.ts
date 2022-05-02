import {
	commands, CompletionItem, CompletionItemKind, Disposable,
	ExtensionContext, languages, Position, Range, TextDocument, Uri, window,
	workspace
} from 'vscode';
import * as _ from "lodash";
import * as VError from "verror";
import Notifier from "./notifier";
import ParseEngineGateway from "./parse-engine-gateway";
import ComponentDefinition from './common/component-definition';

enum Command {
	cache = "jsf-primefaces-intellisense.cache"
}

enum Configuration {
	languages = "jsf-primefaces-intellisense.languages",
	primeVersion = "jsf-primefaces-intellisense.primeVersion"
}

const notifier: Notifier = new Notifier(Command.cache);
const completionTriggerChars = ['"', "'", " ", "."];
let caching = false;
const htmlDisposables: Disposable[] = [];

interface XmlSchema {
	prefix: string;
	schemaUrl: string;
	version?: () => string;
	uniqueDefinitions: ComponentDefinition[];
}

const supportedXmlSchemas: XmlSchema[] = [
	{prefix: "h", schemaUrl: "http://java.sun.com/jsf/html", uniqueDefinitions: []},
	{prefix: "f", schemaUrl: "http://java.sun.com/jsf/core", uniqueDefinitions: []},
	{prefix: "p", schemaUrl: "http://primefaces.org/ui", version: () => workspace.getConfiguration().get<string>(Configuration.primeVersion) ?? '', uniqueDefinitions: []},
	{prefix: "r", schemaUrl: "http://richfaces.org/rich", version: () => "richfaces45", uniqueDefinitions: []},
	{prefix: "a4j", schemaUrl: "http://richfaces.org/a4j", version: () => "richfaces45-a4j", uniqueDefinitions: []},
	{prefix: "c", schemaUrl: "http://xmlns.jcp.org/jsp/jstl/core", uniqueDefinitions: []},
	{prefix: "cc", schemaUrl: "http://java.sun.com/jsf/composite", uniqueDefinitions: []},
	{prefix: "ui", schemaUrl: "http://java.sun.com/jsf/facelets", uniqueDefinitions: []},
	{prefix: "o", schemaUrl: "http://omnifaces.org/ui", version: () => "omnifaces", uniqueDefinitions: []},
	{prefix: "pe", schemaUrl: "http://primefaces.org/ui/extensions", version: () => "primefaces-extensions", uniqueDefinitions: []}
]

async function cache(): Promise<void> {
	try {
		notifier.notify("eye", "Clear cache taglib...");
		supportedXmlSchemas.forEach(schema => schema.uniqueDefinitions = []);

		notifier.notify("zap", "Clean components cache... (click to clean cache again)");
	} catch (err) {
		notifier.notify("alert", "Failed to clean cache the components");
		throw new VError('err', "Failed to clean cache the component definitions");
	}
}

function loadTag(tagType: string): void {

	let xmlSchema = supportedXmlSchemas.find(schema => schema.prefix === tagType);
	if (xmlSchema && xmlSchema?.uniqueDefinitions.length < 1) {
		xmlSchema.uniqueDefinitions = getUniqueTagDefinitions(xmlSchema.version?.() ?? xmlSchema.prefix);
	}
}


function getUniqueTagDefinitions(tagType: string): ComponentDefinition[] {
	try {
		let uniqueComponentDefinition: ComponentDefinition[] = [];
		notifier.notify("eye", "Looking taglib in the workspace...");
		console.log("Looking for parseable documents...");
		console.log("Found all parseable documents.");
		const componentDefinitions: ComponentDefinition[] = [];
		let failedLogs = "";
		let failedLogsCount = 0;
		console.log("Parsing documents and looking components definitions...");
		try {
			Array.prototype.push.apply(componentDefinitions, ParseEngineGateway.callParser(tagType));
		} catch (err) {
			notifier.notify("alert", "Failed to cache the components in the workspace (click for another attempt)");
			throw new VError('err', "Failed to parse the documents");
		}
		uniqueComponentDefinition = _.uniqBy(componentDefinitions, (def) => def.component.name);
		console.log("Summary:");
		console.log(componentDefinitions.length, "Ccomponent definitions found");
		console.log(uniqueComponentDefinition.length, "Unique component definitions found");
		console.log(failedLogsCount, "failed attempts to parse. List of the documents:");
		console.log(failedLogs);
		notifier.notify("zap", "Components cached (click to cache again)");
		return uniqueComponentDefinition;
	} catch (err) {
		notifier.notify("alert", "Failed to cache the components in the workspace (click for another attempt)");
		throw new VError('err', "Failed to cache the component definitions during the iterations over the documents that were found");
	}
}

const registerCompletionProvider = (
	languageSelector: string,
	classPrefix = ""
) => languages.registerCompletionItemProvider(languageSelector, {
	provideCompletionItems(document: TextDocument, position: Position): CompletionItem[] {
		const start: Position = new Position(position.line, 0);
		const range: Range = new Range(start, position);
		const text: string = document.getText(range);
		let autoSearch: string = '';
		let facelet: string = text.trimStart();

		if (!facelet.includes(' ')) {
			let ind = facelet.indexOf(':');
			if (ind > -1 && ind + 1 < facelet.length) {
				autoSearch = facelet.substring(ind + 1);
				facelet = facelet.substring(0, ind + 1);
			}
		}
		else {
			facelet = text.trim();
		}

		let xmlnsTags: Map<string, XmlSchema> = getXmlns(document, position);


		if (facelet !== "" && xmlnsTags.has(facelet)) {
			loadTag(xmlnsTags.get(facelet)?.prefix ?? '');
			console.log(autoSearch);
			return xmlnsTags.get(facelet)?.uniqueDefinitions
				.filter((definition) =>
					autoSearch === '' || definition.component.name.startsWith(autoSearch))
				.map((definition) => {
					console.log(definition.component.name);
					const completionItem = new CompletionItem(definition.component.name, CompletionItemKind.Property);
					completionItem.documentation = definition.component.description;
					const completionClassName = `${classPrefix}${definition.component.name}`;
					completionItem.filterText = completionClassName;
					completionItem.insertText = completionClassName;
					return completionItem;
				}) ?? [];
		}
		// Attributes(Maybe)
		else {
			const componentInfo: Map<string, string> = getComponentInfo(document, position);
			const facelet = "<" + componentInfo.get("facelet") + ":";
			const component = componentInfo.get("component");
			const attibutes = componentInfo.get("attibutes");

			if (facelet !== "" && xmlnsTags.has(facelet)) {
				let completionPItems = xmlnsTags.get(facelet)?.uniqueDefinitions
					.filter(definition => definition.component.name === component)
					.find(() => true)

				if (completionPItems === undefined) {
					return [];
				}
				let completionItems = completionPItems.component.attributes.map(definition => {
					let text: string = '';
					text = text + definition.description + "\n";
					text = text + "Required: " + definition.required + "\n";
					text = text + "Type: " + definition.type + "\n";

					const completionItem = new CompletionItem(definition.name, CompletionItemKind.Property);
					completionItem.documentation = text;
					const completionClassName = `${classPrefix}${definition.name}`;
					completionItem.filterText = completionClassName;
					completionItem.insertText = completionClassName + "=\"\"";
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
			else {
				return [];
			}
		}
	},
}, ...completionTriggerChars);

function getComponentInfo(document: TextDocument, position: Position): Map<string, string> {
	let componentInfo = new Map<string, string>();
	let text: string = '';
	let start: Position = new Position(0, 0);
	let range: Range = new Range(start, position);
	let allText: string = document.getText(range);
	let lastC: number = allText.lastIndexOf('<');
	text = allText.substring(lastC);

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
		componentInfo.set("facelet", div[0]);
		componentInfo.set("component", div[1]);

		let attibutes: string = '';
		lastC = allText.lastIndexOf('<' + div[0] + ':' + div[1]);
		text = allText.substring(lastC);

		if (inAttribute(text)) {
			return new Map<string, string>();
		}
		if (text.includes('>')) {
			return new Map<string, string>();
		}
		let index: number;
		const rExp: RegExp = /(\w+=(\"|\')([^"|\']*)(\"|\'))/g;
		let rawClasses: RegExpMatchArray | null = text.match(rExp);
		if (rawClasses && rawClasses.length > 0) {
			rawClasses?.forEach(item => {
				index = item.indexOf('=');
				item = item.substring(0, index);
				attibutes = attibutes + ((attibutes !== '') ? '|' : '') + item;
			});
		}
		componentInfo.set("attibutes", attibutes);
	}
	return componentInfo;
}


function getXmlns(document: TextDocument, position: Position): Map<string, XmlSchema> {
	const start: Position = new Position(0, 0);
	const range: Range = new Range(start, position);
	const allText: string = document.getText(range).toLowerCase();

	return new Map<string, XmlSchema>(supportedXmlSchemas.filter(xmlSchema => allText.includes(xmlSchema.schemaUrl))
		.map(xmlSchema => [getTag(allText, xmlSchema.schemaUrl), xmlSchema]));
}

function getTag(allText: string, xmlnsTag: string): string {
	let tag: string = '';
	let index: number = allText.indexOf(xmlnsTag);
	tag = allText.substring(0, index);
	let indexXMLNS: number = tag.lastIndexOf('xmlns:');
	tag = tag.substring(indexXMLNS + 6, tag.length - 2);
	return "<" + tag + ":";
}

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