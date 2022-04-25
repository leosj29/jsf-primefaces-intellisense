import IParseEngine from "../common/parse-engine";
import ComponentExtractor from "../common/component-extractor";
import ComponentDefinition from "../../common/component-definition";
import * as data from '../data/ui.json';

class UIFaceletsParseEngine implements IParseEngine {
    public languageId = "ui";

    public async parse(version: string): Promise<ComponentDefinition[]> {
        const textJson = JSON.stringify(data.components.component);
        return ComponentExtractor.extract(textJson);
    }
}
export default UIFaceletsParseEngine;
