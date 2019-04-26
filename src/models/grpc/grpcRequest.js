'use strict';

/**
 * Transforms a raw GRPC request into the API-friendly representation of one
 * @module
 */

function createFrom(namespaceName, serviceName, methodName, responseType, request) {
    const Q = require('q');
    return Q({
        namespaceName: namespaceName,
        serviceName: serviceName,
        methodName: methodName,
        responseType: responseType,
        request: request
    });
}

module.exports = {
    createFrom
};
