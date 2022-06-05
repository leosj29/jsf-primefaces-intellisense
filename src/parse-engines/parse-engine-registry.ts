import IParseEngine from "./common/parse-engine";
import Primefaces8 from "./types/primefaces8";
import Primefaces10 from "./types/primefaces10";
import Primefaces11 from "./types/primefaces11";
import H from "./types/h";
import F from "./types/f";
import C from "./types/c";
import CC from "./types/cc";
import UI from "./types/ui";
import Richfaces from "./types/richfaces45";
import RichfacesA4J from './types/richfaces45-a4j';
import Omnifaces from "./types/omnifaces";
import PrimefacesExtensions from "./types/primefacesExtensions";

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
        new Primefaces8(),
        new Primefaces10(),
        new Primefaces11(),
        new Richfaces(),
        new RichfacesA4J(),
        new H(),
        new F(),
        new C(),
        new CC(),
        new UI(),
        new Omnifaces(),
        new PrimefacesExtensions()
    ];
}
export default ParseEngineRegistry;
