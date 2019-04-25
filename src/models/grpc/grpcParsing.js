'use strict';

const newMethod = (protos, namespace, serviceName, methodName, methodDefn) => {
    const requestType = protos.lookupType(methodDefn.requestType),
        responseType = protos.lookupType(methodDefn.responseType);
    return {
        path: `/${namespace}.${serviceName}/${methodName}`,
        requestStream: false,
        responseStream: false,
        requestDeserialize: request => requestType.decode(request),
        responseSerialize: response => serialize(response, responseType)
    };
}

const newService = (protos, namespace, serviceName, serviceDefn) =>
    Object.entries(serviceDefn.methods)
        .reduce(
            (service, [methodName, methodDefn]) => {
                service[methodName] = newMethod(protos, namespace, serviceName, methodName, methodDefn);
                return service;
            },
            {}
        );

module.exports = {
    newService,
    newMethod,
};
