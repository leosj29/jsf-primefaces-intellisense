import ComponentDefinition from "./component-definition";

class XmlNamespace {
    id: string = "";
    aliasInDoc?: string = "";
    urls: string[] = [];
    dataFilename: string = "";
    uniqueDefinitions: ComponentDefinition[] = [];
}

export default XmlNamespace;