import leaflet from "leaflet";

export interface Cell {
    readonly i: number;
    readonly j: number;
}
  
function ManhattanDistance(cellA: Cell, cellB: Cell): number {
    return Math.abs(cellA.i - cellB.i) + Math.abs(cellA.j - cellB.j);
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
        if(!this.knownCells.has(key)) {
            this.knownCells.set(key, cell);
        }
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
        for (let i = -this.tileVisibilityRadius; i < this.tileVisibilityRadius; i++) {
            for (let j = -this.tileVisibilityRadius; j < this.tileVisibilityRadius; j++) {
                const currentCell : Cell = { i: originCell.i + i, j: originCell.j + j }
                if (ManhattanDistance(originCell, currentCell) <= this.tileVisibilityRadius) {
                    resultCells.push(currentCell);
                }
            }
          }
        return resultCells;
    }
}
