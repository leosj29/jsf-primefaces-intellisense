import { ComponentDefinition } from "../../common";
import { ComponentExtractor, IParseEngine } from "../common";
import * as data from '../data/richfaces45-a4j.json';

class RichfacesA4J implements IParseEngine {
    public taglibId = "richfaces45-a4j";
    public parse(version: string): ComponentDefinition[] {
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default RichfacesA4J;
