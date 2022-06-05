import IParseEngine from "../common/parse-engine";
import ComponentExtractor from "../common/component-extractor";
import ComponentDefinition from "../../common/component-definition";
import * as data from '../data/c.json';

class C implements IParseEngine {
    public taglibId = "c";
    public parse(version: string): ComponentDefinition[]{
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default C;
