import IParseEngine from "../common/parse-engine";
import ComponentExtractor from "../common/component-extractor";
import ComponentDefinition from "../../common/component-definition";
import * as data from '../data/richfaces45.json';

class RichfacesParseEngine implements IParseEngine {
    public taglibId = "richfaces45";
    public async parse(version: string): Promise<ComponentDefinition[]> {
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default RichfacesParseEngine;
