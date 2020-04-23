import * as crypto from 'crypto';
import * as bs58 from 'bs58';
import { add } from "libsodium-wrappers";

const version = Buffer.from(new Uint8Array([15, 244]));
const addressChecksumLen = 4;

export default class Wallet {
  address: Buffer;
  Base58Address: string;
  private _publicKey: Buffer;

  constructor(publicKey: Buffer) {
    this._publicKey = publicKey;
    let payload = Buffer.alloc(0);
    payload = Buffer.concat([payload, version]);
    const pub256Key = crypto.createHash('sha256').update(publicKey).digest();
    const ripmd160 = crypto.createHash('ripemd160').update(pub256Key).digest();
    payload = Buffer.concat([payload, ripmd160]);
    const checksum = Wallet.makeChecksum(payload);

    payload = Buffer.concat([payload, checksum]);
    this.address = payload;
    this.Base58Address = bs58.encode(payload)
  }

  private static makeChecksum(payload: Buffer): Buffer {
    const firstSha256 = crypto.createHash('sha256').update(payload).digest();
    const secondSha256 = crypto.createHash('sha256').update(firstSha256).digest();
    const checksum = Buffer.alloc(4);
    secondSha256.copy(checksum, 0, 0, addressChecksumLen);
    return checksum
  }

  static IsValidAddress(address: string): boolean {
    let addressBytes;
    try {
      addressBytes = bs58.decode(address);
    } catch (e) {
      console.error(e);
      return false;
    }
    if (addressBytes.length < version.length + addressChecksumLen) {
      return false;
    }
    const ver = addressBytes.subarray(0, 2);

    if (Buffer.compare(Buffer.from(ver), Buffer.from(version)) !== 0) {
      return false;
    }
    const payload = addressBytes.subarray(0, addressBytes.length - addressChecksumLen);
    const check = Wallet.makeChecksum(payload);
    const checkAddress = Buffer.concat([Buffer.from(payload), Buffer.from(check)]);
    return Buffer.compare(checkAddress, addressBytes) == 0;
  }
}

