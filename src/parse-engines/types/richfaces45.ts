import { ComponentDefinition } from "../../common";
import { ComponentExtractor, IParseEngine } from "../common";
import * as data from '../data/richfaces45.json';

class Richfaces implements IParseEngine {
    public taglibId = "richfaces45";
    public parse(version: string): ComponentDefinition[] {
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default Richfaces;
