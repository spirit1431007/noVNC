import Websock from '../core/websock.js';
import Display from '../core/display.js';

import TightDecoder from '../core/decoders/tight.js';

import FakeWebSocket from './fake.websocket.js';

function testDecodeRect(decoder, x, y, width, height, data, display, depth) {
    let sock;
    let done = false;

    sock = new Websock;
    sock.open("ws://example.com");

    sock.on('message', () => {
        done = decoder.decodeRect(x, y, width, height, sock, display, depth);
    });

    // Empty messages are filtered at multiple layers, so we need to
    // do a direct call
    if (data.length === 0) {
        done = decoder.decodeRect(x, y, width, height, sock, display, depth);
    } else {
        sock._websocket._receiveData(new Uint8Array(data));
    }

    display.flip();

    return done;
}

describe('Tight decoder', function () {
    let decoder;
    let display;

    before(FakeWebSocket.replace);
    after(FakeWebSocket.restore);

    beforeEach(function () {
        decoder = new TightDecoder();
        display = new Display(document.createElement('canvas'));
        display.resize(4, 4);
    });

    it('should handle fill rects', function () {
        let done = testDecodeRect(decoder, 0, 0, 4, 4,
                                  [0x80, 0xff, 0x88, 0x44],
                                  display, 24);

        let targetData = new Uint8Array([
            0xff, 0x88, 0x44, 255, 0xff, 0x88, 0x44, 255, 0xff, 0x88, 0x44, 255, 0xff, 0x88, 0x44, 255,
            0xff, 0x88, 0x44, 255, 0xff, 0x88, 0x44, 255, 0xff, 0x88, 0x44, 255, 0xff, 0x88, 0x44, 255,
            0xff, 0x88, 0x44, 255, 0xff, 0x88, 0x44, 255, 0xff, 0x88, 0x44, 255, 0xff, 0x88, 0x44, 255,
            0xff, 0x88, 0x44, 255, 0xff, 0x88, 0x44, 255, 0xff, 0x88, 0x44, 255, 0xff, 0x88, 0x44, 255,
        ]);

        expect(done).to.be.true;
        expect(display).to.have.displayed(targetData);
    });

    it('should handle uncompressed copy rects', function () {
        let done;
        let blueData = [ 0x00, 0x00, 0x00, 0xff, 0x00, 0x00, 0xff ];
        let greenData = [ 0x00, 0x00, 0xff, 0x00, 0x00, 0xff, 0x00 ];

        done = testDecodeRect(decoder, 0, 0, 2, 1, blueData, display, 24);
        expect(done).to.be.true;
        done = testDecodeRect(decoder, 0, 1, 2, 1, blueData, display, 24);
        expect(done).to.be.true;
        done = testDecodeRect(decoder, 2, 0, 2, 1, greenData, display, 24);
        expect(done).to.be.true;
        done = testDecodeRect(decoder, 2, 1, 2, 1, greenData, display, 24);
        expect(done).to.be.true;
        done = testDecodeRect(decoder, 0, 2, 2, 1, greenData, display, 24);
        expect(done).to.be.true;
        done = testDecodeRect(decoder, 0, 3, 2, 1, greenData, display, 24);
        expect(done).to.be.true;
        done = testDecodeRect(decoder, 2, 2, 2, 1, blueData, display, 24);
        expect(done).to.be.true;
        done = testDecodeRect(decoder, 2, 3, 2, 1, blueData, display, 24);
        expect(done).to.be.true;

        let targetData = new Uint8Array([
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255
        ]);

        expect(display).to.have.displayed(targetData);
    });

    it('should handle compressed copy rects', function () {
        let data = [
            // Control byte
            0x00,
            // Pixels (compressed)
            0x15,
            0x78, 0x9c, 0x63, 0x60, 0xf8, 0xcf, 0x00, 0x44,
            0x60, 0x82, 0x01, 0x99, 0x8d, 0x29, 0x02, 0xa6,
            0x00, 0x7e, 0xbf, 0x0f, 0xf1 ];

        let done = testDecodeRect(decoder, 0, 0, 4, 4, data, display, 24);

        let targetData = new Uint8Array([
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255
        ]);

        expect(done).to.be.true;
        expect(display).to.have.displayed(targetData);
    });

    it('should handle uncompressed mono rects', function () {
        let data = [
            // Control bytes
            0x40, 0x01,
            // Palette
            0x01, 0x00, 0x00, 0xff, 0x00, 0xff, 0x00,
            // Pixels
            0x30, 0x30, 0xc0, 0xc0 ];

        let done = testDecodeRect(decoder, 0, 0, 4, 4, data, display, 24);

        let targetData = new Uint8Array([
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255
        ]);

        expect(done).to.be.true;
        expect(display).to.have.displayed(targetData);
    });

    it('should handle compressed mono rects', function () {
        display.resize(4, 12);

        let data = [
            // Control bytes
            0x40, 0x01,
            // Palette
            0x01, 0x00, 0x00, 0xff, 0x00, 0xff, 0x00,
            // Pixels (compressed)
            0x0e,
            0x78, 0x9c, 0x33, 0x30, 0x38, 0x70, 0xc0, 0x00,
            0x8a, 0x01, 0x21, 0x3c, 0x05, 0xa1 ];

        let done = testDecodeRect(decoder, 0, 0, 4, 12, data, display, 24);

        let targetData = new Uint8Array([
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255
        ]);

        expect(done).to.be.true;
        expect(display).to.have.displayed(targetData);
    });

    it('should handle uncompressed palette rects', function () {
        let done;
        let data1 = [
            // Control bytes
            0x40, 0x01,
            // Palette
            0x02, 0x00, 0x00, 0xff, 0x00, 0xff, 0x00, 0x00, 0x00, 0x00,
            // Pixels
            0x00, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x01 ];
        let data2 = [
            // Control bytes
            0x40, 0x01,
            // Palette
            0x02, 0x00, 0x00, 0xff, 0x00, 0xff, 0x00, 0x00, 0x00, 0x00,
            // Pixels
            0x01, 0x01, 0x00, 0x00, 0x01, 0x01, 0x00, 0x00 ];

        done = testDecodeRect(decoder, 0, 0, 4, 2, data1, display, 24);
        expect(done).to.be.true;
        done = testDecodeRect(decoder, 0, 2, 4, 2, data2, display, 24);
        expect(done).to.be.true;

        let targetData = new Uint8Array([
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255
        ]);

        expect(display).to.have.displayed(targetData);
    });

    it('should handle compressed palette rects', function () {
        let data = [
            // Control bytes
            0x40, 0x01,
            // Palette
            0x02, 0x00, 0x00, 0xff, 0x00, 0xff, 0x00, 0x00, 0x00, 0x00,
            // Pixels (compressed)
            0x12,
            0x78, 0x9c, 0x63, 0x60, 0x60, 0x64, 0x64, 0x00,
            0x62, 0x08, 0xc9, 0xc0, 0x00, 0x00, 0x00, 0x54,
            0x00, 0x09 ];

        let done = testDecodeRect(decoder, 0, 0, 4, 4, data, display, 24);

        let targetData = new Uint8Array([
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255
        ]);

        expect(done).to.be.true;
        expect(display).to.have.displayed(targetData);
    });

    it('should handle uncompressed gradient rects', function () {
        let done;
        let blueData = [ 0x40, 0x02, 0x00, 0x00, 0xff, 0x00, 0x00, 0x00 ];
        let greenData = [ 0x40, 0x02, 0x00, 0xff, 0x00, 0x00, 0x00, 0x00 ];

        done = testDecodeRect(decoder, 0, 0, 2, 1, blueData, display, 24);
        expect(done).to.be.true;
        done = testDecodeRect(decoder, 0, 1, 2, 1, blueData, display, 24);
        expect(done).to.be.true;
        done = testDecodeRect(decoder, 2, 0, 2, 1, greenData, display, 24);
        expect(done).to.be.true;
        done = testDecodeRect(decoder, 2, 1, 2, 1, greenData, display, 24);
        expect(done).to.be.true;
        done = testDecodeRect(decoder, 0, 2, 2, 1, greenData, display, 24);
        expect(done).to.be.true;
        done = testDecodeRect(decoder, 0, 3, 2, 1, greenData, display, 24);
        expect(done).to.be.true;
        done = testDecodeRect(decoder, 2, 2, 2, 1, blueData, display, 24);
        expect(done).to.be.true;
        done = testDecodeRect(decoder, 2, 3, 2, 1, blueData, display, 24);
        expect(done).to.be.true;

        let targetData = new Uint8Array([
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255
        ]);

        expect(display).to.have.displayed(targetData);
    });

    it('should handle compressed gradient rects', function () {
        let data = [
            // Control byte
            0x40, 0x02,
            // Pixels (compressed)
            0x18,
            0x78, 0x9c, 0x62, 0x60, 0xf8, 0xcf, 0x00, 0x04,
            0xff, 0x19, 0x19, 0xd0, 0x00, 0x44, 0x84, 0xf1,
            0x3f, 0x9a, 0x30, 0x00, 0x00, 0x00, 0xff, 0xff ];

        let done = testDecodeRect(decoder, 0, 0, 4, 4, data, display, 24);

        let targetData = new Uint8Array([
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255
        ]);

        expect(done).to.be.true;
        expect(display).to.have.displayed(targetData);
    });

    it('should handle empty copy rects', function () {
        display.fillRect(0, 0, 4, 4, [ 0x00, 0x00, 0xff ]);
        display.fillRect(2, 0, 2, 2, [ 0x00, 0xff, 0x00 ]);
        display.fillRect(0, 2, 2, 2, [ 0x00, 0xff, 0x00 ]);

        let done = testDecodeRect(decoder, 1, 2, 0, 0, [ 0x00 ], display, 24);

        let targetData = new Uint8Array([
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255
        ]);

        expect(done).to.be.true;
        expect(display).to.have.displayed(targetData);
    });

    it('should handle empty palette rects', function () {
        display.fillRect(0, 0, 4, 4, [ 0x00, 0x00, 0xff ]);
        display.fillRect(2, 0, 2, 2, [ 0x00, 0xff, 0x00 ]);
        display.fillRect(0, 2, 2, 2, [ 0x00, 0xff, 0x00 ]);

        let done = testDecodeRect(decoder, 1, 2, 0, 0,
                                  [ 0x40, 0x01, 0x01,
                                    0xff, 0xff, 0xff,
                                    0xff, 0xff, 0xff ], display, 24);

        let targetData = new Uint8Array([
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255
        ]);

        expect(done).to.be.true;
        expect(display).to.have.displayed(targetData);
    });

    it('should handle empty gradient rects', function () {
        display.fillRect(0, 0, 4, 4, [ 0x00, 0x00, 0xff ]);
        display.fillRect(2, 0, 2, 2, [ 0x00, 0xff, 0x00 ]);
        display.fillRect(0, 2, 2, 2, [ 0x00, 0xff, 0x00 ]);

        let done = testDecodeRect(decoder, 1, 2, 0, 0,
                                  [ 0x40, 0x02 ], display, 24);

        let targetData = new Uint8Array([
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255
        ]);

        expect(done).to.be.true;
        expect(display).to.have.displayed(targetData);
    });

    it('should handle empty fill rects', function () {
        display.fillRect(0, 0, 4, 4, [ 0x00, 0x00, 0xff ]);
        display.fillRect(2, 0, 2, 2, [ 0x00, 0xff, 0x00 ]);
        display.fillRect(0, 2, 2, 2, [ 0x00, 0xff, 0x00 ]);

        let done = testDecodeRect(decoder, 1, 2, 0, 0,
                                  [ 0x80, 0xff, 0xff, 0xff ],
                                  display, 24);

        let targetData = new Uint8Array([
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0x00, 0xff, 255, 0x00, 0x00, 0xff, 255
        ]);

        expect(done).to.be.true;
        expect(display).to.have.displayed(targetData);
    });

    it('should handle JPEG rects', async function () {
        let data = [
            // Control bytes
            0x90, 0xd6, 0x05,
            // JPEG data
            0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
            0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
            0x00, 0x48, 0x00, 0x00, 0xff, 0xfe, 0x00, 0x13,
            0x43, 0x72, 0x65, 0x61, 0x74, 0x65, 0x64, 0x20,
            0x77, 0x69, 0x74, 0x68, 0x20, 0x47, 0x49, 0x4d,
            0x50, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0xff, 0xdb,
            0x00, 0x43, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
            0x01, 0x01, 0x01, 0xff, 0xc2, 0x00, 0x11, 0x08,
            0x00, 0x04, 0x00, 0x04, 0x03, 0x01, 0x11, 0x00,
            0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xc4,
            0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x07, 0xff, 0xc4, 0x00, 0x14,
            0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x08, 0xff, 0xda, 0x00, 0x0c, 0x03, 0x01,
            0x00, 0x02, 0x10, 0x03, 0x10, 0x00, 0x00, 0x01,
            0x1e, 0x0a, 0xa7, 0x7f, 0xff, 0xc4, 0x00, 0x14,
            0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x05, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x01, 0x05, 0x02, 0x5d, 0x74, 0x41, 0x47,
            0xff, 0xc4, 0x00, 0x1f, 0x11, 0x00, 0x01, 0x04,
            0x02, 0x02, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x06, 0x04, 0x05,
            0x07, 0x08, 0x14, 0x16, 0x03, 0x15, 0x17, 0x25,
            0x26, 0xff, 0xda, 0x00, 0x08, 0x01, 0x03, 0x01,
            0x01, 0x3f, 0x01, 0xad, 0x35, 0xa6, 0x13, 0xb8,
            0x10, 0x98, 0x5d, 0x8a, 0xb1, 0x41, 0x7e, 0x43,
            0x99, 0x24, 0x3d, 0x8f, 0x70, 0x30, 0xd8, 0xcb,
            0x44, 0xbb, 0x7d, 0x48, 0xb5, 0xf8, 0x18, 0x7f,
            0xe7, 0xc1, 0x9f, 0x86, 0x45, 0x9b, 0xfa, 0xf1,
            0x61, 0x96, 0x46, 0xbf, 0x56, 0xc8, 0x8b, 0x2b,
            0x0b, 0x35, 0x6e, 0x4b, 0x8a, 0x95, 0x6a, 0xf9,
            0xff, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x11, 0x00,
            0x01, 0x04, 0x02, 0x02, 0x03, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,
            0x02, 0x04, 0x05, 0x12, 0x13, 0x14, 0x01, 0x06,
            0x11, 0x22, 0x23, 0xff, 0xda, 0x00, 0x08, 0x01,
            0x02, 0x01, 0x01, 0x3f, 0x01, 0x85, 0x85, 0x8c,
            0xec, 0x31, 0x8d, 0xa6, 0x26, 0x1b, 0x6e, 0x48,
            0xbc, 0xcd, 0xb0, 0xe3, 0x33, 0x86, 0xf9, 0x35,
            0xdc, 0x15, 0xa8, 0xbe, 0x4d, 0x4a, 0x10, 0x22,
            0x80, 0x00, 0x91, 0xe8, 0x24, 0xda, 0xb6, 0x57,
            0x95, 0xf2, 0xa5, 0x73, 0xff, 0xc4, 0x00, 0x1e,
            0x10, 0x00, 0x01, 0x04, 0x03, 0x00, 0x03, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x03, 0x01, 0x02, 0x04, 0x12, 0x05, 0x11,
            0x13, 0x14, 0x22, 0x23, 0xff, 0xda, 0x00, 0x08,
            0x01, 0x01, 0x00, 0x06, 0x3f, 0x02, 0x91, 0x89,
            0xc4, 0xc8, 0xf1, 0x60, 0x45, 0xe5, 0xc0, 0x1c,
            0x80, 0x7a, 0x77, 0x00, 0xe4, 0x97, 0xeb, 0x24,
            0x66, 0x33, 0xac, 0x63, 0x11, 0xfe, 0xe4, 0x76,
            0xad, 0x56, 0xe9, 0xa8, 0x88, 0x9f, 0xff, 0xc4,
            0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x08,
            0x01, 0x01, 0x00, 0x01, 0x3f, 0x21, 0x68, 0x3f,
            0x92, 0x17, 0x81, 0x1f, 0x7f, 0xff, 0xda, 0x00,
            0x0c, 0x03, 0x01, 0x00, 0x02, 0x00, 0x03, 0x00,
            0x00, 0x00, 0x10, 0x5f, 0xff, 0xc4, 0x00, 0x14,
            0x11, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x03,
            0x01, 0x01, 0x3f, 0x10, 0x03, 0xeb, 0x11, 0xe4,
            0xa7, 0xe3, 0xff, 0x00, 0xff, 0xc4, 0x00, 0x14,
            0x11, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x02,
            0x01, 0x01, 0x3f, 0x10, 0x6b, 0xd3, 0x02, 0xdc,
            0x9a, 0xf4, 0xff, 0x00, 0xff, 0xc4, 0x00, 0x14,
            0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x01, 0x3f, 0x10, 0x62, 0x7b, 0x3a, 0xd0,
            0x3f, 0xeb, 0xff, 0x00, 0xff, 0xd9,
        ];

        let decodeDone = testDecodeRect(decoder, 0, 0, 4, 4, data, display, 24);
        expect(decodeDone).to.be.true;

        let targetData = new Uint8Array([
            0xff, 0x00, 0x00, 255, 0xff, 0x00, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0xff, 0x00, 0x00, 255, 0xff, 0x00, 0x00, 255, 0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0xff, 0x00, 0x00, 255, 0xff, 0x00, 0x00, 255,
            0x00, 0xff, 0x00, 255, 0x00, 0xff, 0x00, 255, 0xff, 0x00, 0x00, 255, 0xff, 0x00, 0x00, 255
        ]);

        // Browsers have rounding errors, so we need an approximate
        // comparing function
        function almost(a, b) {
            let diff = Math.abs(a - b);
            return diff < 5;
        }

        await display.flush();
        expect(display).to.have.displayed(targetData, almost);
    });
});
