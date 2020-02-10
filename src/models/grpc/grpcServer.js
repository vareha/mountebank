'use strict';

/**
 * Represents an grpc imposter
 * @module
 */

function create(options, logger, responseFn) {
    const Q = require('q'),
        deferred = Q.defer(),
        grpc = require('grpc'),
        protobufjs = require('protobufjs'),
        connections = {},
        grpcParsing = require('./grpcParsing'),
        getServices = grpcParsing.getServices,
        createMessageMap = grpcParsing.createMessageMap,
        createService = grpcParsing.createService,
        createServiceHandler = grpcParsing.createServiceHandler,
        server = new grpc.Server(),
        host = options.host || '',
        port = options.port || 4545,
        target = host + ':' + port;

    const credentials = options.cert && options.key
        ? grpc.ServerCredentials.createSsl(null, [{ private_key: options.key, cert_chain: options.cert }], false)
        : grpc.ServerCredentials.createInsecure();

    const grpcHandler = (callback, namespaceName, serviceName, methodName, responseType, request) =>
        require('./grpcRequest')
            .createFrom(namespaceName, serviceName, methodName, responseType, request)
            .then(grpcRequest => {
                logger.debug('Request: %s', JSON.stringify(grpcRequest));
                // pass req to responseFn to see if it matches our predicates
                return responseFn(grpcRequest);
            })
            .then(response => {
                response = Object.entries(response).length ? response : options.defaultResponse || {};
                if (response.response) {
                    logger.debug('Response: %s', JSON.stringify(response));
                    return callback(null, response.response);
                }
                if (response.error) {
                    const error = { code: grpc.status.UNKNOWN, message: '', ...response.error };
                    logger.debug('Error response: %s', JSON.stringify(error));
                    return callback(error);
                }
                if (!Object.keys(response).length) {
                    // empty default object => unimplemented error
                    const error = { code: grpc.status.UNIMPLEMENTED, message: 'unimplemented' };
                    logger.debug('Unimplemented response');
                    return callback(error);
                }
                throw Error(`Response ${JSON.stringify(response)} is invalid`);
            })
            .catch(err => {
                logger.error('Error during GRPC request handling: %s', err);
                return callback({ code: grpc.status.INTERNAL, message: err.toString() });
            });

    // parse our proto services and types from the imposter.json
    const protos = options.protos || [];

    function isService(json) {
        return Object
          .entries(json)
          .reduce((hasMethods, [propName, child]) => {
            if (hasMethods) return true; // если уже есть методы, но не проверять чаилдов на methods
            if (typeof child !== 'object') return false; // если не объект, то не проверять чаилдов на methods
      
            return Boolean(child.methods) || isService(child);
          }, false);
      }

    function processNode (jsonDescriptor, fullNamespace = '') {
        return Object
          .entries(jsonDescriptor)
          .reduce((acc, [namespaceName, namespaceDefn]) => {
            switch (typeof namespaceDefn) {
              case "function":
              case "number":
              case "boolean":
              case "string": {
                return { ...acc, [namespaceName]: namespaceDefn, fullNamespace }
              }
              default: {
                if (Object.entries(namespaceDefn).some(isService)) {
                    var toParse = {
                        // protobuf.js requires a top level key of "nested"
                        nested: namespaceDefn
                    };
                    const fullNamespace = acc.prevPropName ? `${acc.prevPropName}.${namespaceName}` : namespaceName
                    var namespace = protobufjs.Namespace.fromJSON(namespaceName, toParse);
                    var messageMap = createMessageMap(namespace);
                    // add each service and corresponding handler
                    getServices(namespace).forEach(([serviceName, serviceDefn]) => {
                        var service = createService(fullNamespace, serviceName, serviceDefn, messageMap),
                            handler = createServiceHandler(fullNamespace, serviceName, serviceDefn, grpcHandler);
                        logger.info('Adding service: %s.%s', fullNamespace, serviceName);
                        server.addService(service, handler);
                    });
                    return { ...acc, [namespaceName]: processNode(namespaceDefn, fullNamespace), fullNamespace }
                }
             }
            }
          }, { prevPropName: fullNamespace });
      }

    processNode(protos)

    // bind to our port, start the server and return our details
    server.bindAsync(target, credentials, (error, port) => {
        if (error) {
            return deferred.reject(error);
        }
        server.start();
        return deferred.resolve({
            port: port,
            metadata: {},
            proxy: {},
            encoding: 'utf8',
            key: options.cert && options.key,
            cert: options.key && options.cert,
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
