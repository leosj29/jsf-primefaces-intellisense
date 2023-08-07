import { XMLParser } from 'fast-xml-parser';
import { join } from 'path';
import { DocumentUri } from 'vscode-languageserver-textdocument';
import UserSettings from '../UserSettings';
import { Component, JsfLibraryDefinitions } from '../model/JsfLibraryDefinitions';
import { JsfFramework, JsfLibrary } from '../types/JsfFramework';
import { parseTagLibXml } from '../utils/JsfDefinitionUtils';

export class DefinitionCache {
    private jsfLibraryCache: Map<string, JsfLibrary> = new Map();
    private parser = new XMLParser();

    /**
     * Index Tag Library Descriptor
     * @param documentUri Path to taglib.xml file
     */
    public addTagLibXml(documentUri: DocumentUri): void {
        try {
            const localJsfLiberary = parseTagLibXml(documentUri);
            this.jsfLibraryCache.set(localJsfLiberary.url, localJsfLiberary);
        } catch (err) {
            console.error("Error indexing %s - %s", documentUri, err);
        }
    }

        /**
     * Removing Tag Library Descriptor from index
     * @param documentUri Path to taglib.xml file
     */
    public deleteTagLibXml(documentUri: DocumentUri): void {
        try {
            const localJsfLiberary = parseTagLibXml(documentUri);
            this.jsfLibraryCache.delete(localJsfLiberary.url)
        } catch (err) {
            console.error("Error deleting %s from index - %s", documentUri, err);
        }
    }

    public getJsfLibrary(url: string, userSettings: UserSettings): JsfLibrary | undefined {
        if (!this.jsfLibraryCache.has(url)) {
            const jsfLibrary = this.getSupportedXmlNamespaces(userSettings, url);
            if (jsfLibrary) {
                this.jsfLibraryCache.set(url, jsfLibrary);
            } else {
                console.warn(`URL ${url} is not supported`);
                return;
            }
        }
        return this.loadJsfElements(this.jsfLibraryCache.get(url)!);
    }
    
    private loadJsfElements(jsfLibrary: JsfLibrary): JsfLibrary {
        if (!jsfLibrary.definitionUri
            && (!jsfLibrary.components || jsfLibrary.components.length === 0)
        ) {
            jsfLibrary.components = this.loadElementDefinitions(jsfLibrary);
        }
        return jsfLibrary;
    }
    
    /**
     * Load all taglib content from xmlns (components and attributes).
     * Loading is only done if the elements have not been loaded previously.
     * 
     * @param xmlns
     */
    private loadElementDefinitions(jsfLibrary: JsfLibrary): Component[] {
        const file = [jsfLibrary.framework, jsfLibrary.extension, jsfLibrary.version]
            .filter(string => string)
            .join("-") + ".json"
        const dataFilename = join(__dirname, "..", "parse-engines", "data", jsfLibrary.framework, file);

        const jsonFile = require(dataFilename) as JsfLibraryDefinitions;
        return jsonFile.components.component;
    }

    private getSupportedXmlNamespaces(userSettings: UserSettings, url: string): JsfLibrary | undefined {
        switch (url) {
            case "http://richfaces.org/a4j":
                return {
                    url: url,
                    framework: JsfFramework.Richfaces,
                    extension: "a4j",
                    version: userSettings.richVersion,
                    description: "Richfaces - Ajax4Jsf"
                };
            case "http://richfaces.org/rich":
                return {
                    url: url,
                    version: userSettings.richVersion,
                    framework: JsfFramework.Richfaces,
                    description: "Richfaces"
                };
            case "http://omnifaces.org/ui":
                return {
                    url: url,
                    version: userSettings.omniVersion,
                    framework: JsfFramework.Omnifaces,
                    description: "Omnifaces"
                };
            case "http://primefaces.org/ui":
                return {
                    url: url,
                    version: userSettings.primeVersion,
                    framework: JsfFramework.Primefaces,
                    description: "Primefaces"
                };
            case "http://primefaces.org/ui/extensions":
                return {
                    url: url,
                    framework: JsfFramework.Primefaces,
                    extension: "extensions",
                    version: userSettings.primeExtVersion ?? userSettings.primeVersion,
                    description: "Primefaces Extention"
                };
            case "http://java.sun.com/jsf/":
            case "http://xmlns.jcp.org/jsp/jstl/core":
                return {
                    url: url,
                    framework: JsfFramework.Jsf,
                    extension: "c",
                    description: "JSF Tags Core"
                };
            case "jakarta.tags.core":
                return {
                    url: url,
                    framework: JsfFramework.Jakarta,
                    extension: "c",
                    version: userSettings.facesVersion,
                    description: "Jakarta Tags Core"
                };
            case "http://java.sun.com/jsf/composite":
            case "http://xmlns.jcp.org/jsf/composite":
                return {
                    url: url,
                    framework: JsfFramework.Jsf,
                    extension: "cc",
                    description: "JSF Composite"
                };
            case "jakarta.faces.composite":
                return {
                    url: url,
                    framework: JsfFramework.Jakarta,
                    extension: "cc",
                    version: userSettings.facesVersion,
                    description: "Jakarta Composite"
                };
            case "http://java.sun.com/jsf/core":
            case "http://xmlns.jcp.org/jsf/core":
                return {
                    url: url,
                    framework: JsfFramework.Jsf,
                    extension: "f",
                    description: "JSF Faces Core"
                };
            case "jakarta.faces.core":
                return {
                    url: url,
                    framework: JsfFramework.Jakarta,
                    extension: "f",
                    version: userSettings.facesVersion,
                    description: "Jakarta Faces Core"
                };
            case "http://java.sun.com/jsf/html":
            case "http://xmlns.jcp.org/jsf/html":
                return {
                    url: url,
                    framework: JsfFramework.Jsf,
                    extension: "h",
                    description: "JSF Faces HTML"
                };
            case "jakarta.faces.html":
                return {
                    url: url,
                    framework: JsfFramework.Jakarta,
                    extension: "h",
                    version: userSettings.facesVersion,
                    description: "Jakarta Faces HTML"
                };
            case "http://java.sun.com/jsf/facelets":
            case "http://xmlns.jcp.org/jsf/facelets":
                return {
                    url: url,
                    framework: JsfFramework.Jsf,
                    extension: "ui",
                    description: "JSF Facelets"
                };
            case "jakarta.faces.facelets": 
                return {
                    url: url,
                    framework: JsfFramework.Jakarta,
                    extension: "ui",
                    version: userSettings.facesVersion,
                    description: "Jakarta Facelets"
                };
        }
    }
}