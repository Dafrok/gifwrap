'use strict';

const assert = require('chai').assert;
const Jimp = require('jimp');
const Tools = require('./lib/tools');
const { BitmapImage } = require('../src/index');

const SAMPLE_PNG_PATH = Tools.getFixturePath('lenna.png');
const SAMPLE_JPG_PATH = Tools.getFixturePath('pelagrina.jpg');

describe("BitmapImage construction behavior", () => {

    it("constructs an empty uncolored image", (done) => {

        const i = new BitmapImage(10, 5);
        Tools.checkBitmap(i.bitmap, 10, 5, 0);
        done();
    });

    it("constructs an empty colored image", (done) => {

        const color = 0x01020304;
        const i = new BitmapImage(10, 5, color);
        Tools.checkBitmap(i.bitmap, 10, 5, color);
        done();
    });

    it("constructs a buffer-sourced image", (done) => {

        const buf = new Buffer(10 * 5);
        const i = new BitmapImage(10, 5, buf);
        Tools.checkBitmap(i.bitmap, 10, 5, buf);
        done();
    });

    it("sourced bitmaps are shared", (done) => {

        const b = { width: 5, height: 6, data: new Buffer(5 * 6) };
        const j = new BitmapImage(b);
        assert.strictEqual(b, j.bitmap);
        done();
    });

    it("sourced images are copied", (done) => {

        const color = 0x01020304;
        const j1 = new BitmapImage(10, 5, color);
        const j2 = new BitmapImage(j1);
        assert.notStrictEqual(j1.bitmap, j2.bitmap);
        assert.deepStrictEqual(j1.bitmap, j2.bitmap);
        done();
    });
});

describe("GifFrame bad construction behavior", () => {

    it("won't accept garbage", (done) => {

        assert.throws(() => {
            new BitmapImage();
        }, /requires parameters/);
        assert.throws(() => {
            new BitmapImage(null);
        }, /unrecognized/);
        assert.throws(() => {
            new BitmapImage("string");
        }, /unrecognized/);
        assert.throws(() => {
            new BitmapImage(() => {});
        }, /unrecognized/);
        assert.throws(() => {
            new BitmapImage({});
        }, /unrecognized/);
        assert.throws(() => {
            new BitmapImage(new Buffer(25));
        }, /unrecognized/);
        done();
    });

    it("width requires height", (done) => {

        assert.throws(() => {
            new BitmapImage(5);
        }, /unrecognized/);
        assert.throws(() => {
            new BitmapImage(5, new Buffer(5));
        }, /unrecognized/);
        assert.throws(() => {
            new BitmapImage(5, {});
        }, /unrecognized/);
        done();
    });
});

describe("BitmapImage palette", () => {

    it("is monocolor without transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameMonoOpaque');
        const f = new BitmapImage(bitmap);
        const p = f.getPalette();
        assert.deepStrictEqual(p.colors, [0xFF0000]);
        assert.strictEqual(p.usesTransparency, false);
        done();
    });

    it("includes two colors without transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameBWOpaque');
        const f = new BitmapImage(bitmap);
        const p = f.getPalette();
        assert.deepStrictEqual(p.colors, [0x000000, 0xffffff]);
        assert.strictEqual(p.usesTransparency, false);
        done();
    });

    it("includes multiple colors without transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameMultiOpaque');
        const f = new BitmapImage(bitmap);
        const p = f.getPalette();
        assert.deepStrictEqual(p.colors,
                [0x0000ff, 0x00ff00, 0xff0000, 0xffffff]);
        assert.strictEqual(p.usesTransparency, false);
        done();
    });

    it("has only transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameNoColorTrans');
        const f = new BitmapImage(bitmap);
        const p = f.getPalette();
        assert.deepStrictEqual(p.colors, []);
        assert.strictEqual(p.usesTransparency, true);
        done();
    });

    it("is monocolor with transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameMonoTrans');
        const f = new BitmapImage(bitmap);
        const p = f.getPalette();
        assert.deepStrictEqual(p.colors, [0x00ff00]);
        assert.strictEqual(p.usesTransparency, true);
        done();
    });

    it("includes multiple colors with transparency", (done) => {

        const bitmap = Tools.getBitmap('singleFrameMultiPartialTrans');
        const f = new BitmapImage(bitmap);
        const p = f.getPalette();
        assert.deepStrictEqual(p.colors,
                [0x000000, 0x0000ff, 0x00ff00, 0xff0000, 0xffffff]);
        assert.strictEqual(p.usesTransparency, true);
        done();
    });
});

// TBD: test BitmapImage transformation methods

describe("Jimp compatibility", () => {

    it("works when sourced from Jimp", (done) => {

        new Jimp(SAMPLE_PNG_PATH, (err, j1) => {

            if (err) return done(err);
            assert.strictEqual(err, null);
            const initialColor = j1.getPixelColor(5, 5);
            const i = new BitmapImage(j1.bitmap);
            assert.strictEqual(i.getRGBA(5, 5), initialColor);
            const newColor = initialColor + 0x01010101;
            i.fillRGBA(newColor);
            assert.strictEqual(i.getRGBA(5, 5), newColor);
            const j2 = _createJimp(i.bitmap);
            assert.strictEqual(j2.getPixelColor(5, 5), newColor);
            done();
        });
    });

    it("works when sourcing Jimp", (done) => {

        const initialColor = 0x12344321;
        const i1 = new BitmapImage(10, 5, initialColor);
        const j = _createJimp(i1.bitmap);
        assert.strictEqual(j.getPixelColor(3, 3), initialColor);
        const newColor = initialColor + 0x01010101;
        j.setPixelColor(newColor, 3, 3);
        assert.strictEqual(j.getPixelColor(3, 3), newColor);
        const i2 = new BitmapImage(j.bitmap);
        assert.strictEqual(i2.getRGBA(3,3), newColor);
        done();
    });

    it("composing with a sprite having transparency", (done) => {

        const i1 = new BitmapImage(Tools.getBitmap('singleFrameMonoOpaque'));
        const j1 = _createJimp(i1.bitmap);
        const i2 = new BitmapImage(Tools.getBitmap('sampleSprite'));
        const j2 = _createJimp(i2.bitmap);
        j1.composite(j2, 1, 1);
        const result = new BitmapImage(j1.bitmap);
        const expected = new BitmapImage(Tools.getBitmap('singleFrameMonoOpaqueSpriteAt1x1'));
        assert.deepStrictEqual(result.bitmap, expected.bitmap);
        done();
    });
});

function _createJimp(bitmap) {
    const j = new Jimp(1, 1);
    j.bitmap = bitmap;
    return j;
}
