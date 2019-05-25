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
            // create a pbjsNamespace object, which is just our pojo helloworld
            // object with a lookupType fn added. lookupType takes a message
            // name, looks up the message definition for that name in the
            // namespace, and returns a pbjs message object.
            const pbjsNamespace = {
                ...helloworld,
                lookupType: messageName => {
                    switch (messageName) {
                        case 'HelloRequest':
                            return {
                                name: 'HelloRequest',
                                parent: { name: 'helloworld' },
                                fields: { name: { type: 'string', id: 1 } }
                            };
                        case 'HelloReply':
                            return {
                                name: 'HelloReply',
                                parent: { name: 'helloworld' },
                                fields: { message: { type: 'string', id: 1 } }
                            };
                    }
                },
            }
            const messageMap = grpcParsing.createMessageMap(pbjsNamespace);
            const expected = {
                HelloRequest: {
                    name: 'HelloRequest',
                    parent: { name: 'helloworld' },
                    fields: { name: { type: 'string', id: 1 } }
                },
                HelloReply: {
                    name: 'HelloReply',
                    parent: { name: 'helloworld' },
                    fields: { message: { type: 'string', id: 1 } }
                },
            }
            assert.deepEqual(messageMap, expected);
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

    describe('#createServiceHandler', () => {
        it('should return a map of a map of service names to handler functions', () => {
            // service with one method, 'SayHello'
            // 'SayHello' takes 'HelloRequest' and returns 'HelloReply'
            const serviceDefn = {
                methods: { SayHello: { requestType: 'HelloRequest', responseType: 'HelloReply' } }
            };
            let handlerCall;
            const grpcHandler = (_, ns, svc, method, requestType, request) => {
                handlerCall = { ns, svc, method, requestType, request };
            }
            const handler = grpcParsing.createServiceHandler('helloworld', 'Greeter', serviceDefn, grpcHandler);
            const call = { request: { 'name': 'John Smith' } };
            const callback = () => { };
            // calling sayHello should result in our handler being called
            handler.sayHello(call, callback);
            const expected = {
                ns: 'helloworld',
                svc: 'Greeter',
                method: 'SayHello',
                request: { 'name': 'John Smith' },
                requestType: 'HelloReply',
            };
            assert.deepEqual(handlerCall, expected);
        });
    });
});
