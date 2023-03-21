import { ComponentDefinition } from "../../common";

interface IParseEngine {
    taglibId: string;
    parse(version: string): ComponentDefinition[];
}
export default IParseEngine;
