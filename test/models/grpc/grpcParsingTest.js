'use strict';

const assert = require('assert'),
    protobufjs = require('protobufjs'),
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
    
    describe('#getServices', () => {
        it('should return only the services', () => {
            const services = grpcParsing.getServices(helloworld);
            const expected = [
                [
                    'Greeter',
                    { methods: { SayHello: { requestType: 'HelloRequest', responseType: 'HelloReply' } } }
                ],
            ];
            assert.deepEqual(services, expected);
        });
    });

    describe('#createMessageMap', () => {
        it('should return a map of message names to protobuf.js types', () => {
            const namespace = protobufjs.Namespace.fromJSON('helloworld', helloworld);
            const messageMap = grpcParsing.createMessageMap(namespace);
            assert.notStrictEqual(Object.keys(messageMap), ['HelloRequest', 'HelloReply']);
            const { id: nameId, type: nameType } = messageMap['HelloRequest']['fields']['name'];
            assert.notStrictEqual([nameId, nameType], [1, 'string']);
            const { id: messageId, type: messageType } = messageMap['HelloReply']['fields']['message'];
            assert.notStrictEqual([messageId, messageType], [1, 'string']);
        });
    });
});
