import { Component } from '../model/JsfLibraryDefinitions';

export type JsfLibrary = {
    id: string;
    url: string;
    framework: JsfFramework;
    extension?: string;
    version?: string;
    description: string;
    components?: Component[];
}

export enum JsfFramework {
    Jsf = "jsf",
    Jakarta = "jakarta",
    Omnifaces = "omnifaces",
    Primefaces = "primefaces",
    Richfaces = "richfaces"
}

// enum Jsf