"use strict";
exports.__esModule = true;
var crypto = require("crypto");
var bs58 = require("bs58");
var version = Buffer.from(new Uint8Array([15, 244]));
var addressChecksumLen = 4;
var Wallet = /** @class */ (function () {
    function Wallet(publicKey) {
        this._publicKey = publicKey;
        var payload = Buffer.alloc(0);
        payload = Buffer.concat([payload, version]);
        var pub256Key = crypto.createHash('sha256').update(publicKey).digest();
        var ripmd160 = crypto.createHash('ripemd160').update(pub256Key).digest();
        payload = Buffer.concat([payload, ripmd160]);
        var checksum = Wallet.makeChecksum(payload);
        payload = Buffer.concat([payload, checksum]);
        this.address = payload;
        this.Base58Address = bs58.encode(payload);
    }
    Wallet.makeChecksum = function (payload) {
        var firstSha256 = crypto.createHash('sha256').update(payload).digest();
        var secondSha256 = crypto.createHash('sha256').update(firstSha256).digest();
        var checksum = Buffer.alloc(4);
        secondSha256.copy(checksum, 0, 0, addressChecksumLen);
        return checksum;
    };
    Wallet.IsValidAddress = function (address) {
        var addressBytes;
        try {
            addressBytes = bs58.decode(address);
        }
        catch (e) {
            console.error(e);
            return false;
        }
        if (addressBytes.length < version.length + addressChecksumLen) {
            return false;
        }
        var ver = addressBytes.subarray(0, 2);
        if (Buffer.compare(Buffer.from(ver), Buffer.from(version)) !== 0) {
            return false;
        }
        var payload = addressBytes.subarray(0, addressBytes.length - addressChecksumLen);
        var check = Wallet.makeChecksum(payload);
        var checkAddress = Buffer.concat([Buffer.from(payload), Buffer.from(check)]);
        return Buffer.compare(checkAddress, addressBytes) == 0;
    };
    return Wallet;
}());
exports["default"] = Wallet;
