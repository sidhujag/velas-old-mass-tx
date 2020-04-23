import HDKeys from './HDKeys';
import * as bs58 from 'bs58';
import * as BigIntBuffer from 'bigint-buffer';
import * as _ from 'lodash';

import {Out, TransactionBase, TransactionDto, TxIn, TxOut} from './Dto/Transaction';
import * as crypto from "crypto";

enum Errors {
	InsufficientFunds = "ammount + commission smaler then value",
}

export default class Transaction extends TransactionBase<bigint> {
	constructor(sodium, unspents: Out<bigint>[], amount: bigint, velasKey: HDKeys, changeAddress: string, to: string, commission: bigint) {
		super();
		const totalin = unspents.reduce((res, po) => res + po.value, BigInt(0));
		let index = 0;

		this.tx_out = [];

		const txOut1 = new TxOut<bigint>();
		txOut1.index = index++;
		txOut1.pk_script = '';
		txOut1.value = commission;
		this.tx_out = [...this.tx_out, txOut1];

		const txOut2 = new TxOut<bigint>();
		txOut2.index = index++;
		txOut2.pk_script = bs58.decode(to).toString('hex');
		txOut2.value = amount;
		txOut2.wallet_address = to;
		this.tx_out = [...this.tx_out, txOut2];

		const change = totalin - amount - commission;
		if (change < BigInt(0)) {
			console.log(`amount: ${amount}, commission:${commission}, total in: ${totalin}`);
			throw new Error(Errors.InsufficientFunds);
		} else if (change > BigInt(0)) {
			const txOut3 = new TxOut<bigint>();
			txOut3.index = index++;
			txOut3.wallet_address = changeAddress;
			txOut3.pk_script = bs58.decode(changeAddress).toString('hex');
			txOut3.value = change;
			this.tx_out = [...this.tx_out, txOut3];
		}

		const pk = Buffer.from(velasKey.privateKey, 'hex');

		this.tx_in = unspents.map((po: Out<bigint>): TxIn<bigint> => {
			const sigMsg = this.MsgForSign(po.hash, po.index);
			const sigUintArray = sodium.crypto_sign_detached(sigMsg, pk);
			const sig = Buffer.from(sigUintArray).toString('hex');

			return {
				public_key: velasKey.publicKey,
				sequence: 1,
				previous_output: po,
				signature_script: sig,
				wallet_address: changeAddress
			};
		})
	}

	public sign = (): Transaction => {
		this.hash = this.generateHash();
		return this;
	};

	public toJSON = (): string => {
		const tx: TransactionDto = {
			..._.pick(this, ['hash', 'version', 'lock_time']),
			tx_out: this.tx_out.map((txOut): TxOut<number> => (
				{
					..._.pick(txOut, ['pk_script', 'node_id', 'index', 'payload', 'wallet_address']),
					value: Number(txOut.value)
				}
			)),
			tx_in: this.tx_in.map(txIn => (
				{
					...txIn,
					public_key: Buffer.from(txIn.public_key, 'hex').toString('base64'),
					previous_output: {...txIn.previous_output, value: Number(txIn.previous_output.value)}
				}
			)),
		};

		return JSON.stringify(tx);
	};

	private generateHash = (): string => {
		let payload = Buffer.alloc(8);
		payload.writeUInt32LE(this.version, 0);
		payload.writeUInt32LE(this.lock_time, 3);
		const payloadIn = this.tx_in.reduce((res: Buffer, txIn: TxIn<bigint>) => {
			const p1 = Buffer.from(txIn.previous_output.hash, 'hex');
			let p2 = Buffer.alloc(4);
			p2.writeUInt32LE(txIn.previous_output.index, 0);
			p2 = Buffer.concat([p2, BigIntBuffer.toBufferLE(BigInt(txIn.previous_output.value), 8)]);
			let p3 = Buffer.alloc(4);
			p3.writeUInt32LE(txIn.sequence, 0);
			const p4 = Buffer.from(txIn.public_key, 'hex');
			const p5 = Buffer.from(txIn.signature_script, 'hex');
			return Buffer.concat([res, p1, p2, p3, p4, p5]);
		}, Buffer.alloc(0));

		const payloadOut = this.hashOuts();

		payload = Buffer.concat([payload, payloadIn, payloadOut]);

		return Transaction.doubleSha256(payload);
	};

	private hashOuts = (): Buffer => {
		return this.tx_out.reduce((res, out) => Buffer.concat([res, Transaction.hashOut(out)]), Buffer.alloc(0));
	};

	private MsgForSign(hash: string, index: number): Buffer {
		let payload = Buffer.from(hash, 'hex');
		let buffer = Buffer.alloc(12);
		// buffer.writeInt8(index, 0);
		buffer.writeUInt32LE(index, 0);
		buffer.writeUInt32LE(this.version, 4);
		buffer.writeUInt32LE(this.lock_time, 8);
		payload = Buffer.concat([payload, buffer]);
		const outPayload = this.hashOuts();
		return Buffer.concat([payload, outPayload]);
	}

	private static nodeID(value: string): Buffer {
		if (value && value.trim() && value != '0000000000000000000000000000000000000000000000000000000000000000') {
			return Buffer.from(value, 'hex');
		}
		return Buffer.alloc(0);
	}

	private static doubleSha256(val: Buffer): string {
		const first = crypto.createHash('sha256').update(val).digest();
		const second = crypto.createHash('sha256').update(first).digest();
		return second.toString('hex');
	}

	private static hashOut = (val: TxOut<bigint>): Buffer => {
		let buffer = Buffer.alloc(4);
		buffer.writeInt8(val.index, 0);
		const value = BigIntBuffer.toBufferLE(BigInt(val.value), 8);
		buffer = Buffer.concat([buffer, value]);
		const pkScript = Buffer.from(val.pk_script, 'hex');
		const nodeID = Transaction.nodeID(val.node_id);
		return Buffer.concat([buffer, pkScript, nodeID])
	}
}
