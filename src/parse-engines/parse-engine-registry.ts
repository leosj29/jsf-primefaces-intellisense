import { workspace } from "vscode";
import { IParseEngine } from "./common";
import { C, CC, CC_JAKARTA, C_JAKARTA, F, F_JAKARTA, H, H_JAKARTA, Omnifaces, Primefaces10, Primefaces11, Primefaces12, Primefaces8, PrimefacesExtensions, Richfaces, RichfacesA4J, UI, UI_JAKARTA } from "./types";

enum Configuration {
    primeVersion = "jsf-primefaces-intellisense.primeVersion",
    facesVersion = "jsf-primefaces-intellisense.facesVersion"
}
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

    public static isJakartaVersion = (): boolean => {
        const faces: string = workspace.getConfiguration().get<string>(Configuration.facesVersion) || '';
        if (faces === "Java Server Faces (1.0 - 2.2)" || faces === "Jakarta Server Faces (2.3 - 3.0)") {
            return false;
        }
        return true;
    }

    public static primefacesVersion = (): IParseEngine => {
        const prime: string = workspace.getConfiguration().get<string>(Configuration.primeVersion) || '';
        if (prime === "primefaces8") {
            return new Primefaces8();
        }
        else if (prime === "primefaces10") {
            return new Primefaces10();
        }
        else if (prime === "primefaces11") {
            return new Primefaces11();
        }
        else {
            return new Primefaces12();
        }
    }

    private static languagesIds: string[];
    private static registry: IParseEngine[] = [
        new Richfaces(),
        new RichfacesA4J(),
        ParseEngineRegistry.primefacesVersion(),
        !ParseEngineRegistry.isJakartaVersion() ? new H() : new H_JAKARTA(),
        !ParseEngineRegistry.isJakartaVersion() ? new F() : new F_JAKARTA(),
        !ParseEngineRegistry.isJakartaVersion() ? new C() : new C_JAKARTA(),
        !ParseEngineRegistry.isJakartaVersion() ? new CC() : new CC_JAKARTA(),
        !ParseEngineRegistry.isJakartaVersion() ? new UI() : new UI_JAKARTA(),
        new Omnifaces(),
        new PrimefacesExtensions()
    ];
}
export default ParseEngineRegistry;
