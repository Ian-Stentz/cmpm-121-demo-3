import leaflet from "leaflet";
//linter being finnicky
export interface Cell {
  readonly i: number;
  readonly j: number;
}

function ManhattanDistance(cellA: Cell, cellB: Cell): number {
  return Math.abs(cellA.i - cellB.i) + Math.abs(cellA.j - cellB.j);
}

const window: Window = document.defaultView!;
const localStore: Storage = window.localStorage!;
const inventoryKey: string = "player";
const cacheKey: string = "localCacheStorage";

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;
  private readonly cellsToButtons: Map<string, leaflet.Rectangle>;
  //private readonly savedCaches: Map<string, string>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map<string, Cell>();
    this.cellsToButtons = new Map<string, leaflet.Rectangle>();
    // this.savedCaches = new Map<string, string>();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: Math.round(point.lat / this.tileWidth),
      j: Math.round(point.lng / this.tileWidth),
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return new leaflet.LatLngBounds([
      [cell.i * this.tileWidth, cell.j * this.tileWidth],
      [(cell.i + 1) * this.tileWidth, (cell.j + 1) * this.tileWidth],
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    for (
      let i = -this.tileVisibilityRadius;
      i < this.tileVisibilityRadius;
      i++
    ) {
      for (
        let j = -this.tileVisibilityRadius;
        j < this.tileVisibilityRadius;
        j++
      ) {
        const currentCell: Cell = { i: originCell.i + i, j: originCell.j + j };
        if (
          ManhattanDistance(originCell, currentCell) <=
            this.tileVisibilityRadius
        ) {
          resultCells.push(currentCell);
        }
      }
    }
    return resultCells;
  }

  printCellsToButtons() {
    console.log(this.cellsToButtons);
  }

  addCellButton(cell: Cell, button: leaflet.Rectangle) {
    const { i, j } = cell;
    const key = [i, j].toString();
    this.cellsToButtons.set(key, button);
  }

  cellhasButton(cell: Cell): boolean {
    const { i, j } = cell;
    const key = [i, j].toString();
    return this.cellsToButtons.has(key);
  }

  //Removes buttons not in cell list / Out of Range (OoR)
  removeButtonsOoR(cellsInRange: Cell[]) {
    const stringList: string[] = cellsInRange.map((cell: Cell) => {
      const { i, j } = cell;
      return [i, j].toString();
    });
    for (const myCell of Array.from(this.cellsToButtons.keys())) {
      if (stringList.indexOf(myCell) == -1) {
        this.cellsToButtons.get(myCell).remove();
      }
    }
  }

  saveCache(cell: Cell, cacheData: string) {
    const { i, j } = cell;
    const key = [i, j].toString() + cacheKey;
    localStore.setItem(key, cacheData);
  }

  loadCache(cell: Cell): string | undefined {
    const { i, j } = cell;
    const key = [i, j].toString() + cacheKey;
    if (!localStore.getItem(key)) {
      return undefined;
    } else {
      return localStore.getItem(key)!;
    }
  }

  saveInventory(cacheData: string) {
    localStore.setItem(inventoryKey, cacheData);
  }

  loadInventory(): string | undefined {
    if (!localStore.getItem(inventoryKey)) {
      return undefined;
    } else {
      return localStore.getItem(inventoryKey)!;
    }
  }

  clearPersistentState() {
    localStore.clear();
  }
}
