import IParseEngine from "../common/parse-engine";
import ComponentExtractor from "../common/component-extractor";
import ComponentDefinition from "../../common/component-definition";
import * as data from '../data/h.json';

class HFaceletsParseEngine implements IParseEngine {
    public taglibId = "h";
    public  parse(version: string): ComponentDefinition[] {
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default HFaceletsParseEngine;
