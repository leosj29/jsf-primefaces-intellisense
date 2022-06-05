import IParseEngine from "../common/parse-engine";
import ComponentExtractor from "../common/component-extractor";
import ComponentDefinition from "../../common/component-definition";
import * as data from '../data/omnifaces.json';

class Omnifaces implements IParseEngine {
    public taglibId = "omnifaces";
    public parse(version: string): ComponentDefinition[]{
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default Omnifaces;
