import Phaser from 'phaser';
import Preloader from './scenes/Preloader';
import Game from './scenes/Game';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 480,
    height: 256,
    parent: 'app',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 1000 },
            debug: import.meta.env.DEV // Enable debug for now
        }
    },
    scene: [Preloader, Game]
};

export default new Phaser.Game(config);
