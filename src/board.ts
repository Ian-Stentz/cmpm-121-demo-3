import leaflet from "leaflet";

export interface Cell {
    readonly i: number;
    readonly j: number;
  }
  

export class Board {

    readonly tileWidth: number;
    readonly tileVisibilityRadius: number;

    private readonly knownCells: Map<string, Cell>;

    constructor(tileWidth: number, tileVisibilityRadius: number) {
        this.tileWidth = tileWidth;
        this.tileVisibilityRadius = tileVisibilityRadius;
        this.knownCells = new Map<string, Cell>;
    }

    private getCanonicalCell(cell: Cell): Cell {
        const { i, j } = cell;
        const key = [i, j].toString();
        // ...
        return this.knownCells.get(key)!;
    }

    getCellForPoint(point: leaflet.LatLng): Cell {
        return this.getCanonicalCell({
           i : point.lat / this.tileWidth, j : point.lng / this.tileWidth
        });
    }

    getCellBounds(cell: Cell): leaflet.LatLngBounds {
    	return new leaflet.LatLngBounds (
            cell.i * this.tileWidth, cell.j * this.tileWidth,
            (cell.i + 1) * this.tileWidth, (cell.j + 1) * this.tileWidth
        )
    }

    getCellsNearPoint(point: leaflet.LatLng): Cell[] {
        const resultCells: Cell[] = [];
        const originCell = this.getCellForPoint(point);
        // ...
        return resultCells;
    }
}
