
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Helper to determine tile type string from properties
function getTileType(collides, water, ice) {
    if (ice) return 'ice';
    if (water) return 'water';
    if (collides) return 'solid';
    return 'void';
}

app.post('/save-level', (req, res) => {
    const { level, tiles } = req.body; // tiles is an array of { id, collides, water, ice }

    if (!level || !tiles) {
        return res.status(400).send('Missing level or tiles data');
    }

    const filePath = path.join(__dirname, 'public', 'assets', 'levels', `${level}.json`);

    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).send(`Level file not found: ${filePath}`);
        }

        const rawData = fs.readFileSync(filePath, 'utf8');
        const levelData = JSON.parse(rawData);

        // Update tile properties
        // tilesets[0].tiles is where properties are stored
        if (levelData.tilesets && levelData.tilesets.length > 0) {
            const tileset = levelData.tilesets[0];

            // Map incoming tiles to the format expected by Tiled JSON
            // We'll reconstruct the 'tiles' array in the tileset
            // Assuming the frontend sends ALL tiles or we merge. 
            // Better to just update finding by ID.

            if (!tileset.tiles) tileset.tiles = [];

            tiles.forEach(clientTile => {
                let existingTile = tileset.tiles.find(t => t.id === clientTile.id);

                if (!existingTile) {
                    existingTile = {
                        id: clientTile.id,
                        properties: []
                    };
                    tileset.tiles.push(existingTile);
                }

                // Ensure properties exist
                const propNames = ['collides', 'water', 'ice'];
                const propValues = {
                    collides: clientTile.collides,
                    water: clientTile.water,
                    ice: clientTile.ice
                };

                // Clear or update properties
                existingTile.properties = propNames.map(name => ({
                    name: name,
                    type: 'bool',
                    value: propValues[name]
                }));
            });

            // Sort by ID to keep it clean
            tileset.tiles.sort((a, b) => a.id - b.id);
        }

        fs.writeFileSync(filePath, JSON.stringify(levelData, null, 2));
        console.log(`Saved level ${level} to ${filePath}`);
        res.send({ success: true, message: `Level ${level} saved successfully` });

    } catch (err) {
        console.error('Error saving level:', err);
        res.status(500).send('Error saving level');
    }
});

app.listen(port, () => {
    console.log(`Level Editor Server running at http://localhost:${port}`);
});
