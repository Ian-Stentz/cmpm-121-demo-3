// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet, { LatLng } from "leaflet";

// Helpers
import { Cell, Coin, Cache } from "./interfaces.ts";
import { Board } from "./board.ts";
import { Panmode, MapManager } from "./mapManager.ts";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

//TODO : move to map manager
const APP_NAME = "Santa Cruz Geocoin";
const app = document.querySelector<HTMLDivElement>("#app")!;
const title = app.querySelector<HTMLDivElement>("#title")!;
const header = app.querySelector<HTMLDivElement>("#header")!;
const mapElem = app.querySelector<HTMLDivElement>("#map")!;
const footer = app.querySelector<HTMLDivElement>("#footer")!;

const HOME = leaflet.latLng(36.98949379578401, -122.06277128548504);
const ZOOM = 18;
const TILE_DEGREES = .0001;
const REACH_TILES = 8;
const CHANCE_PER_CELL = 0.1;

const InventoryChangeEvent = new Event("inventory-changed");
const PlayerMovedEvent = new Event("player-moved");

const mapManager = new MapManager(mapElem, HOME, ZOOM);

document.title = APP_NAME;
title.innerHTML = APP_NAME;

//TODO : move to map manager
let playerLocation: LatLng = HOME;
const playerPath: LatLng[] = new Array<LatLng>();
let inventory: Cache = {
  coins: [],
  toMomento: cacheToMomento,
  fromMomento: cacheFromMomento,
};
const board: Board = new Board(TILE_DEGREES, REACH_TILES);
let geoWatch: boolean = false;
let geoID: number;

function cellToLatLng(cell: Cell): LatLng {
  return new LatLng(cell.i * TILE_DEGREES, cell.j * TILE_DEGREES);
}

function cacheToMomento(cache: Cache) {
  return JSON.stringify(cache.coins);
}

function cacheFromMomento(momento: string): Coin[] {
  return JSON.parse(momento);
}

function getCoinCode(coin: Coin): string {
  return `${coin.cell.i}:${coin.cell.j}#${coin.serial}`;
}

function panCoin(coin: Coin) {
  mapManager.panTo(cellToLatLng(coin.cell), Panmode.focused);
}

function addCacheList(
  element: HTMLElement,
  cache: Cache,
  collectable: boolean = false,
  cell?: Cell,
) {
  if (cache.coins.length > 0) {
    const coinList = document.createElement("ol");
    coinList.id = "coinList";
    element.appendChild(coinList);
    for (const coin of cache.coins) {
      const listItem = document.createElement("li");
      listItem.innerHTML = getCoinCode(coin);
      if (collectable) {
        const collectButton = document.createElement("button");
        collectButton.innerHTML = "Collect";
        collectButton.addEventListener("click", () => {
          collect(coin);
          cache.coins.splice(cache.coins.indexOf(coin), 1);
          board.saveCache(cell!, cache.toMomento(cache));
          board.saveInventory(JSON.stringify(inventory));
          coinList.removeChild(listItem);
        });
        listItem.append(collectButton);
      } else {
        const navigateButton = document.createElement("button");
        navigateButton.innerHTML = "Navigate To";
        navigateButton.addEventListener("click", () => {
          panCoin(coin);
        });
        listItem.append(navigateButton);
      }
      coinList.appendChild(listItem);
    }
  }
}

function removeCacheList(element: HTMLElement) {
  const listElem = element.querySelector<HTMLOListElement>("#coinList");
  if (listElem) {
    element.removeChild(listElem);
  }
}

function collect(coin: Coin): Coin {
  inventory.coins.push(coin);
  app.dispatchEvent(InventoryChangeEvent);
  return coin;
}

function deposit(): Coin | undefined {
  if (inventory.coins.length > 0) {
    const coin = inventory.coins.pop();
    app.dispatchEvent(InventoryChangeEvent);
    return coin;
  } else {
    return undefined;
  }
}

//TODO : MapManager
function resetGrid(playerCell: leaflet.LatLng) {
  mapManager.initialStateMap();
  movePlayer(playerCell);
}

//TODO : MapManager
function movePlayer(newLocation: leaflet.LatLng) {
  playerLocation = newLocation;
  mapManager.movePlayerMarker(newLocation);
  const cellsNearPlayer: Cell[] = board.getCellsNearPoint(newLocation);
  for (const button of board.removeButtonsOoR(cellsNearPlayer)) {
    mapManager.removeRect(button);
  }
  for (const cell of cellsNearPlayer) {
    if (
      luck([cell.i, cell.j].toString()) < CHANCE_PER_CELL &&
      !board.cellhasButton(cell)
    ) {
      spawnCache(cell);
    }
  }
  app.dispatchEvent(PlayerMovedEvent);
}

//TODO : Draw Polyline whenever a "player-moved" event is dispatched
app.addEventListener("player-moved", () => {
  playerPath.push(playerLocation);
  mapManager.drawPolyline(playerPath);
});

