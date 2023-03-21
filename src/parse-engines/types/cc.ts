import { ComponentDefinition } from "../../common";
import { ComponentExtractor, IParseEngine } from "../common";
import * as data from '../data/cc.json';

class CC implements IParseEngine {
    public taglibId = "cc";
    public parse(version: string): ComponentDefinition[] {
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default CC;
