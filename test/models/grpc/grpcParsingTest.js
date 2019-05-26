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
            // object with a lookupType fn added. 
            const pbjsNamespace = {
                ...helloworld,
                // lookupType takes a message name, looks up the message
                // definition for that name in the namespace, and returns a pbjs
                // message object. the real protobuf.js returns significantly
                // more complicated message definition objects, but that's
                // irrelevant for our test.
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
        // service with one method, "SayHello"
        // "SayHello" takes "HelloRequest" and returns "HelloReply"
        const serviceDefn = {
            methods: { SayHello: { requestType: 'HelloRequest', responseType: 'HelloReply' } }
        };

        // map of messages to pbjs types
        // request types need a decode() function
        // response types need both verify() and encode() functions
        const messageMap = {
            HelloRequest: {
                // decode takes a binary pb message and returns a parsed message
                decode: toDecode => String.fromCharCode.apply(null, toDecode)
            },
            HelloReply: {
                // verify returns an error if toEncode is invalid
                verify: _ => null, // no error => valid message
                // toEncode returns an object with a "finish" method
                encode: toEncode => {
                    return {
                        // finish returns the binary pb encoding of the message
                        finish: () => JSON.stringify(toEncode)
                    }
                },
            },
        };

        const service = grpcParsing.createService('helloworld', 'SayHello', serviceDefn, messageMap);

        it('returned service obj should have the correct path', () => {
            assert.strictEqual(service['sayHello'].path, '/helloworld.SayHello/SayHello');
        });

        it('requestDeserialize should call the decode fn defined by HelloRequest ', () => {
            const deserialized = service['sayHello'].requestDeserialize([0x70, 0x62, 0x6d, 0x73, 0x67]);
            assert.strictEqual(deserialized, 'pbmsg');
        });

        it('responseSerialize should call the encode fn defined by HelloReply', () => {
            const serialized = service['sayHello'].responseSerialize({ message: 'hello world' });
            assert.strictEqual(serialized, '{"message":"hello world"}');
        });
    });

    describe('#createServiceHandler', () => {
        it('should return a map of service names to handler functions', () => {
            // service with one method, 'SayHello'
            // 'SayHello' takes 'HelloRequest' and returns 'HelloReply'
            const serviceDefn = {
                methods: { SayHello: { requestType: 'HelloRequest', responseType: 'HelloReply' } }
            };

            // mock grpc handler that just records its call
            let handlerCall;
            const grpcHandler = (_, ns, svc, method, requestType, request) => {
                handlerCall = { ns, svc, method, requestType, request };
            }

            const handler = grpcParsing.createServiceHandler('helloworld', 'Greeter', serviceDefn, grpcHandler);

            // calling sayHello should result in our handler being called
            const call = { request: { 'name': 'John Smith' } };
            const callback = () => { };
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
