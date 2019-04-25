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

    const root = protobufjs.Root.fromJSON(options.protos[0]);

    const messageMap = newMessageMap(root);

    function sayHello(call, callback) {
        logger.info('sayHello: %s', JSON.stringify(call));
        const reply = { message: "hello john smith" };
        callback(null, reply);
    }

    const namespace = "helloworld";
    const services = getServices(root)
        .map(([serviceName, serviceDefn]) => newService(messageMap, namespace, serviceName, serviceDefn));
    server.addService(services[0], { sayHello: sayHello });

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
