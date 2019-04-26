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

    const grpcHandler = (callback, namespaceName, serviceName, methodName, responseType, request) =>
        require('./grpcRequest')
            .createFrom(namespaceName, serviceName, methodName, responseType, request)
            .then(grpcRequest => {
                logger.debug("Request: %s", JSON.stringify(grpcRequest));
                // pass req to responseFn to see if it matches our predicates
                return responseFn(grpcRequest);
            })
            .catch(err => {
                logger.error("Error during GRPC request build: %s", err);
                callback({ code: grpc.status.INTERNAL, message: err.toString() });
            })
            .then(response => {
                logger.debug("Response: %s", JSON.stringify(response));
                callback(null, response);
            });

    // parse our proto services and types from the imposter.json
    const protos = options.protos || [];
    Object.entries(protos).forEach(([namespaceName, namespaceDefn]) => {
        // use protobuf.js to parse the namespace
        const toParse = {
            // protobuf.js requires a top level key of "nested"
            nested: namespaceDefn,
        };
        const namespace = protobufjs.Namespace.fromJSON(namespaceName, toParse);

        // build a map of message names to parsed types
        const messageMap = newMessageMap(namespace);

        // add each service and corresponding handler
        getServices(namespace).forEach(([serviceName, serviceDefn]) => {
            const service = newService(namespaceName, serviceName, serviceDefn, messageMap),
                handler = newServiceHandler(namespaceName, serviceName, serviceDefn, grpcHandler);
            logger.info("Adding service: %s.%s", namespaceName, serviceName);
            server.addService(service, handler);
        });
    });

    // bind to our port, start the server and return our details
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
