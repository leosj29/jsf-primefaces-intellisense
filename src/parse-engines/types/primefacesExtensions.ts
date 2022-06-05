import IParseEngine from "../common/parse-engine";
import ComponentExtractor from "../common/component-extractor";
import ComponentDefinition from "../../common/component-definition";
import * as data from '../data/primefaces-extensions.json';

class PrimefacesExtensions implements IParseEngine {
    public taglibId = "primefaces-extensions";
    public parse(version: string): ComponentDefinition[]{
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default PrimefacesExtensions;
