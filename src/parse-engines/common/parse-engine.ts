import ComponentDefinition from "../../common/component-definition";

interface IParseEngine {
    taglibId: string;
    parse(version:string): Promise<ComponentDefinition[]>;
}
export default IParseEngine;
