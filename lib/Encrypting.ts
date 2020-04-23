import * as crypto from "crypto";
import { BinaryLike, Cipher, CipherKey, Decipher } from "crypto";

const bytesInSalt = 128;
const iterations = 10000;
const algorithm = 'aes-256-cbc';

interface Hash {
	key: Buffer,
	iv: BinaryLike
}

export default class {

	private readonly password: string;

	constructor(password: string){
		this.password = password;
	}

	public encrypt = (data: string, salt: Buffer = null): string => {
		let saltLocal = salt;
		if (saltLocal == null) {
			saltLocal = crypto.randomBytes(bytesInSalt);
		}
		const cipher = this.createCipher(saltLocal);
		let encrypted = cipher.update(data, 'utf8', 'hex');
		encrypted += cipher.final('hex');
		const saltString = saltLocal.toString('hex');
		return saltString+encrypted;
	};

	public decrypt(data: string): string {
		const salt = data.substring(0, bytesInSalt*2);
		const encryptedData = data.substring(bytesInSalt*2);
		const decipher = this.createDecipher(Buffer.from(salt, 'hex'));
		let receivedPlaintext = decipher.update(encryptedData, 'hex', 'utf8');
		receivedPlaintext += decipher.final().toString();
		return receivedPlaintext;
	};

	private createCipher = (salt: Buffer): Cipher => {
		return this.createCryptoFunc<Cipher>(salt, crypto.createCipheriv);
	};

	private createDecipher = (salt: Buffer): Decipher => {
		return this.createCryptoFunc<Decipher>(salt, crypto.createDecipheriv);
	};

	private createCryptoFunc = <T = Cipher | Decipher>(salt: Buffer, func: (a, k, i) =>T): T => {
		const { key, iv } = this.hash(salt);
		const cf = func(algorithm, key, iv);
		// @ts-ignore
		cf.setAutoPadding(true);
		return cf;
	};

	private hash(salt: BinaryLike): Hash {
		const iv = crypto.pbkdf2Sync(this.password, salt, iterations, 16, 'sha512');
		const key = crypto.pbkdf2Sync(this.password, salt, iterations, 32, 'sha512');
		return { key, iv };
	}

}
