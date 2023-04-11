import { ComponentDefinition } from "../../../common";
import { ComponentExtractor, IParseEngine } from "../../common";
import * as data from '../../data/jakarta/h.json';

class H implements IParseEngine {
    public taglibId = "h";
    public  parse(version: string): ComponentDefinition[] {
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default H;
