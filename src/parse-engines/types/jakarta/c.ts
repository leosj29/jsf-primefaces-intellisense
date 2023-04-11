
import { ComponentDefinition } from "../../../common";
import { ComponentExtractor, IParseEngine } from "../../common";
import * as data from '../../data/jakarta/c.json';

class C implements IParseEngine {
    public taglibId = "c";
    public parse(version: string): ComponentDefinition[] {
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default C;
