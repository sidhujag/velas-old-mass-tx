"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var bs58 = require("bs58");
var BigIntBuffer = require("bigint-buffer");
var _ = require("lodash");
var Transaction_1 = require("./Dto/Transaction");
var crypto = require("crypto");
var Errors;
(function (Errors) {
    Errors["InsufficientFunds"] = "ammount + commission smaler then value";
})(Errors || (Errors = {}));
var Transaction = /** @class */ (function (_super) {
    __extends(Transaction, _super);
    function Transaction(sodium, unspents, amount, velasKey, changeAddress, to, commission) {
        var _this = _super.call(this) || this;
        _this.sign = function () {
            _this.hash = _this.generateHash();
            return _this;
        };
        _this.toJSON = function () {
            var tx = __assign(__assign({}, _.pick(_this, ['hash', 'version', 'lock_time'])), { tx_out: _this.tx_out.map(function (txOut) { return (__assign(__assign({}, _.pick(txOut, ['pk_script', 'node_id', 'index', 'payload', 'wallet_address'])), { value: Number(txOut.value) })); }), tx_in: _this.tx_in.map(function (txIn) { return (__assign(__assign({}, txIn), { public_key: Buffer.from(txIn.public_key, 'hex').toString('base64'), previous_output: __assign(__assign({}, txIn.previous_output), { value: Number(txIn.previous_output.value) }) })); }) });
            return JSON.stringify(tx);
        };
        _this.generateHash = function () {
            var payload = Buffer.alloc(8);
            payload.writeUInt32LE(_this.version, 0);
            payload.writeUInt32LE(_this.lock_time, 3);
            var payloadIn = _this.tx_in.reduce(function (res, txIn) {
                var p1 = Buffer.from(txIn.previous_output.hash, 'hex');
                var p2 = Buffer.alloc(4);
                p2.writeUInt32LE(txIn.previous_output.index, 0);
                p2 = Buffer.concat([p2, BigIntBuffer.toBufferLE(BigInt(txIn.previous_output.value), 8)]);
                var p3 = Buffer.alloc(4);
                p3.writeUInt32LE(txIn.sequence, 0);
                var p4 = Buffer.from(txIn.public_key, 'hex');
                var p5 = Buffer.from(txIn.signature_script, 'hex');
                return Buffer.concat([res, p1, p2, p3, p4, p5]);
            }, Buffer.alloc(0));
            var payloadOut = _this.hashOuts();
            payload = Buffer.concat([payload, payloadIn, payloadOut]);
            return Transaction.doubleSha256(payload);
        };
        _this.hashOuts = function () {
            return _this.tx_out.reduce(function (res, out) { return Buffer.concat([res, Transaction.hashOut(out)]); }, Buffer.alloc(0));
        };
        var totalin = unspents.reduce(function (res, po) { return res + po.value; }, BigInt(0));
        var index = 0;
        _this.tx_out = [];
        var txOut1 = new Transaction_1.TxOut();
        txOut1.index = index++;
        txOut1.pk_script = '';
        txOut1.value = commission;
        _this.tx_out = __spreadArrays(_this.tx_out, [txOut1]);
        var txOut2 = new Transaction_1.TxOut();
        txOut2.index = index++;
        txOut2.pk_script = bs58.decode(to).toString('hex');
        txOut2.value = amount;
        txOut2.wallet_address = to;
        _this.tx_out = __spreadArrays(_this.tx_out, [txOut2]);
        var change = totalin - amount - commission;
        if (change < BigInt(0)) {
            console.log("amount: " + amount + ", commission:" + commission + ", total in: " + totalin);
            throw new Error(Errors.InsufficientFunds);
        }
        else if (change > BigInt(0)) {
            var txOut3 = new Transaction_1.TxOut();
            txOut3.index = index++;
            txOut3.wallet_address = changeAddress;
            txOut3.pk_script = bs58.decode(changeAddress).toString('hex');
            txOut3.value = change;
            _this.tx_out = __spreadArrays(_this.tx_out, [txOut3]);
        }
        var pk = Buffer.from(velasKey.privateKey, 'hex');
        _this.tx_in = unspents.map(function (po) {
            var sigMsg = _this.MsgForSign(po.hash, po.index);
            var sigUintArray = sodium.crypto_sign_detached(sigMsg, pk);
            var sig = Buffer.from(sigUintArray).toString('hex');
            return {
                public_key: velasKey.publicKey,
                sequence: 1,
                previous_output: po,
                signature_script: sig,
                wallet_address: changeAddress
            };
        });
        return _this;
    }
    Transaction.prototype.MsgForSign = function (hash, index) {
        var payload = Buffer.from(hash, 'hex');
        var buffer = Buffer.alloc(12);
        // buffer.writeInt8(index, 0);
        buffer.writeUInt32LE(index, 0);
        buffer.writeUInt32LE(this.version, 4);
        buffer.writeUInt32LE(this.lock_time, 8);
        payload = Buffer.concat([payload, buffer]);
        var outPayload = this.hashOuts();
        return Buffer.concat([payload, outPayload]);
    };
    Transaction.nodeID = function (value) {
        if (value && value.trim() && value != '0000000000000000000000000000000000000000000000000000000000000000') {
            return Buffer.from(value, 'hex');
        }
        return Buffer.alloc(0);
    };
    Transaction.doubleSha256 = function (val) {
        var first = crypto.createHash('sha256').update(val).digest();
        var second = crypto.createHash('sha256').update(first).digest();
        return second.toString('hex');
    };
    Transaction.hashOut = function (val) {
        var buffer = Buffer.alloc(4);
        buffer.writeInt8(val.index, 0);
        var value = BigIntBuffer.toBufferLE(BigInt(val.value), 8);
        buffer = Buffer.concat([buffer, value]);
        var pkScript = Buffer.from(val.pk_script, 'hex');
        var nodeID = Transaction.nodeID(val.node_id);
        return Buffer.concat([buffer, pkScript, nodeID]);
    };
    return Transaction;
}(Transaction_1.TransactionBase));
exports["default"] = Transaction;
