'use strict';

const assert = require('assert'),
    api = require('../api').create(),
    // client = require('./smtpClient'),
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
    });
});
