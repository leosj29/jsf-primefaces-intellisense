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
let primeUniqueDefinitions: ComponentDefinition[] = [];
let richUniqueDefinitions: ComponentDefinition[] = [];
let richA4JUniqueDefinitions: ComponentDefinition[] = [];
let hUniqueDefinitions: ComponentDefinition[] = [];
let fUniqueDefinitions: ComponentDefinition[] = [];
let cUniqueDefinitions: ComponentDefinition[] = [];
let ccUniqueDefinitions: ComponentDefinition[] = [];
let uiUniqueDefinitions: ComponentDefinition[] = [];
const completionTriggerChars = ['"', "'", " ", "."];
let caching = false;

const htmlDisposables: Disposable[] = [];

const hTag: string = "http://java.sun.com/jsf/html";
const fTag: string = "http://java.sun.com/jsf/core";
const pTag: string = "http://primefaces.org/ui";
const rTag: string = "http://richfaces.org/rich";
const a4jTag: string = "http://richfaces.org/a4j";
const cTag: string = "http://xmlns.jcp.org/jsp/jstl/core";
const ccTag: string = "http://java.sun.com/jsf/composite";
const uiTag: string = "http://java.sun.com/jsf/facelets";
let xmlns: Map<string, string>;

async function cache(): Promise<void> {
	try {
		notifier.notify("eye", "Looking taglib in the workspace...");
		console.log("Looking for parseable documents...");
		console.log("Found all parseable documents.");

		const primeDefinitions: ComponentDefinition[] = [];
		const richDefinitions: ComponentDefinition[] = [];
		const richA4JDefinitions: ComponentDefinition[] = [];
		const hDefinitions: ComponentDefinition[] = [];
		const fDefinitions: ComponentDefinition[] = [];
		const cDefinitions: ComponentDefinition[] = [];
		const ccDefinitions: ComponentDefinition[] = [];
		const uiDefinitions: ComponentDefinition[] = [];

		let filesParsed = 0;
		let failedLogs = "";
		let failedLogsCount = 0;

		console.log("Parsing documents and looking components definitions...");

		try {
			let primeVersion: any = '';
			primeVersion = workspace.getConfiguration().get<string>(Configuration.primeVersion);
			Array.prototype.push.apply(primeDefinitions, await ParseEngineGateway.callParser(primeVersion));
			Array.prototype.push.apply(richDefinitions, await ParseEngineGateway.callParser("richfaces45"));
			Array.prototype.push.apply(richA4JDefinitions, await ParseEngineGateway.callParser("richfaces45-a4j"));
			Array.prototype.push.apply(hDefinitions, await ParseEngineGateway.callParser("h"));
			Array.prototype.push.apply(fDefinitions, await ParseEngineGateway.callParser("f"));
			Array.prototype.push.apply(cDefinitions, await ParseEngineGateway.callParser("c"));
			Array.prototype.push.apply(ccDefinitions, await ParseEngineGateway.callParser("cc"));
			Array.prototype.push.apply(uiDefinitions, await ParseEngineGateway.callParser("ui"));

		} catch (err) {
			notifier.notify("alert", "Failed to cache the components in the workspace (click for another attempt)");
			throw new VError('err', "Failed to parse the documents");
		}

		primeUniqueDefinitions = _.uniqBy(primeDefinitions, (def) => def.component.name);
		richUniqueDefinitions = _.uniqBy(richDefinitions, (def) => def.component.name);
		richA4JUniqueDefinitions = _.uniqBy(richA4JDefinitions, (def) => def.component.name);
		hUniqueDefinitions = _.uniqBy(hDefinitions, (def) => def.component.name);
		fUniqueDefinitions = _.uniqBy(fDefinitions, (def) => def.component.name);
		cUniqueDefinitions = _.uniqBy(cDefinitions, (def) => def.component.name);
		ccUniqueDefinitions = _.uniqBy(ccDefinitions, (def) => def.component.name);
		uiUniqueDefinitions = _.uniqBy(uiDefinitions, (def) => def.component.name);

		console.log("Summary:");
		console.log(primeDefinitions.length, "PrimeFaces component definitions found");
		console.log(richDefinitions.length, "RichFaces component definitions found");
		console.log(richA4JDefinitions.length, "RichFaces A4J component definitions found");
		console.log(hDefinitions.length, "H Facelets component definitions found");
		console.log(fDefinitions.length, "F Facelets component definitions found");
		console.log(cDefinitions.length, "C Facelets component definitions found");
		console.log(ccDefinitions.length, "CC Facelets component definitions found");
		console.log(uiDefinitions.length, "UI Facelets component definitions found");

		console.log(primeUniqueDefinitions.length, "unique PrimeFaces component definitions found");
		console.log(richUniqueDefinitions.length, "unique RichFaces component definitions found");
		console.log(richA4JUniqueDefinitions.length, "unique RichFaces A4J component definitions found");
		console.log(hUniqueDefinitions.length, "unique H Facelets component definitions found");
		console.log(fUniqueDefinitions.length, "unique F Facelets component definitions found");
		console.log(cUniqueDefinitions.length, "unique C Facelets component definitions found");
		console.log(ccUniqueDefinitions.length, "unique CC Facelets component definitions found");
		console.log(uiUniqueDefinitions.length, "unique UI Facelets component definitions found");

		console.log(failedLogsCount, "failed attempts to parse. List of the documents:");
		console.log(failedLogs);

		notifier.notify("zap", "Components cached (click to cache again)");
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

		let xmlnsTags: Map<string, string> = getXmlns(document, position);
		let completionItems;

		// Components

		let tagHDoc = xmlnsTags.has("h") ? xmlnsTags.get('h') : "";
		let tagFDoc = xmlnsTags.has("f") ? xmlnsTags.get('f') : "";
		let tagPDoc = xmlnsTags.has("p") ? xmlnsTags.get('p') : "";
		let tagRDoc = xmlnsTags.has("r") ? xmlnsTags.get('r') : "";
		let tagA4JDoc = xmlnsTags.has("a4j") ? xmlnsTags.get('a4j') : "";
		let tagCDoc = xmlnsTags.has("c") ? xmlnsTags.get('c') : "";
		let tagCCDoc = xmlnsTags.has("cc") ? xmlnsTags.get('cc') : "";
		let tagUIDoc = xmlnsTags.has("ui") ? xmlnsTags.get('ui') : "";

		if (facelet !== "" && (
			facelet === tagHDoc
			|| facelet === tagFDoc
			|| facelet === tagCDoc
			|| facelet === tagCCDoc
			|| facelet === tagUIDoc
			|| facelet === tagPDoc
			|| facelet === tagRDoc
			|| facelet === tagA4JDoc
		)) {
			// Creates a collection of CompletionItem based on the classes already cached
			if (facelet === tagPDoc) {
				completionItems = primeUniqueDefinitions
					.filter((definition) =>
						autoSearch === '' || definition.component.name.startsWith(autoSearch))
					.map((definition) => {
						const completionItem = new CompletionItem(definition.component.name, CompletionItemKind.Property);
						completionItem.documentation = definition.component.description;
						const completionClassName = `${classPrefix}${definition.component.name}`;
						completionItem.filterText = completionClassName;
						completionItem.insertText = completionClassName;
						return completionItem;
					});
			}
			else if (facelet === tagRDoc) {
				completionItems = richUniqueDefinitions
					.filter((definition) =>
						autoSearch === '' || definition.component.name.startsWith(autoSearch))
					.map((definition) => {
						const completionItem = new CompletionItem(definition.component.name, CompletionItemKind.Property);
						completionItem.documentation = definition.component.description;
						const completionClassName = `${classPrefix}${definition.component.name}`;
						completionItem.filterText = completionClassName;
						completionItem.insertText = completionClassName;
						return completionItem;
					});
			}
			else if (facelet === tagA4JDoc) {
				completionItems = richA4JUniqueDefinitions
					.filter((definition) =>
						autoSearch === '' || definition.component.name.startsWith(autoSearch))
					.map((definition) => {
						const completionItem = new CompletionItem(definition.component.name, CompletionItemKind.Property);
						completionItem.documentation = definition.component.description;
						const completionClassName = `${classPrefix}${definition.component.name}`;
						completionItem.filterText = completionClassName;
						completionItem.insertText = completionClassName;
						return completionItem;
					});
			}
			else if (facelet === tagHDoc) {
				completionItems = hUniqueDefinitions
					.filter((definition) =>
						autoSearch === '' || definition.component.name.startsWith(autoSearch))
					.map((definition) => {
						const completionItem = new CompletionItem(definition.component.name, CompletionItemKind.Property);
						completionItem.documentation = definition.component.description;
						const completionClassName = `${classPrefix}${definition.component.name}`;
						completionItem.filterText = completionClassName;
						completionItem.insertText = completionClassName;
						return completionItem;
					});

			}
			else if (facelet === tagFDoc) {
				completionItems = fUniqueDefinitions
					.filter((definition) =>
						autoSearch === '' || definition.component.name.startsWith(autoSearch))
					.map((definition) => {
						const completionItem = new CompletionItem(definition.component.name, CompletionItemKind.Property);
						completionItem.documentation = definition.component.description;
						const completionClassName = `${classPrefix}${definition.component.name}`;
						completionItem.filterText = completionClassName;
						completionItem.insertText = completionClassName;
						return completionItem;
					});
			}
			else if (facelet === tagCDoc) {
				completionItems = cUniqueDefinitions
					.filter((definition) =>
						autoSearch === '' || definition.component.name.startsWith(autoSearch))
					.map((definition) => {
						const completionItem = new CompletionItem(definition.component.name, CompletionItemKind.Property);
						completionItem.documentation = definition.component.description;
						const completionClassName = `${classPrefix}${definition.component.name}`;
						completionItem.filterText = completionClassName;
						completionItem.insertText = completionClassName;
						return completionItem;
					});

			}
			else if (facelet === tagCCDoc) {
				completionItems = ccUniqueDefinitions
					.filter((definition) =>
						autoSearch === '' || definition.component.name.startsWith(autoSearch))
					.map((definition) => {
						const completionItem = new CompletionItem(definition.component.name, CompletionItemKind.Property);
						completionItem.documentation = definition.component.description;
						const completionClassName = `${classPrefix}${definition.component.name}`;
						completionItem.filterText = completionClassName;
						completionItem.insertText = completionClassName;
						return completionItem;
					});

			}
			else {
				completionItems = uiUniqueDefinitions
					.filter((definition) =>
						autoSearch === '' || definition.component.name.startsWith(autoSearch))
					.map((definition) => {
						const completionItem = new CompletionItem(definition.component.name, CompletionItemKind.Property);
						completionItem.documentation = definition.component.description;
						const completionClassName = `${classPrefix}${definition.component.name}`;
						completionItem.filterText = completionClassName;
						completionItem.insertText = completionClassName;
						return completionItem;
					});
			}
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

	if (allText.includes(pTag)) {
		xmlns.set("p", getTag(allText, pTag));
	}
	if (allText.includes(pTag)) {
		xmlns.set("r", getTag(allText, rTag));
	}
	if (allText.includes(pTag)) {
		xmlns.set("a4j", getTag(allText, a4jTag));
	}
	if (allText.includes(hTag)) {
		xmlns.set("h", getTag(allText, hTag));
	}
	if (allText.includes(fTag)) {
		xmlns.set("f", getTag(allText, fTag));
	}
	if (allText.includes(cTag)) {
		xmlns.set("c", getTag(allText, cTag));
	}
	if (allText.includes(ccTag)) {
		xmlns.set("cc", getTag(allText, ccTag));
	}
	if (allText.includes(uiTag)) {
		xmlns.set("ui", getTag(allText, uiTag));
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
			//PUEDE SER
			// if (e.affectsConfiguration(Configuration.includeGlobPattern)) {
			// 	await cache();
			// }
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