import IParseEngine from "../common/parse-engine";
import ComponentExtractor from "../common/component-extractor";
import ComponentDefinition from "../../common/component-definition";
import * as data from '../data/richfaces45-a4j.json';

class RichfacesA4JParseEngine implements IParseEngine {
    public taglibId = "richfaces45-a4j";
    public async parse(version: string): Promise<ComponentDefinition[]> {
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default RichfacesA4JParseEngine;
