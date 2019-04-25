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
        server = new grpc.Server(),
        target = options.host + ":" + options.port,
        credentials = grpc.ServerCredentials.createInsecure() // FIXME

    const root = protobufjs.Root.fromJSON(options.protos);

    const messageMap = newMessageMap(root);

    const namespace = "helloworld";

    const newMethodHandler = (namespace, serviceName, methodName, methodDefn) => {
        return (call, callback) => {
            logger.info("Called: %s", JSON.stringify([call.request, namespace, serviceName, methodName, methodDefn.responseType]));
            if (namespace == "helloworld" && serviceName == "Greeter" && methodName == "SayHello") {
                return callback(null, { message: "hello john smith" });
            }
            if (methodDefn.responseType == "HelloReply") {
                return callback(null, { message: "hello john smith" });
            }
            return callback({
                code: grpc.status.UNIMPLEMENTED,
                message: "No matching predicates found for request",
            });
        };
    };

    const getMethodKey = methodName => methodName[0].toLowerCase() + methodName.substring(1);

    const newServiceHandler = (namespace, serviceName, serviceDefn) => Object.entries(serviceDefn.methods)
        .reduce(
            (serviceHandler, [methodName, methodDefn]) => {
                serviceHandler[getMethodKey(methodName)] = newMethodHandler(namespace, serviceName, methodName, methodDefn);
                return serviceHandler;
            },
            {}
        );

    // add each service and corresponding handler
    getServices(root).forEach(([serviceName, serviceDefn]) => {
        const service = newService(messageMap, namespace, serviceName, serviceDefn),
            handler = newServiceHandler(namespace, serviceName, serviceDefn);
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
