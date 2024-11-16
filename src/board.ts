// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

interface Cell {
  i: number;
  j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map<string, Cell>();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const cell: Cell = { i: point.lat, j: point.lng };
    return this.getCanonicalCell(cell);
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const { i, j } = cell;
    const south = i - this.tileWidth / 2;
    const north = i + this.tileWidth / 2;
    const west = j - this.tileWidth / 2;
    const east = j + this.tileWidth / 2;
    return leaflet.latLngBounds(
      leaflet.latLng(south, west),
      leaflet.latLng(north, east),
    );
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    for (
      let i = -this.tileVisibilityRadius;
      i <= this.tileVisibilityRadius;
      i++
    ) {
      for (
        let j = -this.tileVisibilityRadius;
        j <= this.tileVisibilityRadius;
        j++
      ) {
        if (
          this.knownCells.get(
            [originCell.i + i, originCell.j + j].toString(),
          ) != null
        ) {
          resultCells.push(
            this.knownCells.get(
              [originCell.i + i, originCell.j + j].toString(),
            )!,
          );
        }
      }
    }
    return resultCells;
  }

  addCell(i: number, j: number): void {
    const key = [i, j].toString();
    if (this.knownCells.get(key) == null) {
      this.knownCells.set(key, { i, j });
    }
  }
}
