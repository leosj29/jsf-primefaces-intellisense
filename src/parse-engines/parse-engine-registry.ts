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

class ParseEngineRegistry {
    public static getParseEngine(languageId: string): IParseEngine {
        const foundParseEngine = ParseEngineRegistry.registry.find((value) => value.languageId === languageId);

        if (!foundParseEngine) {
            throw new Error(`Could not find a parse engine for the provided id ("${languageId}").`);
        }
        return foundParseEngine;
    }

    public static get supportedLanguagesIds(): string[] {
        if (!ParseEngineRegistry.languagesIds) {
            ParseEngineRegistry.languagesIds = ParseEngineRegistry.registry.map(
                (parseEngine) => parseEngine.languageId);
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
        new UIFaceletsParseEngine()
    ];
}
export default ParseEngineRegistry;
