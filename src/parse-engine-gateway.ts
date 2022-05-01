import VError = require("verror");
import ComponentDefinition from "./common/component-definition";
import IParseEngine from "./parse-engines/common/parse-engine";
import ParseEngineRegistry from "./parse-engines/parse-engine-registry";

class ParseEngineGateway {
    public static callParser(version: string): ComponentDefinition[] {
        const parseEngine: IParseEngine = ParseEngineRegistry.getParseEngine(version);
        const componentDefinitions: ComponentDefinition[] = parseEngine.parse(version);
        return componentDefinitions;
    }
}
export default ParseEngineGateway;
