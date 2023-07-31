import { ComponentDefinition } from ".";

class XmlNamespace {
    id: string = "";
    aliasInDoc?: string = "";
    urls: string[] = [];
    dataFilename: string = "";
    description: string = "";
    uniqueDefinitions: ComponentDefinition[] = [];
}

export default XmlNamespace;