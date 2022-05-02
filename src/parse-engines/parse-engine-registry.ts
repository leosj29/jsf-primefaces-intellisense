import IParseEngine from "./common/parse-engine";
import Primefaces8ParseEngine from "./types/primefaces8-parse-engine";
import Primefaces10ParseEngine from "./types/primefaces10-parse-engine";
import HFaceletsParseEngine from "./types/h-facelets-parse-engine";
import FFaceletsParseEngine from "./types/f-facelets-parse-engine ";
import CFaceletsParseEngine from "./types/c-facelets-parse-engine";
import CCFaceletsParseEngine from "./types/cc-facelets-parse-engine";
import UIFaceletsParseEngine from "./types/ui-facelets-parse-engine";
import RichfacesParseEngine from "./types/richfaces45-engine";
import RichfacesA4JParseEngine from './types/richfaces45-a4j-engine';
import OmnifacesFaceletsParseEngine from "./types/omnifaces-facelets-parse-engine";
import PrimefacesExtensionsFaceletsParseEngine from "./types/primefacesExtensions-facelets-parse-engine";

class ParseEngineRegistry {
    public static getParseEngine(taglibId: string): IParseEngine {
        const foundParseEngine = ParseEngineRegistry.registry.find((value) => value.taglibId === taglibId);

        if (!foundParseEngine) {
            throw new Error(`Could not find a parse engine for the provided id ("${taglibId}").`);
        }
        return foundParseEngine;
    }

    public static get supportedLanguagesIds(): string[] {
        if (!ParseEngineRegistry.languagesIds) {
            ParseEngineRegistry.languagesIds = ParseEngineRegistry.registry.map(
                (parseEngine) => parseEngine.taglibId);
        }
        return ParseEngineRegistry.languagesIds;
    }

    private static languagesIds: string[];
    private static registry: IParseEngine[] = [
        new Primefaces8ParseEngine(),
        new Primefaces10ParseEngine(),
        new RichfacesParseEngine(),
        new RichfacesA4JParseEngine(),
        new HFaceletsParseEngine(),
        new FFaceletsParseEngine(),
        new CFaceletsParseEngine(),
        new CCFaceletsParseEngine(),
        new UIFaceletsParseEngine(),
        new OmnifacesFaceletsParseEngine(),
        new PrimefacesExtensionsFaceletsParseEngine()
    ];
}
export default ParseEngineRegistry;
