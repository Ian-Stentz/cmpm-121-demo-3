export interface Cell {
    readonly i: number;
    readonly j: number;
}

export interface Coin {
    cell: Cell;
    serial: number;
}

export interface Cache {
    coins: Coin[];
    toMomento(cache: Cache): string;
    fromMomento(momento: string): Coin[];
}