import IParseEngine from "../common/parse-engine";
import ComponentExtractor from "../common/component-extractor";
import ComponentDefinition from "../../common/component-definition";
import * as data from '../data/cc.json';

class CCFaceletsParseEngine implements IParseEngine {
    public taglibId = "cc";
    public parse(version: string):ComponentDefinition[] {
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default CCFaceletsParseEngine;
