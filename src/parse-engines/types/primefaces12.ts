import { ComponentDefinition } from "../../common";
import { ComponentExtractor, IParseEngine } from "../common";
import * as data from '../data/primefaces12.json';

class Primefaces12 implements IParseEngine {
    public taglibId = "primefaces12";
    public parse(version: string): ComponentDefinition[] {
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default Primefaces12;
