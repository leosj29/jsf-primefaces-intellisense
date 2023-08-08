import { DocumentUri } from 'vscode-languageserver-textdocument';

export type JsfLibraryDefinitions = {
    components: Components
}

export type Components = {
    component: Component[];
}

export type Component = {
    name:           string;
    description:    string;
    deprecated:     boolean;
    handlerClass?:  string;
    definitionUri?: DocumentUri;
    attributes:     Attribute[];
}

export type Attribute = {
    name:             string;
    required:         boolean;
    defaultValue?:    unknown;
    methodSignature?: string
    type:             string;
    description:      string;
    deprecated:       boolean;
}
