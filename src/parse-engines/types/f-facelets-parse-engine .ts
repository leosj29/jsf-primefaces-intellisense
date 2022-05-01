import IParseEngine from "../common/parse-engine";
import ComponentExtractor from "../common/component-extractor";
import ComponentDefinition from "../../common/component-definition";
import * as data from '../data/f.json';

class FFaceletsParseEngine implements IParseEngine {
    public taglibId = "f";
    public async parse(version: string): Promise<ComponentDefinition[]> {
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default FFaceletsParseEngine;
