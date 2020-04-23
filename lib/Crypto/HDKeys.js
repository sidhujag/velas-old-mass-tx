"use strict";
exports.__esModule = true;
var Wallet_1 = require("./Wallet");
var crypto_1 = require("crypto");
var HDKeys = /** @class */ (function () {
    function HDKeys(keyPair) {
        var _this = this;
        this.toWallet = function () {
            return new Wallet_1["default"](Buffer.from(_this._keyPair.publicKey));
        };
        this._keyPair = keyPair;
        this.privateKey = Buffer.from(keyPair.privateKey).toString('hex');
        this.publicKey = Buffer.from(keyPair.publicKey).toString('hex');
    }
    return HDKeys;
}());
exports["default"] = HDKeys;
var ED25519_CURVE = 'Velas seed';
var HARDENED_OFFSET = 0x80000000;
exports.getMasterKeyFromSeed = function (seed) {
    var hmac = crypto_1.createHmac('sha512', ED25519_CURVE);
    var I = hmac.update(Buffer.from(seed, 'hex')).digest();
    var IL = I.slice(0, 32);
    var IR = I.slice(32);
    return {
        key: IL,
        chainCode: IR
    };
};
exports.CKDPriv = function (_a, index) {
    var key = _a.key, chainCode = _a.chainCode;
    var indexBuffer = Buffer.allocUnsafe(4);
    indexBuffer.writeUInt32BE(index, 0);
    var data = Buffer.concat([Buffer.alloc(1, 0), key, indexBuffer]);
    var I = crypto_1.createHmac('sha512', chainCode)
        .update(data)
        .digest();
    var IL = I.slice(0, 32);
    var IR = I.slice(32);
    return {
        key: IL,
        chainCode: IR
    };
};
exports.derivePath = function (path, seed) {
    if (!exports.isValidPath(path)) {
        throw new Error('Invalid derivation path');
    }
    var _a = exports.getMasterKeyFromSeed(seed), key = _a.key, chainCode = _a.chainCode;
    var segments = path
        .split('/')
        .slice(1)
        .map(exports.replaceDerive)
        .map(function (el) { return parseInt(el, 10); });
    return segments.reduce(function (parentKeys, segment) { return exports.CKDPriv(parentKeys, segment + HARDENED_OFFSET); }, { key: key, chainCode: chainCode });
};
exports.isValidPath = function (path) {
    if (!exports.pathRegex.test(path)) {
        return false;
    }
    return !path
        .split('/')
        .slice(1)
        .map(exports.replaceDerive)
        .some(isNaN);
};
exports.pathRegex = new RegExp("^m(\\/[0-9]+')+$");
exports.replaceDerive = function (val) { return val.replace("'", ''); };
