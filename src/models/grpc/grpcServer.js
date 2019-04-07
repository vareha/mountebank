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
        var reply = new messages.HelloReply();
        reply.setMessage('Hello ' + call.request.getName());
        callback(null, reply)
    }

    // https://github.com/grpc/grpc/tree/v1.19.0/examples/node/static_codegen
    var messages = require('./helloworld_pb');
    var services = require('./helloworld_grpc_pb');

    let service = services.GreeterService,
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
