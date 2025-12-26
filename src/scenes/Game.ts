import Phaser from 'phaser';
import Player from '../objects/Player';

export default class Game extends Phaser.Scene {
    private players: Player[] = [];

    constructor() {
        super('game');
    }

    private debugGraphics: Phaser.GameObjects.Graphics | null = null;
    private debugTexts: Phaser.GameObjects.Text[] = [];
    private backgroundLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private playerScores: number[] = [0, 0, 0, 0];
    private scoreboardTexts: Phaser.GameObjects.Text[] = [];
    private bgMusic: Phaser.Sound.BaseSound | null = null;

    create() {
        const map = this.make.tilemap({ key: 'level2' });
        const tileset = map.addTilesetImage('level2', 'level2_tiles');

        if (!tileset) {
            console.error('Tileset not found');
            return;
        }

        this.backgroundLayer = map.createLayer('Background', tileset, 0, 0);

        // Constrain physics world to level area (not including scoreboard)
        this.physics.world.setBounds(0, 0, 400, 256);

        // Spawn Players
        const p1 = new Player(this, 30, 30, 'hare_idle', {
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            jump: Phaser.Input.Keyboard.KeyCodes.UP
        });

        const p2 = new Player(this, 370, 30, 'deer_idle', {
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            jump: Phaser.Input.Keyboard.KeyCodes.W
        });

        this.players.push(p1, p2);

        this.createScoreboard();

        // Start background music
        this.bgMusic = this.sound.add('bgMusic', { loop: true, volume: 0.5 });
        this.bgMusic.play();

        // Spacebar to toggle music
        this.input.keyboard!.on('keydown-SPACE', () => {
            if (this.bgMusic) {
                if (this.bgMusic.isPlaying) {
                    this.bgMusic.pause();
                } else {
                    this.bgMusic.resume();
                }
            }
        });

        if (this.backgroundLayer) {
            this.backgroundLayer.setCollisionByProperty({ collides: true });
            this.physics.add.collider(this.players, this.backgroundLayer);

            this.physics.add.overlap(this.players, this.backgroundLayer, (playerObj: any, tile: any) => {
                const player = playerObj as Player;
                if (tile && tile.properties && tile.properties.water) {
                    player.setInWater(true);
                }
            });
        }

        // Player vs Player
        this.physics.add.collider(p1, p2, (obj1, obj2) => {
            const player1 = obj1 as Player;
            const player2 = obj2 as Player;

            if (player1.body!.touching.down && player2.body!.touching.up) {
                player1.bounce();
                this.createExplosion(player2.x, player2.y);
                player2.kill();
                this.playerScores[0]++;
                this.updateScoreboard();
            } else if (player2.body!.touching.down && player1.body!.touching.up) {
                player2.bounce();
                this.createExplosion(player1.x, player1.y);
                player1.kill();
                this.playerScores[1]++;
                this.updateScoreboard();
            }
        });

        // Toggle Debug Mode
        this.input.keyboard!.on('keydown-F2', () => {
            this.physics.world.drawDebug = !this.physics.world.drawDebug;

            // Clear Phaser's default debug graphic if we turn it off, 
            // though 'drawDebug' flag handles the physics bodies.
            // We handle our custom tile highlighting separately:

            if (this.physics.world.drawDebug) {
                this.drawDebug();
                console.log("Debug Mode: ON - Click tiles to edit.");
            } else {
                if (this.debugGraphics) {
                    this.debugGraphics.clear();
                    this.debugGraphics.destroy();
                    this.debugGraphics = null;
                }
                this.debugTexts.forEach(t => t.destroy());
                this.debugTexts = [];

                this.saveLevelData(); // Save on exit
                console.log("Debug Mode: OFF - Level saved.");
            }
        });

        // Level Editor: Click to cycle properties
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.debugGraphics) {
                this.handleTileClick(pointer);
            }
        });

        // Create blood splat animation
        this.anims.create({
            key: 'blood_splat',
            frames: this.anims.generateFrameNumbers('blood_splat', { start: 0, end: 7 }),
            frameRate: 15,
            repeat: 0
        });
    }

    drawDebug() {
        if (!this.backgroundLayer) return;

        // Clear existing
        if (this.debugGraphics) {
            this.debugGraphics.clear();
        } else {
            this.debugGraphics = this.add.graphics();
        }

        // Ensure texts are cleared
        this.debugTexts.forEach(t => t.destroy());
        this.debugTexts = [];

        this.backgroundLayer.forEachTile((tile) => {
            // Draw boxes based on properties
            if (tile.properties.collides) {
                this.debugGraphics!.lineStyle(1, 0x00FF00, 1); // Green for solid
                this.debugGraphics!.strokeRect(tile.pixelX, tile.pixelY, tile.width, tile.height);
            }
            if (tile.properties.water) {
                this.debugGraphics!.lineStyle(1, 0x0000FF, 1); // Blue for water
                this.debugGraphics!.strokeRect(tile.pixelX + 2, tile.pixelY + 2, tile.width - 4, tile.height - 4);
            }
            if (tile.properties.ice) {
                this.debugGraphics!.lineStyle(1, 0x00FFFF, 1); // Cyan for ice
                this.debugGraphics!.strokeRect(tile.pixelX + 4, tile.pixelY + 4, tile.width - 8, tile.height - 8);
            }

            // Draw ID text
            if (tile.index !== -1) {
                const text = this.add.text(tile.pixelX + 8, tile.pixelY + 8, String(tile.index - 1), {
                    fontSize: '8px',
                    color: '#ffffff',
                    fontFamily: 'monospace'
                }).setOrigin(0.5);
                this.debugTexts.push(text);
            }
        });
    }

    handleTileClick(pointer: Phaser.Input.Pointer) {
        if (!this.backgroundLayer) return;

        const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        const tile = this.backgroundLayer.getTileAtWorldXY(worldPoint.x, worldPoint.y);

        if (tile) {
            // Cycle: Void (None) -> Solid -> Water -> Ice -> Void
            const isCollides = tile.properties.collides;
            const isWater = tile.properties.water;
            const isIce = tile.properties.ice;

            let nextState = 'solid';
            if (isCollides && !isWater && !isIce) nextState = 'water';
            else if (!isCollides && isWater) nextState = 'ice';
            else if (isCollides && isIce) nextState = 'void';
            else if (!isCollides && !isWater && !isIce) nextState = 'solid';

            // Reset all first
            tile.properties.collides = false;
            tile.properties.water = false;
            tile.properties.ice = false;

            // Apply new state
            switch (nextState) {
                case 'solid':
                    tile.properties.collides = true;
                    break;
                case 'water':
                    tile.properties.water = true;
                    break;
                case 'ice':
                    tile.properties.collides = true; // Ice is solid
                    tile.properties.ice = true;
                    break;
                case 'void':
                    // All false
                    break;
            }

            console.log(`Tile ${tile.index} (ID: ${tile.index - 1}) set to ${nextState}`);

            // Validate Collision Update:
            // Changing properties in memory doesn't auto-update physics bodies for existing tiles?
            // "setCollisionByProperty" calculates interesting faces. 
            // We might need to force update collision for this tile.
            // But simple property update is enough for our usage if we re-run setCollision logic or if check relies on properties.
            // Our overlap/collide checks mostly rely on Phaser's body system.
            // Force updating the tile collision:
            tile.setCollision(tile.properties.collides);

            // Redraw debug
            this.drawDebug();
        }
    }

    saveLevelData() {
        if (!this.backgroundLayer) return;

        const levelName = 'level2';
        const tilesToSave: any[] = [];

        this.backgroundLayer.forEachTile((tile) => {
            tilesToSave.push({
                id: tile.index - 1,
                collides: !!tile.properties.collides,
                water: !!tile.properties.water,
                ice: !!tile.properties.ice
            });
        });

        fetch('http://localhost:3000/save-level', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: levelName, tiles: tilesToSave })
        })
            .then(response => response.json())
            .then(data => console.log('Save success:', data))
            .catch(err => console.error('Save failed:', err));
    }

    createExplosion(x: number, y: number) {
        const splat = this.add.sprite(x, y - 10, 'blood_splat');
        splat.setScale(1);
        splat.play('blood_splat');
        splat.on('animationcomplete', () => {
            splat.destroy();
        });
    }

    createScoreboard() {
        const sidebarX = 400;
        const width = 80;
        const height = 256;

        const graphics = this.add.graphics();

        // Background stone texture procedural
        graphics.fillStyle(0x333333, 1);
        graphics.fillRect(sidebarX, 0, width, height);

        // Border
        graphics.lineStyle(2, 0x000000, 1);
        graphics.strokeRect(sidebarX, 0, width, height);

        // Draw slots for players
        for (let i = 0; i < 4; i++) {
            const y = 10 + i * 60;

            // Stone box effect
            graphics.fillStyle(0x444444, 1);
            graphics.fillRect(sidebarX + 5, y, width - 10, 50);
            graphics.lineStyle(1, 0x111111, 1);
            graphics.strokeRect(sidebarX + 5, y, width - 10, 50);

            const name = i === 0 ? 'P1' : i === 1 ? 'P2' : i === 2 ? 'P3' : 'P4';
            this.add.text(sidebarX + 40, y + 15, name, {
                fontSize: '12px',
                color: '#ffffff',
                fontFamily: 'monospace'
            }).setOrigin(0.5);

            const scoreText = this.add.text(sidebarX + 40, y + 35, '00', {
                fontSize: '20px',
                color: '#ffcc00',
                fontFamily: 'monospace',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            this.scoreboardTexts.push(scoreText);
        }
    }

    updateScoreboard() {
        this.playerScores.forEach((score, index) => {
            if (this.scoreboardTexts[index]) {
                const formattedScore = score.toString().padStart(2, '0');
                this.scoreboardTexts[index].setText(formattedScore);
            }
        });
    }

    update(t: number, dt: number) {
        this.players.forEach(p => {
            // Check tile below player for ice
            if (this.backgroundLayer) {
                // p.y is center, so p.y + displayHeight/2 is bottom. 
                // Probe 2 pixels below to find the tile they are standing on.
                const tile = this.backgroundLayer.getTileAtWorldXY(p.x, p.y + (p.displayHeight / 2) + 2);
                if (tile && tile.properties && tile.properties.ice) {
                    p.setOnIce(true);
                }
            }
            p.update(t, dt);
        });
    }
}
