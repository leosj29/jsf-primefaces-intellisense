import VError = require("verror");
import ComponentDefinition from "./common/component-definition";
import IParseEngine from "./parse-engines/common/parse-engine";
import ParseEngineRegistry from "./parse-engines/parse-engine-registry";

class ParseEngineGateway {
    public static async callParser(version: string): Promise<ComponentDefinition[]> {
        const parseEngine: IParseEngine = ParseEngineRegistry.getParseEngine(version);
        const componentDefinitions: ComponentDefinition[] = await parseEngine.parse(version);
        return componentDefinitions;
    }
}
export default ParseEngineGateway;
