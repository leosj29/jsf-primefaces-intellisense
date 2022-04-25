import { IAttribute } from "./iattribute";

export interface IComponent {
    description: string;
    name: string;
    attribute: IAttribute[];
}