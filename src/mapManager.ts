import leaflet, { Map, Marker, LatLng, Polyline, LayerGroup, LatLngBounds, Rectangle } from "leaflet";
//import { Cell, Coin, Cache } from "./interfaces.ts";

export enum Panmode {
    playerLocation,
    focused,
}

export class MapManager {
    private map: Map;
    public homeCoords: LatLng;
    public zoom: number;
    public tileDeg: number;
    private playerMarker: Marker | null;
    private playerPolyline: Polyline | null;
    private stateDependentGroup : LayerGroup;
    private homeMarker: Marker | null;
    private panmode : Panmode;

    constructor(mapElement: HTMLElement, home: LatLng, zoom: number, tileDeg: number) {
        this.homeCoords = home;
        this.zoom = zoom;
        this.tileDeg = tileDeg;
        this.map = leaflet.map(mapElement, {
            center: home,
            zoom: zoom,
            minZoom: zoom,
            maxZoom: zoom,
            zoomControl: false,
            scrollWheelZoom: false,
            closePopupOnClick: true,
        });
        this.playerMarker = null;
        this.playerPolyline = null;
        this.stateDependentGroup = leaflet.layerGroup().addTo(this.map);
        this.panmode = Panmode.playerLocation;

        this.homeMarker = leaflet.marker(home);
        this.homeMarker.options.opacity = 0.7;
        this.homeMarker.bindTooltip("Where it all started");
        this.homeMarker.addTo(this.map);

        leaflet
            .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: zoom,
                attribution:
                '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            })
            .addTo(this.map);
    }

    initialStateMap() {
        this.stateDependentGroup.clearLayers();
    }

    addRect(bounds: LatLngBounds, popupBinding  : () => void) : Rectangle {
        const rect = leaflet.rectangle(bounds);
        rect.addTo(this.stateDependentGroup);
        rect.bindPopup(popupBinding);
        return rect;
    }

    removeRect(rect : Rectangle) {
        rect.remove();
    }

    movePlayerMarker(newLoc : LatLng) {
        if (this.playerMarker) {
            this.playerMarker.remove();
        }
        this.playerMarker = leaflet.marker(newLoc);
        this.playerMarker.bindTooltip("Current Location");
        this.playerMarker.addTo(this.stateDependentGroup);
        if(this.panmode == Panmode.playerLocation) {
            this.panTo(newLoc);
        }
    }

    drawPolyline(pathData : LatLng[]) {
        if (this.playerPolyline) {
            this.playerPolyline.remove();
        }
        this.playerPolyline = leaflet.polyline(pathData);
        this.playerPolyline.options.color = "#cc4eb3";
        this.playerPolyline.addTo(this.stateDependentGroup);
    }

    panTo(newLoc : LatLng, newPanmode? : Panmode) {
        if(newPanmode != undefined) {
            this.panmode = newPanmode;
        }
        this.map.panTo(newLoc);
    }
}