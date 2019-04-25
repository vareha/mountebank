'use strict';

const grpc = require('grpc');

/**
 * @param {Namespace} pbjsNamespace A protobuf.js namespace.
 * @returns {Array} All message definitions in the namespace.
 */
const getMessages = pbjsNamespace =>
    Object.entries(pbjsNamespace.nested)
        .filter(([_, messageDefn]) => messageDefn.hasOwnProperty('fields'));

/**
 * @param {Namespace} pbjsNamespace A protobuf.js namespace.
 * @returns {Array} All service definitions in the namespace.
 */
const getServices = pbjsNamespace =>
    Object.entries(pbjsNamespace.nested)
        .filter(([_, messageDefn]) => messageDefn.hasOwnProperty('methods'));

/**
 * @param {Namespace} pbjsNamespace A protobuf.js namespace.
 * @returns {Object} A map of message names to protobuf.js types, for all of the messages
 * defined in the pbjsNamespace.
 */
const newMessageMap = pbjsNamespace =>
    getMessages(pbjsNamespace)
        .reduce(
            (messageMap, [messageName, _]) => {
                messageMap[messageName] = pbjsNamespace.lookupType(messageName);
                return messageMap;
            },
            {}
        );

const serialize = (toSerialize, messageType) => {
    const err = messageType.verify(toSerialize);
    if (err) {
        // logger.error(err);
        throw Error(err);
    }
    return messageType.encode(toSerialize).finish();
}

/**
 *
 * @param {Object} messageMap A map of message names to protobuf.js types.
 * @param {string} namespace The namespace that owns the service.
 * @param {string} serviceName The name of the service that owns the method.
 * @param {string} methodName The name of the method.
 * @param {Object} methodDefn The method definition, which should define both
 * requestType and responseType.
 * @returns {Object} A valid method object.
 */
const newMethod = (messageMap, namespace, serviceName, methodName, methodDefn) => {
    const requestType = messageMap[methodDefn.requestType],
        responseType = messageMap[methodDefn.responseType];
    if (!requestType) {
        throw Error(`No message defined for ${methodDefn.requestType}`);
    }
    if (!responseType) {
        throw Error(`No message defined for ${methodDefn.responseType}`);
    }
    return {
        path: `/${namespace}.${serviceName}/${methodName}`,
        requestStream: false,
        responseStream: false,
        requestDeserialize: request => requestType.decode(request),
        responseSerialize: response => serialize(response, responseType)
    };
}

const getMethodKey = methodName => methodName[0].toLowerCase() + methodName.substring(1);

/**
 * @param {Object} messageMap A map of message names to protobuf.js types.
 * @param {string} namespace The namespace that owns the service.
 * @param {string} serviceName The name of the service.
 * @param {Object} serviceDefn The service definition, which should define an
 * array of methods.
 * @returns {Object} A valid service object, ready to be passed to
 * grpc.Server.addService().
 */
const newService = (messageMap, namespace, serviceName, serviceDefn) =>
    Object.entries(serviceDefn.methods)
        .reduce(
            (service, [methodName, methodDefn]) => {
                service[getMethodKey(methodName)] = newMethod(messageMap, namespace, serviceName, methodName, methodDefn);
                return service;
            },
            {}
        );

const newMethodHandler = (logger, namespace, serviceName, methodName, methodDefn) => {
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

const newServiceHandler = (logger, namespace, serviceName, serviceDefn) =>
    Object.entries(serviceDefn.methods)
        .reduce(
            (serviceHandler, [methodName, methodDefn]) => {
                serviceHandler[getMethodKey(methodName)] = newMethodHandler(logger, namespace, serviceName, methodName, methodDefn);
                return serviceHandler;
            },
            {}
        );

module.exports = {
    getMessages,
    getServices,
    newMessageMap,
    newMethod,
    newService,
    newServiceHandler,
    newMethodHandler
};
