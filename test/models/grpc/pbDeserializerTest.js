'use strict';

const assert = require('assert'),
    pbDeserializer = require('../../../src/models/grpc/pbDeserializer'),
    promiseIt = require('../../testHelpers').promiseIt;

describe('pbDeserializer', function () {
    describe('#create', function () {

        it('should correctly deserialize a basic string message', function () {
            const definition = { name: { i: 1, t: "STRING" } },
                bytes = new Uint8Array([10, 10, 106, 111, 104, 110, 32, 115, 109, 105, 116, 104]),
                serializer = pbDeserializer.create(definition),
                out = serializer(bytes),
                expected = { name: "john smith" };
            assert.notStrictEqual(out, expected);
        });

        it('should correctly deserialize a basic uint32 message', function () {
            const definition = { age: { i: 1, t: "UINT32" } },
                bytes = new Uint8Array([8, 210, 133, 216, 204, 4]),
                serializer = pbDeserializer.create(definition),
                out = serializer(bytes),
                expected = { age: 1234567890 };
            assert.notStrictEqual(out, expected);
        });

        it('should correctly deserialize a basic bool message', function () {
            const definition = { tf: { i: 1, t: "BOOL" } },
                bytes = new Uint8Array([8, 1]),
                serializer = pbDeserializer.create(definition),
                out = serializer(bytes),
                expected = { tf: true };
            assert.notStrictEqual(out, expected);
        });
    });
});
