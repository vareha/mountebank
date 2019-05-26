const grpc = require('grpc'),
    protobufjs = require('protobufjs');

const send = (message, port, host) => {
    protobufjs.load('helloworld.proto')
        .then(root => {
            const Client = grpc.makeGenericClientConstructor({}),
                client = new Client(
                    host + ":" + port,
                    grpc.credentials.createInsecure()
                ),
                rpcImpl = (method, requestData, callback) => {
                    const service = method.parent,
                        namespace = service.parent;
                    client.makeUnaryRequest(
                        "/" + namespace.name + "." + service.name + "/" + method.name,
                        arg => arg,
                        arg => arg,
                        requestData,
                        callback
                    );
                },
                Greeter = root.lookup('Greeter'),
                greeter = Greeter.create(rpcImpl, false, false);
            return greeter.sayHello(message);
        })
        .then(response => console.log(response));
}

module.exports = {
    send: send
};
