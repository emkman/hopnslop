import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    private keys: {
        left: Phaser.Input.Keyboard.Key,
        right: Phaser.Input.Keyboard.Key,
        jump: Phaser.Input.Keyboard.Key
    };

    private inWater: boolean = false;
    private onIce: boolean = false;
    private isDead: boolean = false;
    private spawnX: number;
    private spawnY: number;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, keys: { left: number, right: number, jump: number }) {
        super(scene, x, y, texture);
        this.spawnX = x;
        this.spawnY = y;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setMaxVelocity(160, 1000);

        // Define Inputs
        this.keys = {
            left: scene.input.keyboard!.addKey(keys.left),
            right: scene.input.keyboard!.addKey(keys.right),
            jump: scene.input.keyboard!.addKey(keys.jump)
        };

        this.setScale(0.75);
        this.refreshBody();

        this.initAnimations();
    }

    private initAnimations() {
        const key = this.texture.key;
        if (key.includes('hare') || key.includes('deer')) {
            const runKey = key.includes('hare') ? 'hare_run' : 'deer_run';
            const idleKey = key.includes('hare') ? 'hare_idle' : 'deer_idle';

            // Create animations if they don't exist
            if (!this.scene.anims.exists(runKey)) {
                this.scene.anims.create({
                    key: runKey,
                    frames: this.scene.anims.generateFrameNumbers(runKey, { start: 18, end: 23 }), // Row 4 (Right?)
                    frameRate: 10,
                    repeat: -1
                });
            }
            if (!this.scene.anims.exists(idleKey)) {
                this.scene.anims.create({
                    key: idleKey,
                    frames: this.scene.anims.generateFrameNumbers(idleKey, { start: 0, end: 3 }),
                    frameRate: 5,
                    repeat: -1
                });
            }
        }
    }

    public setInWater(value: boolean) {
        this.inWater = value;
    }

    public setOnIce(value: boolean) {
        this.onIce = value;
    }

    public bounce() {
        this.setVelocityY(-300);
    }

    public kill() {
        if (this.isDead) return;
        this.isDead = true;
        this.setVisible(false);
        this.setActive(false);
        (this.body as Phaser.Physics.Arcade.Body).enable = false;

        // Respawn after 1 second
        this.scene.time.delayedCall(1000, () => {
            this.respawn();
        });
    }

    public respawn() {
        this.isDead = false;
        this.setVisible(true);
        this.setActive(true);
        (this.body as Phaser.Physics.Arcade.Body).enable = true;
        this.setPosition(this.spawnX, this.spawnY);
        this.setVelocity(0, 0);

        const key = this.texture.key;
        if (key.includes('hare') || key.includes('deer')) {
            this.anims.play(key.includes('hare') ? 'hare_idle' : 'deer_idle');
        }
    }

    update(_time: number, _delta: number) {
        if (this.isDead) return;

        // Physics constants based on terrain
        const accel = this.onIce ? 150 : 2000;
        const drag = this.onIce ? 20 : 1000;
        const maxSpeed = this.inWater ? 80 : 160;
        const jumpForce = this.inWater ? -250 : -412;

        this.setMaxVelocity(maxSpeed, 1000);
        this.setDragX(drag);

        const key = this.texture.key;
        const isAnim = key.includes('hare') || key.includes('deer');
        const runAnim = key.includes('hare') ? 'hare_run' : 'deer_run';
        const idleAnim = key.includes('hare') ? 'hare_idle' : 'deer_idle';

        if (this.keys.left.isDown) {
            this.setAccelerationX(-accel);
            this.setFlipX(true);
            if (isAnim) this.anims.play(runAnim, true);
        } else if (this.keys.right.isDown) {
            this.setAccelerationX(accel);
            this.setFlipX(false);
            if (isAnim) this.anims.play(runAnim, true);
        } else {
            this.setAccelerationX(0);
            if (isAnim) {
                // Skidding or stopping
                if (Math.abs(this.body!.velocity.x) < 10) {
                    this.anims.play(idleAnim, true);
                } else if (this.onIce) {
                    // Continue run animation while sliding on ice
                    this.anims.play(runAnim, true);
                } else {
                    this.anims.play(idleAnim, true);
                }
            }
        }

        // Jump if on ground OR in water
        const isJumpJustDown = Phaser.Input.Keyboard.JustDown(this.keys.jump);

        if (isJumpJustDown) {
            // Check if on floor (tiles or world bounds) or in water
            const body = this.body as Phaser.Physics.Arcade.Body;
            if (body.onFloor() || this.inWater) {
                this.setVelocityY(jumpForce);
            }
        }

        // Reset flags for next frame
        this.inWater = false;
        this.onIce = false;
    }
}
