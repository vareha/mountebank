'use strict';

function create(messageDefinition) {
    const jspb = require('google-protobuf');
    return msg => {
        const writer = new jspb.BinaryWriter()
        Object.keys(msg).forEach(key => {
            const definition = messageDefinition[key];
            if (!definition) {
                throw new Error("no definition for field: " + key)
            }
            const idx = definition.i,
                type = definition.t || "STRING",
                val = msg[key];
            switch (type) {
                case "STRING":
                    writer.writeString(idx, val);
                    break;
                case "UINT32":
                    writer.writeUint32(idx, val);
                    break;
                case "BOOL":
                    writer.writeBool(idx, val);
                    break;
                default:
                    throw new Error("unrecognized protobuf field type: " + type)
            }
        });
        return writer.getResultBuffer();
    };
}

module.exports = {
    create: create,
};
