'use strict';

const assert = require('assert'),
    api = require('../api').create(),
    // client = require('./smtpClient'),
    promiseIt = require('../../testHelpers').promiseIt,
    port = api.port + 1,
    timeout = parseInt(process.env.MB_SLOW_TEST_TIMEOUT || 2000);

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
    });
});
