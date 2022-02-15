import Struct from '@yume-chan/struct';
import { BufferedStream } from './stream';
import { ReadableWritablePair, TransformStream, WritableStreamDefaultWriter } from "./utils";

export enum AdbCommand {
    Auth = 0x48545541,    // 'AUTH'
    Close = 0x45534c43,   // 'CLSE'
    Connect = 0x4e584e43, // 'CNXN'
    OK = 0x59414b4f,      // 'OKAY'
    Open = 0x4e45504f,    // 'OPEN'
    Write = 0x45545257,   // 'WRTE'
}

const AdbPacketHeader =
    new Struct({ littleEndian: true })
        .uint32('command')
        .uint32('arg0')
        .uint32('arg1')
        .uint32('payloadLength')
        .uint32('checksum')
        .int32('magic');

const AdbPacketStruct =
    new Struct({ littleEndian: true })
        .fields(AdbPacketHeader)
        .arrayBuffer('payload', { lengthField: 'payloadLength' });

export type AdbPacket = typeof AdbPacketStruct['TDeserializeResult'];

export type AdbPacketInit = Omit<typeof AdbPacketStruct['TInit'], 'checksum' | 'magic'>;

export class AdbPacketStream implements ReadableWritablePair<AdbPacket, ArrayBuffer> {
    private _writeable = new TransformStream<ArrayBuffer, ArrayBuffer>();
    private _buffered = new BufferedStream(this._writeable.readable);
    public get writable() { return this._writeable.writable; }

    private _readable = new TransformStream<AdbPacket, AdbPacket>();
    private _readableWriter = this._readable.writable.getWriter();
    public get readable() { return this._readable.readable; }

    public constructor() {
        this.receiveLoop();
    }

    private async receiveLoop() {
        try {
            while (true) {
                const packet = await AdbPacketStruct.deserialize(this._buffered);
                this._readableWriter.write(packet);
            }
        } catch (e) {
            this._readableWriter.close();
        }
    }
}

export async function writeAdbPacket(
    init: AdbPacketInit,
    calculateChecksum: boolean,
    writer: WritableStreamDefaultWriter<ArrayBuffer>
): Promise<void> {
    let checksum: number;
    if (calculateChecksum && init.payload) {
        const array = new Uint8Array(init.payload);
        checksum = array.reduce((result, item) => result + item, 0);
    } else {
        checksum = 0;
    }

    const packet = {
        ...init,
        checksum,
        magic: init.command ^ 0xFFFFFFFF,
        payloadLength: init.payload.byteLength,
    };

    // Write payload separately to avoid an extra copy
    const header = AdbPacketHeader.serialize(packet);
    await writer.write(header);
    if (packet.payload.byteLength) {
        await writer.write(packet.payload);
    }
}
