'use strict';

/**
 * Represents an grpc imposter
 * @module
 */

function create(options, logger, responseFn) {
    const Q = require('q'),
        deferred = Q.defer(),
        connections = {},
        grpc = require('grpc'),
        server = new grpc.Server(),
        target = options.host + ":" + options.port,
        credentials = grpc.ServerCredentials.createInsecure() // FIXME

    const methodHandler = (call, callback) => {
        callback(null, { message: 'hello world' });
    }

    const service = null,
        proxyTarget = {},
        proxyHandler = {
            get: (target, prop, receiver) => {
                // give addService the same handler for everything
                return methodHandler;
            },
        },
        implementation = new Proxy(proxyTarget, proxyHandler)

    server.addService(service, implementation)

    server.bindAsync(target, credentials, (error, port) => {
        if (error) {
            deferred.reject(error)
        }
        server.start()
        deferred.resolve({
            port: port,
            metadata: {},
            proxy: {},
            encoding: 'utf8',
            close: callback => {
                server.tryShutdown(callback);
                Object.keys(connections).forEach(socket => {
                    connections[socket].destroy();
                });
            }
        });
    });

    return deferred.promise;
}

module.exports = {
    create: create,
    validate: undefined
};
