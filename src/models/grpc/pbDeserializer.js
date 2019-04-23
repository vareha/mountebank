'use strict';

function create(messageDefinition) {
    const jspb = require('google-protobuf'),
        fields = Object.keys(messageDefinition).reduce((arr, key, idx) => {
            const definition = messageDefinition[key],
                i = definition.i || idx;
            arr[i] = { name: key, ...definition };
            return arr;
        }, [])
    return buffer => {
        const msg = {},
            bytes = new Uint8Array(buffer),
            reader = new jspb.BinaryReader(bytes);
        while (reader.nextField()) {
            if (reader.isEndGroup()) {
                break;
            }
            const field = reader.getFieldNumber(),
                definition = fields[field];
            if (!definition) {
                reader.skipField();
                continue;
            }
            const type = definition.t || "STRING",
                name = definition.name;
            switch (type) {
                case "STRING":
                    msg[name] = reader.readString();
                    break;
                default:
                    throw new Error("unrecognized protobuf field type: " + type)
            }
        }
        return msg;
    };
}

module.exports = {
    create: create,
}
