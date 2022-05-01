import IParseEngine from "../common/parse-engine";
import ComponentExtractor from "../common/component-extractor";
import ComponentDefinition from "../../common/component-definition";
import * as data from '../data/ui.json';

class UIFaceletsParseEngine implements IParseEngine {
    public taglibId = "ui";
    public async parse(version: string): Promise<ComponentDefinition[]> {
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default UIFaceletsParseEngine;
