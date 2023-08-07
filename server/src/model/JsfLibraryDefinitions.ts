export type JsfLibraryDefinitions = {
    components: Components
}

export type Components = {
    component: Component[];
}

export type Component = {
    name:          string;
    description:   string;
    deprecated:    boolean;
    handlerClass?: string;
    attribute:     Attribute[];
}

export type Attribute = {
    name:        string;
    required:    boolean;
    type:        string;
    description: string;
    deprecated:  boolean;
}
