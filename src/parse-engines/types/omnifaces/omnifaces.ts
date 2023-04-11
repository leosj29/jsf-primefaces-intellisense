import { ComponentDefinition } from "../../../common";
import { ComponentExtractor, IParseEngine } from "../../common";
import * as data from '../../data/omnifaces/omnifaces.json';

class Omnifaces implements IParseEngine {
    public taglibId = "omnifaces";
    public parse(version: string): ComponentDefinition[]{
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default Omnifaces;
