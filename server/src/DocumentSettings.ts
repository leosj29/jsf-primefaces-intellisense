import { JsfLibrary } from './types/JsfFramework';

export default interface DocumentSettings {
    activeNamespaces: ActiveNamespace[];
}

export interface ActiveNamespace {
    nsPrefix: string;
    url: string;
    xmlNs?: JsfLibrary;
}