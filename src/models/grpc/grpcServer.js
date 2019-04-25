'use strict';

/**
 * Represents an grpc imposter
 * @module
 */

function create(options, logger, responseFn) {
    const Q = require('q'),
        deferred = Q.defer(),
        grpc = require('grpc'),
        protobufjs = require("protobufjs"),
        connections = {},
        grpcParsing = require('./grpcParsing'),
        getServices = grpcParsing.getServices,
        newMessageMap = grpcParsing.newMessageMap,
        newService = grpcParsing.newService,
        newServiceHandler = grpcParsing.newServiceHandler,
        server = new grpc.Server(),
        target = options.host + ":" + options.port,
        credentials = grpc.ServerCredentials.createInsecure() // FIXME

    // parse our proto services and types from the imposter.json
    const namespace = "helloworld";
    const root = protobufjs.Root.fromJSON(options.protos);

    // build a map of message names to parsed types
    const messageMap = newMessageMap(root);

    // add each service and corresponding handler
    getServices(root).forEach(([serviceName, serviceDefn]) => {
        const service = newService(messageMap, namespace, serviceName, serviceDefn),
            handler = newServiceHandler(logger, namespace, serviceName, serviceDefn);
        logger.info("Adding service: %s", serviceName);
        server.addService(service, handler);
    })

    // bind to our port and return our details
    server.bindAsync(target, credentials, (error, port) => {
        if (error) {
            return deferred.reject(error)
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
