import IParseEngine from "../common/parse-engine";
import ComponentExtractor from "../common/component-extractor";
import ComponentDefinition from "../../common/component-definition";
import * as primefaces8 from '../data/primefaces8.json';

class Primefaces8ParseEngine implements IParseEngine {
    public languageId = "primefaces8";

    public async parse(version: string): Promise<ComponentDefinition[]> {
        const textJson = JSON.stringify(primefaces8.components.component);
        return ComponentExtractor.extract(textJson);
    }
}
export default Primefaces8ParseEngine;
