export type JsfLibraryDefinitions = {
    components: Components
}

export interface Components {
    component: Component[];
}

export interface Component {
    name:        string;
    description: string;
    attribute:   Attribute[];
}

export interface Attribute {
    name:        string;
    required:    boolean;
    type:        string;
    description: string;
}
