import ComponentDefinition from "./component-definition";

class XmlNamespace {
    id: string = "";
    aliasInDoc?: string = "";
    url: string = "";
    dataFilename: string = "";
    uniqueDefinitions: ComponentDefinition[] = [];
}

export default XmlNamespace;