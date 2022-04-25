import IParseEngine from "../common/parse-engine";
import ComponentExtractor from "../common/component-extractor";
import ComponentDefinition from "../../common/component-definition";
import * as data from '../data/f.json';

class FFaceletsParseEngine implements IParseEngine {
    public languageId = "f";

    public async parse(version: string): Promise<ComponentDefinition[]> {
        const textJson = JSON.stringify(data.components.component);
        return ComponentExtractor.extract(textJson);
    }
}
export default FFaceletsParseEngine;
