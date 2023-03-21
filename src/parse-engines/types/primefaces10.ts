import { ComponentDefinition } from "../../common";
import { ComponentExtractor, IParseEngine } from "../common";
import * as data from '../data/primefaces10.json';

class Primefaces10 implements IParseEngine {
    public taglibId = "primefaces10";
    public parse(version: string): ComponentDefinition[] {
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default Primefaces10;
