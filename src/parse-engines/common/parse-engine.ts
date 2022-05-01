import ComponentDefinition from "../../common/component-definition";

interface IParseEngine {
    taglibId: string;
    parse(version:string): ComponentDefinition[];
}
export default IParseEngine;