function loadInventory() {
  const loadedInventory = board.loadInventory();
  if (loadedInventory) {
    inventory = JSON.parse(loadedInventory);
  } else {
    inventory = {
      coins: [],
      toMomento: cacheToMomento,
      fromMomento: cacheFromMomento,
    };
  }
  app.dispatchEvent(InventoryChangeEvent);
}

function spawnCache(cell : Cell) {
  const {i, j} = cell;
  const coords: LatLng = cellToLatLng(cell);
  const retrieveCache = board.loadCache(cell);
  
  const newCache: Cache = {
    coins: [],
    toMomento: cacheToMomento,
    fromMomento: cacheFromMomento,
  };

  if (retrieveCache) {
    newCache.coins = newCache.fromMomento(retrieveCache);
  } else {
    const coinsGenerated = Math.floor(
      Math.ceil(luck([i, j, "initialValue"].toString()) * 5),
    );
    for (let n = 0; n < coinsGenerated; n++) {
      newCache.coins.push({ cell: board.getCellForPoint(coords), serial: n });
    }
  }

  const rect = mapManager.addRect(board.getCellBounds(cell), () => {
    // The popup offers a description and button
    const popupDiv = document.createElement("div");

    popupDiv.innerHTML = `
                <div>There is a cache here at "${i * TILE_DEGREES},${
      j * TILE_DEGREES
    }".\n Coins: <span id="value"></span></div>
                <button id="give">give a coin</button>`;
    //insert list into span
    addCacheList(
      popupDiv.querySelector<HTMLSpanElement>("#value")!,
      newCache,
      true,
      cell,
    );
    popupDiv
      .querySelector<HTMLButtonElement>("#give")!
      .addEventListener("click", () => {
        const shinyCoin: Coin | undefined = deposit();
        if (shinyCoin) {
          newCache.coins.push(shinyCoin);
          removeCacheList(popupDiv.querySelector<HTMLSpanElement>("#value")!);
          addCacheList(
            popupDiv.querySelector<HTMLSpanElement>("#value")!,
            newCache,
            true,
            cell,
          );
          board.saveCache(cell, newCache.toMomento(newCache));
          board.saveInventory(JSON.stringify(inventory));
        }
      });
    return popupDiv;
  });
  board.addCellButton(cell, rect);
}

function buttonMove(dir: Cell): void {
  movePlayer(
    new LatLng(
      playerLocation.lat + dir.i * TILE_DEGREES,
      playerLocation.lng + dir.j * TILE_DEGREES,
    ),
  );
}

function createMoveButton(dir: Cell, icon: string) {
  const newButton = document.createElement("button");
  newButton.addEventListener("click", () => {
    buttonMove(dir);
  });
  newButton.innerHTML = icon;
  header.append(newButton);
}

function toggleGeoWatch() {
  if (geoWatch) {
    navigator.geolocation.clearWatch(geoID);
  } else {
    geoID = navigator.geolocation.watchPosition((position) => {
      movePlayer(
        new LatLng(position.coords.latitude, position.coords.longitude),
      );
    }, () => {
      alert("Position not found");
    });
  }
  geoWatch = !geoWatch;
}

//TODO : Create geolocator button, moves player when player leaves bounds of current cell
const geoLocationButton = document.createElement("button");
geoLocationButton.addEventListener("click", () => {
  toggleGeoWatch();
});
geoLocationButton.innerHTML = "🌐";
header.append(geoLocationButton);

createMoveButton({ i: 1, j: 0 }, "UP");
createMoveButton({ i: 0, j: -1 }, "LEFT");
createMoveButton({ i: -1, j: 0 }, "DOWN");
createMoveButton({ i: 0, j: 1 }, "RIGHT");

const clearButton = document.createElement("button");
clearButton.addEventListener("click", () => {
  const answer: string | null = prompt(
    "Do you really want to clear data? Type YES to confirm: ",
  );
  if (answer && answer.toLowerCase().trim() == "yes") {
    board.clearPersistentState();
    resetGrid(playerLocation);
    loadInventory();
  }
});
clearButton.innerHTML = "🚮";
header.append(clearButton);

const recenterButton = document.createElement("button");
recenterButton.innerHTML = ">📍";
recenterButton.addEventListener("click", () => {
  mapManager.panTo(playerLocation, Panmode.playerLocation);
});
header.append(recenterButton);

const footerInventory = document.createElement("div");
footerInventory.innerHTML = "Inventory:<br>";
const inventorySpan = document.createElement("span");
inventorySpan.id = "#inventory";
footerInventory.appendChild(inventorySpan);
footer.append(footerInventory);
app.addEventListener("inventory-changed", () => {
  removeCacheList(inventorySpan);
  addCacheList(inventorySpan, inventory);
});
footer.append(footerInventory);
loadInventory();

resetGrid(HOME);
