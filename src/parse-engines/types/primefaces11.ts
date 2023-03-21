import { ComponentDefinition } from "../../common";
import { ComponentExtractor, IParseEngine } from "../common";
import * as data from '../data/primefaces11.json';

class Primefaces11 implements IParseEngine {
    public taglibId = "primefaces11";
    public parse(version: string): ComponentDefinition[] {
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default Primefaces11;
