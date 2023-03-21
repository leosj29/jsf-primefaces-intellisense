import { ComponentDefinition } from "../../common";
import { ComponentExtractor, IParseEngine } from "../common";
import * as data from '../data/primefaces-extensions.json';

class PrimefacesExtensions implements IParseEngine {
    public taglibId = "primefaces-extensions";
    public parse(version: string): ComponentDefinition[]{
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default PrimefacesExtensions;
