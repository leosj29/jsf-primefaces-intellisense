import { DocumentUri } from 'vscode-languageserver-textdocument';
import { Component } from '../model/JsfLibraryDefinitions';

export type JsfLibrary = {
    url: string;
    framework: JsfFramework | string;
    extension?: string;
    version?: string;
    description: string;
    definitionUri?: DocumentUri;
    compositeLibraryName?: string;
    components?: Component[];
}

export enum JsfFramework {
    Jsf = "jsf",
    Jakarta = "jakarta",
    Omnifaces = "omnifaces",
    Primefaces = "primefaces",
    Richfaces = "richfaces"
}
