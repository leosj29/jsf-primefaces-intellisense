import ComponentDefinition from "../../common/component-definition";

interface IParseEngine {
    languageId: string;
    parse(version:string): Promise<ComponentDefinition[]>;
}
export default IParseEngine;
