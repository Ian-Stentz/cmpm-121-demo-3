// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet, { LatLng } from "leaflet";
import { Board, Cell } from "./board.ts"

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

const HOME = leaflet.latLng(36.98949379578401, -122.06277128548504);
const ZOOM = 18;
const TILE_DEGREES = .0001;
const REACH_TILES = 8;
const CHANCE_PER_CELL = 0.1;

interface Cache {
  coins: Coin[];
}

interface Coin {
  cell: Cell;
  serial: number;
}

const InventoryChangeEvent = new Event("inventory-changed");

const APP_NAME = "Santa Cruz Geocoin";
const app = document.querySelector<HTMLDivElement>("#app")!;
const title = app.querySelector<HTMLDivElement>("#title")!;
//const header = app.querySelector<HTMLDivElement>("#header")!;
const mapElem = app.querySelector<HTMLDivElement>("#map")!;
const footer = app.querySelector<HTMLDivElement>("#footer")!;

const inventory : Cache = {coins : []};
const board : Board = new Board(TILE_DEGREES, REACH_TILES);

function CellToLatLng(cell: Cell): LatLng {
  return new LatLng(cell.i * TILE_DEGREES, cell.j * TILE_DEGREES);
}

// function CellToOrderedPair(cell : Cell) : number[]{
//   return [cell.i, cell.j];
// }

// function CellEquals(cellA : Cell, cellB : Cell) : boolean{
//   return (cellA.i == cellB.i && cellA.j == cellB.j);
// }

function getCoinCode(coin : Coin) : string {
  return `${coin.cell.i}:${coin.cell.j}#${coin.serial}`;
}

function formatCacheString(cache : Cache) : string {
  let outString : string = "<ol>";
  for(const coin of cache.coins) {
    outString += "<li>" + getCoinCode(coin) + "</li>";
  }
  outString += "<ol>";
  return outString;
};

function Collect(coin: Coin): Coin {
  inventory.coins.push(coin);
  app.dispatchEvent(InventoryChangeEvent);
  return coin;
}

function Deposit(): Coin | undefined {
  if (inventory.coins.length > 0) {
    const coin = inventory.coins.pop();
    app.dispatchEvent(InventoryChangeEvent);
    return coin;
  } else {
    return undefined;
  }
}

document.title = APP_NAME;
title.innerHTML = APP_NAME;

// function alertButFunct() {
//   alert("you clicked the button");
// }

// const alertButton = document.createElement("button");
// alertButton.innerHTML = "ALERT";
// alertButton.addEventListener("click", alertButFunct);
// header.append(alertButton);

const map = leaflet.map(mapElem, {
  center: HOME,
  zoom: ZOOM,
  minZoom: ZOOM - 2,
  maxZoom: ZOOM + 2,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: ZOOM,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(HOME);
playerMarker.bindTooltip("Where it all started");
playerMarker.addTo(map);

function spawnCache(i: number, j: number) {
  const coords : LatLng = CellToLatLng({ i: i, j: j });

  // Dot to represent cache
  const rect = leaflet.rectangle(board.getCellBounds({ i: i, j: j }));
  rect.addTo(map);

  const newCache: Cache = { coins: [] };
  const coinsGenerated = Math.floor(
    Math.ceil(luck([i, j, "initialValue"].toString()) * 5),
  );
  for (let n = 0; n < coinsGenerated; n++) {
    //console.log({ cell : board.getCellForPoint(coords), serial: n })
    newCache.coins.push({ cell : board.getCellForPoint(coords), serial: n });
  }

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${i * TILE_DEGREES},${j * TILE_DEGREES}".\n Coins: <span id="value">${formatCacheString(newCache)}</span></div>
                <button id="take">take a coin</button>
                <button id="give">give a coin</button>`;

    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#take")!
      .addEventListener("click", () => {
        console.log("yoink");
        // deno-lint-ignore prefer-const
        let shinyCoin: Coin | undefined = newCache.coins.pop();
        if (shinyCoin) {
          Collect(shinyCoin);
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            formatCacheString(newCache);
        }
      });
    popupDiv
      .querySelector<HTMLButtonElement>("#give")!
      .addEventListener("click", () => {
        console.log("keepthechange");
        // deno-lint-ignore prefer-const
        let shinyCoin: Coin | undefined = Deposit();
        if (shinyCoin) {
          newCache.coins.push(shinyCoin);
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            formatCacheString(newCache);
        }
      });
    return popupDiv;
  });
}

//spawn caches with 10% chance per tile if they are within 8 tiles' Manhattan Distance
for (const cell of board.getCellsNearPoint(HOME)) {
  if(luck([cell.i, cell.j].toString()) < CHANCE_PER_CELL) {
    //console.log(cell.i, cell.j);
    spawnCache(cell.i, cell.j);
  }
}

const footerInventory = document.createElement("div");
footerInventory.innerHTML = `Coins: ${formatCacheString(inventory)}`;
app.addEventListener("inventory-changed", () => {
  footerInventory.innerHTML = `Coins: ${formatCacheString(inventory)}`;
});
footer.append(footerInventory);
