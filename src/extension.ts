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
	cache = "jsf-primefaces-intellisense.cache",
	helloWord = "jsf-primefaces-intellisense.helloWorld"
}

enum Configuration {
	languages = "jsf-primefaces-intellisense.languages",
	primeVersion = "jsf-primefaces-intellisense.primeVersion"
}

const notifier: Notifier = new Notifier(Command.cache);
const completionTriggerChars = ['"', "'", " ", "."];
let caching = false;
const htmlDisposables: Disposable[] = [];

// Unique components by tag type
let primeUniqueDefinitions: ComponentDefinition[] = [];
let richUniqueDefinitions: ComponentDefinition[] = [];
let richA4JUniqueDefinitions: ComponentDefinition[] = [];
let hUniqueDefinitions: ComponentDefinition[] = [];
let fUniqueDefinitions: ComponentDefinition[] = [];
let cUniqueDefinitions: ComponentDefinition[] = [];
let ccUniqueDefinitions: ComponentDefinition[] = [];
let uiUniqueDefinitions: ComponentDefinition[] = [];
let omnifacesUniqueDefinitions: ComponentDefinition[] = [];
let primeExtensionsUniqueDefinitions: ComponentDefinition[] = [];

// Url tags
const urlHTag: string = "http://java.sun.com/jsf/html";
const urlFTag: string = "http://java.sun.com/jsf/core";
const urlPTag: string = "http://primefaces.org/ui";
const urlRTag: string = "http://richfaces.org/rich";
const urlA4jTag: string = "http://richfaces.org/a4j";
const urlCTag: string = "http://xmlns.jcp.org/jsp/jstl/core";
const urlCCTag: string = "http://java.sun.com/jsf/composite";
const urlUITag: string = "http://java.sun.com/jsf/facelets";
const urlOTag: string = "http://omnifaces.org/ui";
const urlPETag: string = "http://primefaces.org/ui/extensions";
let xmlns: Map<string, string>;

//Name tags
const hTagName: string = "h";
const fTagName: string = "f";
const pTagName: string = "p";
const rTagName: string = "r";
const a4jTagName: string = "a4j";
const cTagName: string = "c";
const ccTagName: string = "cc";
const uiTagName: string = "ui";
const oTagName: string = "o";
const peTagName: string = "pe";

async function cache(): Promise<void> {
	try {
		notifier.notify("eye", "Clear cache taglib...");
		primeUniqueDefinitions = [];
		richUniqueDefinitions = [];
		richA4JUniqueDefinitions = [];
		hUniqueDefinitions = [];
		fUniqueDefinitions = [];
		cUniqueDefinitions = [];
		ccUniqueDefinitions = [];
		uiUniqueDefinitions = [];
		notifier.notify("zap", "Clean components cache... (click to clean cache again)");
	} catch (err) {
		notifier.notify("alert", "Failed to clean cache the components");
		throw new VError('err', "Failed to clean cache the component definitions");
	}
}

