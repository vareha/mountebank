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

    describe('#createService', () => {
        it('should return a valid service object', () => {
            // service with one method, "SayHello"
            // "SayHello" takes "HelloRequest" and returns "HelloReply"
            const serviceDefn = {
                methods: { SayHello: { requestType: 'HelloRequest', responseType: 'HelloReply' } }
            };
            // map of messages to pbjs types
            // request types need a decode() function
            // response types need both verify() and encode() functions
            const messageMap = {
                HelloRequest: { decode: toDecode => String.fromCharCode.apply(null, toDecode) },
                HelloReply: {
                    verify: () => null, // return null = no error = valid message
                    encode: toEncode => {
                        return {
                            finish: () => JSON.stringify(toEncode)
                        }
                    },
                },
            };
            const service = grpcParsing.createService('helloworld', 'SayHello', serviceDefn, messageMap);
            const sayHello = service['sayHello'];
            // path should be correct
            assert.strictEqual(sayHello.path, '/helloworld.SayHello/SayHello');
            // requestDeserialize should call the decode fn defined by HelloRequest
            assert.strictEqual(
                sayHello.requestDeserialize([0x70, 0x62, 0x6d, 0x73, 0x67]),
                'pbmsg'
            );
            // responseSerialize should call the encode fn defined by HelloReply
            assert.strictEqual(
                sayHello.responseSerialize({ message: 'hello world' }),
                '{"message":"hello world"}'
            );
        });
    });
});
