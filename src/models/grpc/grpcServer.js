'use strict';

/**
 * Represents an grpc imposter
 * @module
 */

function create (options, logger, responseFn) {
    const Q = require('q'),
        deferred = Q.defer(),
        connections = {},
        grpc = require('grpc'),
        server = new grpc.Server(),
        target = options.host + ":" + options.port,
        credentials = grpc.ServerCredentials.createInsecure() // FIXME

    server.bindAsync(target, credentials, (error, port) => {
        if (error) {
            deferred.reject(error)
        }
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
