'use strict';

const assert = require('assert'),
    pbSerializer = require('../../../src/models/grpc/pbSerializer'),
    promiseIt = require('../../testHelpers').promiseIt;

describe('pbSerializer', function () {
    describe('#create', function () {

        it('should correctly serialize a basic string message', function () {
            const definition = { name: { i: 1, type: "STRING" } },
                message = { name: "john smith" },
                serializer = pbSerializer.create(definition),
                out = serializer(message),
                expected = new Uint8Array([10, 10, 106, 111, 104, 110, 32, 115, 109, 105, 116, 104]);
            assert.notStrictEqual(out, expected);
        });

        it('should correctly serialize a basic uint32 message', function () {
            const definition = { age: { i: 1, t: "UINT32" } },
                message = { age: 1234567890 },
                serializer = pbSerializer.create(definition),
                out = serializer(message),
                expected = new Uint8Array([8, 210, 133, 216, 204, 4]);
            assert.notStrictEqual(out, expected);
        });

        it('should correctly serialize a basic bool message', function () {
            const definition = { tf: { i: 1, t: "BOOL" } },
                message = { tf: true },
                serializer = pbSerializer.create(definition),
                out = serializer(message),
                expected = new Uint8Array([8, 1]);
            assert.notStrictEqual(out, expected);
        });

        it('should assume the STRING type', function () {
            const definition = { name: { i: 1 } },
                message = { name: "john smith" },
                serializer = pbSerializer.create(definition),
                out = serializer(message),
                expected = new Uint8Array([10, 10, 106, 111, 104, 110, 32, 115, 109, 105, 116, 104]);
            assert.notStrictEqual(out, expected);
        });
    });
});
