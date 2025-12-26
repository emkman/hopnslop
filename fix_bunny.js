
import fs from 'fs';
import { PNG } from 'pngjs';

const IMG_PATH = 'public/assets/sprites/bunny.png';

fs.createReadStream(IMG_PATH)
    .pipe(new PNG())
    .on('parsed', function () {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = (this.width * y + x) << 2;

                const r = this.data[idx];
                const g = this.data[idx + 1];
                const b = this.data[idx + 2];

                // If pixel is white or very close to white, make it transparent
                if (r > 240 && g > 240 && b > 240) {
                    this.data[idx + 3] = 0;
                }
            }
        }

        this.pack().pipe(fs.createWriteStream(IMG_PATH))
            .on('finish', () => console.log('Bunny transparency applied.'));
    });
