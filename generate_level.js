
import fs from 'fs';
import { PNG } from 'pngjs';
import path from 'path';

const args = process.argv.slice(2);

if (args.length < 2) {
    console.error('Usage: node generate_level.js <input_image_path> <output_json_path>');
    process.exit(1);
}

const IMG_PATH = args[0];
const OUT_PATH = args[1];

const TILE_SIZE = 16;
// 400x256 image -> 25x16 tiles
const MAP_WIDTH = 25;
const MAP_HEIGHT = 16;

// IDs
const TILE_VOID = 0;
const TILE_SOLID = 1;
const TILE_WATER = 2;
const TILE_ICE = 3;
const TILE_SPRING = 4;

function getColor(r, g, b) {
    // Rough color matching logic
    if (r > 150 && g > 150 && b > 200) return 'ice'; // Light blue/white
    if (b > 150 && r < 100) return 'water'; // Blue
    if (r > 100 && g < 100 && b < 100) return 'solid'; // Brown/Reddish
    // Check for slightly lighter brown (bricks sometimes vary)
    if (r > 100 && g > 50 && b < 50) return 'solid';
    return 'void';
}

fs.createReadStream(IMG_PATH)
    .pipe(new PNG())
    .on('parsed', function () {
        const visualData = new Array(MAP_WIDTH * MAP_HEIGHT).fill(0);
        const tileProperties = [];

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                // Sample multiple points in the tile for better accuracy
                let rTotal = 0, gTotal = 0, bTotal = 0;
                let samples = 0;

                // Sample a 8x8 area in the center of the 16x16 tile
                for (let sy = 4; sy < 12; sy++) {
                    for (let sx = 4; sx < 12; sx++) {
                        const px = x * TILE_SIZE + sx;
                        const py = y * TILE_SIZE + sy;
                        const idx = (this.width * py + px) << 2;
                        rTotal += this.data[idx];
                        gTotal += this.data[idx + 1];
                        bTotal += this.data[idx + 2];
                        samples++;
                    }
                }

                const r = rTotal / samples;
                const g = gTotal / samples;
                const b = bTotal / samples;

                let type = 'void';
                // Refined heuristics based on the generated level1.png
                // Ice: Very bright, high R, G, B
                if (r > 180 && g > 180 && b > 210) type = 'ice';
                // Water: Dominant Blue, lower R/G
                else if (b > 130 && b > r && b > g) type = 'water';
                // Solid: Brown/Tan (Brick) - R is dominant, G is medium, B is low
                else if (r > 100 && r > b && (r - b) > 30) type = 'solid';

                const tileIdx = y * MAP_WIDTH + x;
                const gid = tileIdx + 1;

                visualData[tileIdx] = gid;

                // Track properties for this tile index
                const props = {
                    id: tileIdx,
                    properties: [
                        { name: "collides", type: "bool", value: type === 'solid' || type === 'ice' },
                        { name: "water", type: "bool", value: type === 'water' },
                        { name: "ice", type: "bool", value: type === 'ice' }
                    ]
                };
                tileProperties.push(props);
            }
        }

        const levelData = {
            "compressionlevel": -1,
            "height": 16,
            "infinite": false,
            "layers": [
                {
                    "data": visualData,
                    "height": 16,
                    "id": 1,
                    "name": "Background",
                    "opacity": 1,
                    "type": "tilelayer",
                    "visible": true,
                    "width": 25,
                    "x": 0,
                    "y": 0
                }
            ],
            "nextlayerid": 2,
            "nextobjectid": 1,
            "orientation": "orthogonal",
            "renderorder": "right-down",
            "tiledversion": "1.10.2",
            "tileheight": 16,
            "tilesets": [
                {
                    "columns": 25,
                    "firstgid": 1,
                    "image": path.basename(IMG_PATH),
                    "imageheight": 256,
                    "imagewidth": 400,
                    "margin": 0,
                    "name": path.basename(IMG_PATH, path.extname(IMG_PATH)),
                    "spacing": 0,
                    "tilecount": 400,
                    "tileheight": 16,
                    "tilewidth": 16,
                    "tiles": tileProperties
                }
            ],
            "tilewidth": 16,
            "type": "map",
            "version": "1.10",
            "width": 25
        };

        fs.writeFileSync(OUT_PATH, JSON.stringify(levelData, null, 2));
        console.log('Level JSON generated at ' + OUT_PATH);
    });
