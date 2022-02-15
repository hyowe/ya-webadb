import type { Disposable } from "@yume-chan/event";
import type { WritableStream } from '@yume-chan/adb';
import type { AndroidCodecLevel, AndroidCodecProfile } from "../codec";

export interface H264EncodingInfo {
    profileIndex: number;
    constraintSet: number;
    levelIndex: number;

    encodedWidth: number;
    encodedHeight: number;

    cropLeft: number;
    cropRight: number;

    cropTop: number;
    cropBottom: number;

    croppedWidth: number;
    croppedHeight: number;
}

export interface H264Decoder extends Disposable {
    readonly maxProfile: AndroidCodecProfile;

    readonly maxLevel: AndroidCodecLevel;

    readonly renderer: HTMLElement;

    readonly writable: WritableStream<ArrayBuffer>;

    changeEncoding(size: H264EncodingInfo): void;
}

export interface H264DecoderConstructor {
    new(): H264Decoder;
}
