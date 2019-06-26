'use strict';

const assert = require('assert'),
    api = require('../api').create(),
    helloworldClient = require('./helloworldClient'),
    promiseIt = require('../../testHelpers').promiseIt,
    port = api.port + 1,
    timeout = parseInt(process.env.MB_SLOW_TEST_TIMEOUT || 2000);

const helloworldImposter = {
    host: '127.0.0.1',
    port: 4545,
    protocol: 'grpc',
    protos: {
        helloworld: {
            Greeter: {
                methods: {
                    SayHello: { requestType: 'HelloRequest', responseType: 'HelloReply' }
                }
            },
            HelloRequest: { fields: { 'name': { type: 'string', id: 1 } } },
            HelloReply: { fields: { 'message': { type: 'string', id: 1 } } }
        }
    }
}

describe('grpc imposter', () => {

    describe('POST /imposters/:id', () => {
        promiseIt('should auto-assign port if port not provided', () => {
            const request = { protocol: 'grpc' };

            return api.post('/imposters', request).then(response => {
                assert.strictEqual(response.statusCode, 201);
                assert.ok(response.body.port > 0);
            }).finally(() => api.del('/imposters'));
        });

        promiseIt('should use assigned port if provided', () => {
            const request = {
                protocol: 'grpc',
                port: 1234,
            };

            return api.post('/imposters', request).then(response => {
                assert.strictEqual(response.statusCode, 201);
                assert.ok(response.body.port == 1234);
            }).finally(() => api.del('/imposters'));
        });

        promiseIt('should parse helloworld imposter', () => {
            return api.post('/imposters', helloworldImposter).then(response => {
                assert.strictEqual(response.statusCode, 201);
                assert.ok(response.body.port == 4545);
            }).finally(() => api.del('/imposters'));
        });

        promiseIt('should respond with an unimplemented error on no match', () => {
            return api.post('/imposters', helloworldImposter).then(response => {
                assert.strictEqual(response.statusCode, 201);
                assert.ok(response.body.port == 4545);
            }).then(_ => {
                return helloworldClient.send({ name: 'Lionel Richie' }, 4545, '127.0.0.1');
            }).catch(err => {
                assert.equal(err.code, 12);
                assert.equal(err.details, 'unimplemented');
            }).finally(() => api.del('/imposters'));
        });

        promiseIt('should return response for method match', () => {
            const imposter = {
                ...helloworldImposter,
                stubs: [
                    {
                        predicates: [{ equals: { methodName: "helloworld.Greeter.SayHello" } }],
                        responses: [{ is: { response: { message: "Howdy stranger!" } } }]
                    }
                ]
            };

            return api.post('/imposters', imposter).then(response => {
                assert.strictEqual(response.statusCode, 201);
                assert.ok(response.body.port == 4545);
            }).then(_ => {
                return helloworldClient.send({ name: 'The Man with No Name' }, 4545, '127.0.0.1');
            }).then(response => {
                const expected = { message: 'Howdy stranger!' };
                assert.deepEqual(response, expected);
            }).finally(() => api.del('/imposters'));
        });

        promiseIt('should return response for message match', () => {
            const imposter = {
                ...helloworldImposter,
                stubs: [
                    {
                        predicates: [
                            { equals: { responseType: "helloworld.HelloReply" } },
                            { equals: { request: { name: "Clint" } } }
                        ],
                        responses: [{ is: { response: { message: "Hello Mr Eastwood." } } }]
                    }
                ]
            };

            return api.post('/imposters', imposter).then(response => {
                assert.strictEqual(response.statusCode, 201);
                assert.ok(response.body.port == 4545);
            }).then(_ => {
                return helloworldClient.send({ name: 'Clint' }, 4545, '127.0.0.1');
            }).then(response => {
                const expected = { message: 'Hello Mr Eastwood.' };
                assert.deepEqual(response, expected);
            }).finally(() => api.del('/imposters'));
        });

        promiseIt('should return a specified error default response', () => {
            const imposter = {
                ...helloworldImposter,
                defaultResponse: { error: { message: 'this is an error', code: 7 } }
            };

            return api.post('/imposters', imposter).then(response => {
                assert.strictEqual(response.statusCode, 201);
            }).then(_ => {
                return helloworldClient.send({}, 4545, '127.0.0.1');
            }).then(_ => {
                assert.fail(); // should have got an error response
            }).catch(err => {
                assert.equal(err.code, 7);
                assert.equal(err.details, 'this is an error');
            }).finally(() => api.del('/imposters'));
        });
    });
});