function loadTag(tagType: string): void {
	switch (tagType) {
		case pTagName: {
			if (primeUniqueDefinitions.length < 1) {
				let primeVersion: any = '';
				primeVersion = workspace.getConfiguration().get<string>(Configuration.primeVersion);
				primeUniqueDefinitions = getUniqueTagDefinitions(primeVersion);
			}
			break;
		}
		case cTagName: {
			if (cUniqueDefinitions.length < 1) {
				cUniqueDefinitions = getUniqueTagDefinitions(tagType);
			}
			break;
		}
		case ccTagName: {
			if (ccUniqueDefinitions.length < 1) {
				ccUniqueDefinitions = getUniqueTagDefinitions(tagType);
			}
			break;
		}
		case hTagName: {
			if (hUniqueDefinitions.length < 1) {
				hUniqueDefinitions = getUniqueTagDefinitions(tagType);
			}
			break;
		}
		case fTagName: {
			if (fUniqueDefinitions.length < 1) {
				fUniqueDefinitions = getUniqueTagDefinitions(tagType);
			}
			break;
		}
		case uiTagName: {
			if (uiUniqueDefinitions.length < 1) {
				uiUniqueDefinitions = getUniqueTagDefinitions(tagType);
			}
			break;
		}
		case rTagName: {
			if (richUniqueDefinitions.length < 1) {
				richUniqueDefinitions = getUniqueTagDefinitions('richfaces45');
			}
			break;
		}
		case a4jTagName: {
			if (richA4JUniqueDefinitions.length < 1) {
				richA4JUniqueDefinitions = getUniqueTagDefinitions('richfaces45-a4j');
			}
			break;
		}
		case oTagName: {
			if (omnifacesUniqueDefinitions.length < 1) {
				omnifacesUniqueDefinitions = getUniqueTagDefinitions('omnifaces');
			}
			break;
		}
		case peTagName: {
			if (primeExtensionsUniqueDefinitions.length < 1) {
				primeExtensionsUniqueDefinitions = getUniqueTagDefinitions('primefaces-extensions');
			}
			break;
		}
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

		let completionItems;
		let xmlnsTags: Map<string, string> = getXmlns(document, position);

		// Components
		let tagHDoc = xmlnsTags.has(hTagName) ? xmlnsTags.get(hTagName) : "";
		let tagFDoc = xmlnsTags.has(fTagName) ? xmlnsTags.get(fTagName) : "";
		let tagPDoc = xmlnsTags.has(pTagName) ? xmlnsTags.get(pTagName) : "";
		let tagRDoc = xmlnsTags.has(rTagName) ? xmlnsTags.get(rTagName) : "";
		let tagA4JDoc = xmlnsTags.has(a4jTagName) ? xmlnsTags.get(a4jTagName) : "";
		let tagCDoc = xmlnsTags.has(cTagName) ? xmlnsTags.get(cTagName) : "";
		let tagCCDoc = xmlnsTags.has(ccTagName) ? xmlnsTags.get(ccTagName) : "";
		let tagUIDoc = xmlnsTags.has(uiTagName) ? xmlnsTags.get(uiTagName) : "";
		let tagODoc = xmlnsTags.has(oTagName) ? xmlnsTags.get(oTagName) : "";
		let tagPEDoc = xmlnsTags.has(peTagName) ? xmlnsTags.get(peTagName) : "";

		if (facelet !== "" &&
			(facelet === tagHDoc
				|| facelet === tagFDoc
				|| facelet === tagCDoc
				|| facelet === tagCCDoc
				|| facelet === tagUIDoc
				|| facelet === tagPDoc
				|| facelet === tagRDoc
				|| facelet === tagA4JDoc
				|| facelet === tagODoc
				|| facelet === tagPEDoc)) {
			let compUniqueDefinitions: ComponentDefinition[] = [];
			switch (facelet) {
				case tagPDoc: {
					loadTag(pTagName);
					compUniqueDefinitions = primeUniqueDefinitions;
					break;
				}
				case tagHDoc: {
					loadTag(hTagName);
					compUniqueDefinitions = hUniqueDefinitions;
					break;
				}
				case tagFDoc: {
					loadTag(fTagName);
					compUniqueDefinitions = fUniqueDefinitions;
					break;
				}
				case tagCDoc: {
					loadTag(cTagName);
					compUniqueDefinitions = cUniqueDefinitions;
					break;
				}
				case tagCCDoc: {
					loadTag(ccTagName);
					compUniqueDefinitions = ccUniqueDefinitions;
					break;
				}
				case tagUIDoc: {
					loadTag(uiTagName);
					compUniqueDefinitions = uiUniqueDefinitions;
					break;
				}
				case tagRDoc: {
					loadTag(rTagName);
					compUniqueDefinitions = richUniqueDefinitions;
					break;
				}
				case tagA4JDoc: {
					loadTag(a4jTagName);
					compUniqueDefinitions = richA4JUniqueDefinitions;
					break;
				}
				case tagODoc: {
					loadTag(oTagName);
					compUniqueDefinitions = omnifacesUniqueDefinitions;
					break;
				}
				case tagPEDoc: {
					loadTag(peTagName);
					compUniqueDefinitions = primeExtensionsUniqueDefinitions;
					break;
				}
			}
			console.log(autoSearch);
			completionItems = compUniqueDefinitions
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
				});
		}
		// Attributes(Maybe)
		else {
			const componentInfo: Map<string, string> = getComponentInfo(document, position);
			const facelet = "<" + componentInfo.get("facelet") + ":";
			const component = componentInfo.get("component");
			const attibutes = componentInfo.get("attibutes");

			if (facelet !== '') {
				let completionPItems: ComponentDefinition[] = [];

				if (facelet === tagPDoc) {
					completionPItems = primeUniqueDefinitions.filter(definition => definition.component.name === component);
				} else if (facelet === tagRDoc) {
					completionPItems = richUniqueDefinitions.filter(definition => definition.component.name === component);
				} else if (facelet === tagA4JDoc) {
					completionPItems = richA4JUniqueDefinitions.filter(definition => definition.component.name === component);
				} else if (facelet === tagHDoc) {
					completionPItems = hUniqueDefinitions.filter(definition => definition.component.name === component);
				} else if (facelet === tagFDoc) {
					completionPItems = fUniqueDefinitions.filter(definition => definition.component.name === component);
				} else if (facelet === tagCDoc) {
					completionPItems = cUniqueDefinitions.filter(definition => definition.component.name === component);
				} else if (facelet === tagCCDoc) {
					completionPItems = ccUniqueDefinitions.filter(definition => definition.component.name === component);
				} else if (facelet === tagUIDoc) {
					completionPItems = uiUniqueDefinitions.filter(definition => definition.component.name === component);
				} else if (facelet === tagODoc) {
					completionPItems = omnifacesUniqueDefinitions.filter(definition => definition.component.name === component);
				} else if (facelet === tagPEDoc) {
					completionPItems = primeExtensionsUniqueDefinitions.filter(definition => definition.component.name === component);
				}

				completionItems = completionPItems[0].component.attributes.map(definition => {
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
			}
			else {
				return [];
			}
		}
		return completionItems;
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


function getXmlns(document: TextDocument, position: Position): Map<string, string> {
	xmlns = new Map<string, string>();
	let start: Position = new Position(0, 0);
	let range: Range = new Range(start, position);
	let allText: string = document.getText(range);
	allText = allText.toLowerCase();

	if (allText.includes(urlPTag)) {
		xmlns.set(pTagName, getTag(allText, urlPTag));
	}
	if (allText.includes(urlRTag)) {
		xmlns.set(rTagName, getTag(allText, urlRTag));
	}
	if (allText.includes(urlA4jTag)) {
		xmlns.set(a4jTagName, getTag(allText, urlA4jTag));
	}
	if (allText.includes(urlHTag)) {
		xmlns.set(hTagName, getTag(allText, urlHTag));
	}
	if (allText.includes(urlFTag)) {
		xmlns.set(fTagName, getTag(allText, urlFTag));
	}
	if (allText.includes(urlCTag)) {
		xmlns.set(cTagName, getTag(allText, urlCTag));
	}
	if (allText.includes(urlCCTag)) {
		xmlns.set(ccTagName, getTag(allText, urlCCTag));
	}
	if (allText.includes(urlUITag)) {
		xmlns.set(uiTagName, getTag(allText, urlUITag));
	}
	if (allText.includes(urlOTag)) {
		xmlns.set(oTagName, getTag(allText, urlOTag));
	}
	if (allText.includes(urlPETag)) {
		xmlns.set(peTagName, getTag(allText, urlPETag));
	}
	return xmlns;
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