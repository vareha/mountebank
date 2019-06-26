'use strict';

/**
 * Transforms a raw GRPC request into the API-friendly representation of one
 * @module
 */

/**
 * @param {string} namespaceName
 * @param {string} serviceName
 * @param {string} methodName
 * @param {string} responseType
 * @param {Object} request
 */
const createFrom = (namespaceName, serviceName, methodName, responseType, request) => {
    const Q = require('q');
    return Q({
        methodName: [namespaceName, serviceName, methodName].join('.'),
        responseType: [namespaceName, responseType].join('.'),
        request: request
    });
};

module.exports = {
    createFrom
};
