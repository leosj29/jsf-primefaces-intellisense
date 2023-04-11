import { ComponentDefinition } from "../../../common";
import { ComponentExtractor, IParseEngine } from "../../common";
import * as data from '../../data/jakarta/ui.json';

class UI implements IParseEngine {
    public taglibId = "ui";
    public parse(version: string): ComponentDefinition[] {
        return ComponentExtractor.extract(JSON.stringify(data.components.component));
    }
}
export default UI;
