'use strict';

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
 * @returns {Object} A map of message names to protobuf.js types.
 */
const createMessageMap = pbjsNamespace =>
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
};

/**
 * @param {string} namespaceName The name of the namespace that owns the service.
 * @param {string} serviceName The name of the service that owns the method.
 * @param {string} methodName The name of the method.
 * @param {Object} messageMap A map of message names to protobuf.js types.
 * @param {Object} methodDefn The method definition, which should define both requestType and responseType.
 * @returns {Object} A valid method object.
 */
const createMethod = (namespaceName, serviceName, methodName, messageMap, methodDefn) => {
    const requestType = messageMap[methodDefn.requestType],
        responseType = messageMap[methodDefn.responseType];
    if (!requestType) {
        throw Error(`No message defined for ${methodDefn.requestType}`);
    }
    if (!responseType) {
        throw Error(`No message defined for ${methodDefn.responseType}`);
    }
    return {
        path: `/${namespaceName}.${serviceName}/${methodName}`,
        requestStream: false,
        responseStream: false,
        requestDeserialize: request => requestType.decode(request),
        responseSerialize: response => serialize(response, responseType)
    };
};

const getMethodKey = methodName => methodName[0].toLowerCase() + methodName.substring(1);

/**
 * @param {string} namespaceName The name of the namespace that owns the service.
 * @param {string} serviceName The name of the service.
 * @param {Object} serviceDefn The service definition, which should define an array of methods.
 * @param {Object} messageMap A map of message names to protobuf.js types.
 * @returns {Object} A valid service object, ready to be passed to grpc.Server.addService().
 */
const createService = (namespaceName, serviceName, serviceDefn, messageMap) =>
    Object.entries(serviceDefn.methods)
        .reduce(
            (service, [methodName, methodDefn]) => {
                const methodKey = getMethodKey(methodName);
                service[methodKey] = createMethod(namespaceName, serviceName, methodName, messageMap, methodDefn);
                return service;
            },
            {}
        );

/**
 * @callback grpcHandlerCallback
 * @param {function} callback
 * @param {string} namespaceName
 * @param {string} serviceName
 * @param {string} methodName
 * @param {string} responseType
 * @param {Object} request
 * */

/**
 * @param {string} namespaceName The name of the namespace that owns the service.
 * @param {string} serviceName The name of the service.
 * @param {Object} serviceDefn The service definition, which should define an array of methods.
 * @param {grpcHandlerCallback} grpcHandler A function to be called to handle GRPC calls.
 * @returns {Object} A map of service names to functions, ready to be passed to grpc.Server.addService().
 */
const createServiceHandler = (namespaceName, serviceName, serviceDefn, grpcHandler) =>
    Object.entries(serviceDefn.methods)
        .reduce(
            (serviceHandler, [methodName, methodDefn]) => {
                const methodKey = getMethodKey(methodName);
                serviceHandler[methodKey] =
                    (call, callback) =>
                        grpcHandler(callback, namespaceName, serviceName, methodName, methodDefn.responseType, call.request);
                return serviceHandler;
            },
            {}
        );

module.exports = {
    getMessages,
    getServices,
    createMessageMap,
    createService,
    createServiceHandler
};
