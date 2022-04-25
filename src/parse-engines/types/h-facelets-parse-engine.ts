import IParseEngine from "../common/parse-engine";
import ComponentExtractor from "../common/component-extractor";
import ComponentDefinition from "../../common/component-definition";
import * as data from '../data/h.json';

class HFaceletsParseEngine implements IParseEngine {
    public languageId = "h";

    public async parse(version: string): Promise<ComponentDefinition[]> {
        const textJson = JSON.stringify(data.components.component);
        return ComponentExtractor.extract(textJson);
    }
}
export default HFaceletsParseEngine;
