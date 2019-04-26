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

    const grpcHandler = (callback, namespaceName, serviceName, methodName, responseType, request) => {
        logger.info("Called: %s", JSON.stringify([namespaceName, serviceName, methodName, responseType, request]));
        if (namespaceName == "helloworld" && serviceName == "Greeter" && methodName == "SayHello") {
            return callback(null, { message: "hello john smith" });
        }
        if (responseType == "HelloReply") {
            return callback(null, { message: "hello john smith" });
        }
        return callback({
            code: grpc.status.UNIMPLEMENTED,
            message: "No matching predicates found for request",
        });
    }

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
            const service = newService(messageMap, namespaceName, serviceName, serviceDefn),
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
