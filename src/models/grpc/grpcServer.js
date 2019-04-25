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
        newService = require('./grpcParsing').newService,
        server = new grpc.Server(),
        target = options.host + ":" + options.port,
        credentials = grpc.ServerCredentials.createInsecure() // FIXME

    const root = protobufjs.Root.fromJSON(options.protos[0]),
        helloRequest = root.lookupType("HelloRequest"),
        helloReply = root.lookupType("HelloReply");

    function sayHello(call, callback) {
        logger.info('sayHello: %s', JSON.stringify(call));
        const reply = { message: "hello john smith" };
        callback(null, reply);
    }

    function serialize(toSerialize, messageType) {
        const err = messageType.verify(toSerialize);
        if (err) {
            logger.error(err);
            throw Error(err);
        }
        return messageType.encode(toSerialize).finish();
    }

    const namespace = "helloworld";
    const services = Object.entries(root.nested)
        .filter(([_, serviceDefn]) => serviceDefn.hasOwnProperty('methods'))
        .map(([serviceName, serviceDefn]) => newService(root, namespace, serviceName, serviceDefn));

    const greeterService = {
        sayHello: {
            path: '/helloworld.Greeter/SayHello',
            requestStream: false,
            responseStream: false,
            requestDeserialize: buffer_arg => helloRequest.decode(buffer_arg),
            responseSerialize: arg => serialize(arg, helloReply),
        }
    };
    server.addService(greeterService, { sayHello: sayHello });

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
