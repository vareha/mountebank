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
        server = new grpc.Server(),
        target = options.host + ":" + options.port,
        credentials = grpc.ServerCredentials.createInsecure() // FIXME

    const messages = {
        "nested": {
            "HelloRequest": {
                "fields": {
                    "name": {
                        "type": "string",
                        "id": 1
    }
                }
            },
            "HelloReply": {
                "fields": {
                    "message": {
                        "type": "string",
                        "id": 1
                    }
                }
            }
        }
    }

    const root = protobufjs.Root.fromJSON(messages),
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
