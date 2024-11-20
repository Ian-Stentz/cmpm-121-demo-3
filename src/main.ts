// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet, { LatLng } from "leaflet";
import { Board, Cell } from "./board.ts";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

interface Cache {
  coins: Coin[];
  toMomento(cache: Cache): string;
  fromMomento(momento: string): Coin[];
}

interface Coin {
  cell: Cell;
  serial: number;
}

const HOME = leaflet.latLng(36.98949379578401, -122.06277128548504);
const ZOOM = 18;
const TILE_DEGREES = .0001;
const REACH_TILES = 8;
const CHANCE_PER_CELL = 0.1;

const InventoryChangeEvent = new Event("inventory-changed");
const PlayerMovedEvent = new Event("player-moved");

const APP_NAME = "Santa Cruz Geocoin";
const app = document.querySelector<HTMLDivElement>("#app")!;
const title = app.querySelector<HTMLDivElement>("#title")!;
const header = app.querySelector<HTMLDivElement>("#header")!;
const mapElem = app.querySelector<HTMLDivElement>("#map")!;
const footer = app.querySelector<HTMLDivElement>("#footer")!;

document.title = APP_NAME;
title.innerHTML = APP_NAME;

const map = leaflet.map(mapElem, {
  center: HOME,
  zoom: ZOOM,
  minZoom: ZOOM,
  maxZoom: ZOOM,
  zoomControl: false,
  scrollWheelZoom: false,
});

let playerMarker: leaflet.Marker | null;
let playerLocation: LatLng = HOME;
let inventory: Cache;
const board: Board = new Board(TILE_DEGREES, REACH_TILES);

const stateDependentGroup = leaflet.layerGroup().addTo(map);

const homeMarker = leaflet.marker(HOME);
homeMarker.bindTooltip("Where it all started");
homeMarker.addTo(map);

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

function formatCacheString(cache: Cache): string {
  let outString: string = "<ol>";
  for (const coin of cache.coins) {
    outString += "<li>" + getCoinCode(coin) + "</li>";
  }
  outString += "<ol>";
  return outString;
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

function initializeGrid(playerCell: leaflet.LatLng) {
  stateDependentGroup.clearLayers();
  movePlayer(playerCell);
}

//TODO : New movement paradigm that only clears caches that leave the map & the player marker, and only spawns in newly visible caches & the player marker
function movePlayer(newLocation: leaflet.LatLng) {
  if (playerMarker) {
    playerMarker.remove();
  }
  playerMarker = leaflet.marker(newLocation);
  playerMarker.bindTooltip("Current Location");
  playerMarker.addTo(stateDependentGroup);
  map.panTo(newLocation);
  board.printCellsToButtons();
  const cellsNearPlayer: Cell[] = board.getCellsNearPoint(newLocation);
  console.log(cellsNearPlayer);
  board.removeButtonsOoR(cellsNearPlayer);
  for (const cell of cellsNearPlayer) {
    if (
      luck([cell.i, cell.j].toString()) < CHANCE_PER_CELL &&
      !board.cellhasButton(cell)
    ) {
      spawnCache(cell.i, cell.j);
    }
  }
  app.dispatchEvent(PlayerMovedEvent);
}

//TODO : Draw Polyline whenever a "player-moved" event is dispatched
app.addEventListener("player-move", () => {
});

function loadInventory() {
  const loadedInventory = board.loadInventory();
  if (loadedInventory) {
    console.log(loadedInventory);
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

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: ZOOM,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

function spawnCache(i: number, j: number) {
  const correspondingCell: Cell = { i: i, j: j };
  const coords: LatLng = cellToLatLng(correspondingCell);

  // Dot to represent cache
  const rect = leaflet.rectangle(board.getCellBounds(correspondingCell));
  rect.addTo(stateDependentGroup);
  board.addCellButton(correspondingCell, rect);

  const newCache: Cache = {
    coins: [],
    toMomento: cacheToMomento,
    fromMomento: cacheFromMomento,
  };
  const retrieveCache = board.loadCache(correspondingCell);
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

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${i * TILE_DEGREES},${
      j * TILE_DEGREES
    }".\n Coins: <span id="value">${formatCacheString(newCache)}</span></div>
                <button id="take">take a coin</button>
                <button id="give">give a coin</button>`;

    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#take")!
      .addEventListener("click", () => {
        const shinyCoin: Coin | undefined = newCache.coins.pop();
        if (shinyCoin) {
          collect(shinyCoin);
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            formatCacheString(newCache);
          board.saveCache(correspondingCell, newCache.toMomento(newCache));
          board.saveInventory(JSON.stringify(inventory));
        }
      });
    popupDiv
      .querySelector<HTMLButtonElement>("#give")!
      .addEventListener("click", () => {
        const shinyCoin: Coin | undefined = deposit();
        if (shinyCoin) {
          newCache.coins.push(shinyCoin);
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            formatCacheString(newCache);
          board.saveCache(correspondingCell, newCache.toMomento(newCache));
          board.saveInventory(JSON.stringify(inventory));
        }
      });
    return popupDiv;
  });
}

//TODO : Coin Clicks pan camera to those locations

function buttonMove(dir: Cell): void {
  playerLocation = new LatLng(
    playerLocation.lat + dir.i * TILE_DEGREES,
    playerLocation.lng + dir.j * TILE_DEGREES,
  );
  movePlayer(playerLocation);
}

function createMoveButton(dir: Cell, icon: string) {
  const newButton = document.createElement("button");
  newButton.addEventListener("click", () => {
    buttonMove(dir);
  });
  newButton.innerHTML = icon;
  header.append(newButton);
}

//TODO : Create geolocator button, moves player when player leaves bounds of current cell

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
    initializeGrid(playerLocation);
    loadInventory();
  }
});
clearButton.innerHTML = "🚮";
header.append(clearButton);

const footerInventory = document.createElement("div");
app.addEventListener("inventory-changed", () => {
  footerInventory.innerHTML = `Coins: ${formatCacheString(inventory)}`;
});
footer.append(footerInventory);

loadInventory();

initializeGrid(HOME);
