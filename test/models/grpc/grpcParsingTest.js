'use strict';

const assert = require('assert'),
    grpcParsing = require('../../../src/models/grpc/grpcParsing');

const helloworld = {
    nested: {
        Greeter: {
            methods: {
                SayHello: { requestType: 'HelloRequest', responseType: 'HelloReply' }
            }
        },
        HelloRequest: { fields: { name: { type: 'string', id: 1 } } },
        HelloReply: { fields: { message: { type: 'string', id: 1 } } },
    }
};

describe('grpcParsing', () => {
    describe('#getMessages', () => {
        it('should return only the messages', () => {
            const messages = grpcParsing.getMessages(helloworld);
            const expected = [
                ['HelloRequest', { fields: { name: { type: 'string', id: 1 } } }],
                ['HelloReply', { fields: { message: { type: 'string', id: 1 } } }]
            ];
            assert.deepEqual(messages, expected);
        });
    });
});
