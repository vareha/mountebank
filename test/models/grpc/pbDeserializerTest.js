'use strict';

const assert = require('assert'),
    pbDeserializer = require('../../../src/models/grpc/pbDeserializer'),
    promiseIt = require('../../testHelpers').promiseIt;

describe('pbDeserializer', function () {
    describe('#create', function () {

        it('should correctly deserialize a basic string message', function () {
            const definition = { name: { i: 1, type: "STRING" } },
                bytes = new Uint8Array([10, 10, 106, 111, 104, 110, 32, 115, 109, 105, 116, 104]),
                serializer = pbDeserializer.create(definition),
                out = serializer(bytes),
                expected = { name: "john smith" };
            assert.equal(out.toString(), expected.toString());
        });
    });
});
