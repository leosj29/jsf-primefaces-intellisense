import { IParseEngine } from "./common";
import { C, CC, F, H, Omnifaces, Primefaces10, Primefaces11, Primefaces12, Primefaces8, PrimefacesExtensions, Richfaces, RichfacesA4J, UI } from "./types";

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
        new Primefaces12(),
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
