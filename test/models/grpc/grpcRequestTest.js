'use strict';

const assert = require('assert'),
    promiseIt = require('../../testHelpers').promiseIt,
    grpcRequest = require('../../../src/models/grpc/grpcRequest');

describe('grpcRequest', () => {
    describe('#createFrom', () => {
        promiseIt('should return the correct grpc request obj', () => {
            const expected = {
                methodName: 'helloworld.Greeter.SayHello',
                request: { name: 'John Smith' },
                responseType: 'helloworld.HelloReply'
            }
            return grpcRequest.createFrom('helloworld', 'Greeter', 'SayHello', 'HelloReply', { 'name': 'John Smith' })
                .then(response => {
                    assert.deepStrictEqual(response, expected);
                });
        });
    });
});
