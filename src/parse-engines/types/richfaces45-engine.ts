import IParseEngine from "../common/parse-engine";
import ComponentExtractor from "../common/component-extractor";
import ComponentDefinition from "../../common/component-definition";
import * as primefaces10 from '../data/richfaces45.json';

class RichfacesParseEngine implements IParseEngine {
    public languageId = "richfaces45";

    public async parse(version: string): Promise<ComponentDefinition[]> {
        const textJson = JSON.stringify(primefaces10.components.component);
        return ComponentExtractor.extract(textJson);
    }
}
export default RichfacesParseEngine;
