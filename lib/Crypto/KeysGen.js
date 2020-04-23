"use strict";
exports.__esModule = true;
var HDKeys_1 = require("./HDKeys");
var default_1 = /** @class */ (function () {
    function default_1(sodium) {
        var _this = this;
        this.generateRandom = function () {
            var keyPair = _this.sodium.crypto_sign_keypair();
            return new HDKeys_1["default"](keyPair);
        };
        this.fromPrivateKey = function (privateKey) {
            var pkBuf = Buffer.from(privateKey, 'hex');
            var seed = _this.sodium.crypto_sign_ed25519_sk_to_seed(pkBuf);
            var keyPair = _this.sodium.crypto_sign_seed_keypair(seed);
            return new HDKeys_1["default"](keyPair);
        };
        // fromSeed = (seed: string, path = 'm/0\''): HDKeys => {
        this.fromSeed = function (seed, path) {
            if (path === void 0) { path = 0; }
            var path_index = 'm/' + path + '\'';
            var key = HDKeys_1.derivePath(path_index, seed).key;
            return new HDKeys_1["default"](_this.sodium.crypto_sign_seed_keypair(key));
        };
        this.sodium = sodium;
    }
    return default_1;
}());
exports["default"] = default_1;
