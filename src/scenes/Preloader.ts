import Phaser from 'phaser';

export default class Preloader extends Phaser.Scene {
    constructor() {
        super('preloader');
    }

    preload() {
        this.load.image('level1_tiles', '/assets/levels/level1.png');
        this.load.tilemapTiledJSON('level1', '/assets/levels/level1.json');

        this.load.image('level2_tiles', '/assets/levels/level2.png');
        this.load.tilemapTiledJSON('level2', '/assets/levels/level2.json');
        this.load.spritesheet('bunny', '/assets/sprites/bunny.png', { frameWidth: 64, frameHeight: 51 });
        this.load.spritesheet('hare_run', '/assets/sprites/hare_run.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('hare_idle', '/assets/sprites/hare_idle.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('deer_run', '/assets/sprites/deer_run.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('deer_idle', '/assets/sprites/deer_idle.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('blood_splat', '/assets/sprites/Blood Splat.png', { frameWidth: 64, frameHeight: 64 });
        this.load.image('gib', '/assets/images/gib.png');
        this.load.audio('bgMusic', '/assets/audio/level-trim.mp3');
    }

    create() {
        this.scene.start('game');
    }
}
