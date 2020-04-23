import * as crypto from "crypto";
const bytesInSalt = 128;
const iterations = 10000;
const algorithm = 'aes-256-cbc';
export default class {
    constructor(password) {
        this.encrypt = (data, salt = null) => {
            let saltLocal = salt;
            if (saltLocal == null) {
                saltLocal = crypto.randomBytes(bytesInSalt);
            }
            const cipher = this.createCipher(saltLocal);
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const saltString = saltLocal.toString('hex');
            return saltString + encrypted;
        };
        this.createCipher = (salt) => {
            return this.createCryptoFunc(salt, crypto.createCipheriv);
        };
        this.createDecipher = (salt) => {
            return this.createCryptoFunc(salt, crypto.createDecipheriv);
        };
        this.createCryptoFunc = (salt, func) => {
            const { key, iv } = this.hash(salt);
            const cf = func(algorithm, key, iv);
            // @ts-ignore
            cf.setAutoPadding(true);
            return cf;
        };
        this.password = password;
    }
    decrypt(data) {
        const salt = data.substring(0, bytesInSalt * 2);
        const encryptedData = data.substring(bytesInSalt * 2);
        const decipher = this.createDecipher(Buffer.from(salt, 'hex'));
        let receivedPlaintext = decipher.update(encryptedData, 'hex', 'utf8');
        receivedPlaintext += decipher.final().toString();
        return receivedPlaintext;
    }
    ;
    hash(salt) {
        const iv = crypto.pbkdf2Sync(this.password, salt, iterations, 16, 'sha512');
        const key = crypto.pbkdf2Sync(this.password, salt, iterations, 32, 'sha512');
        return { key, iv };
    }
}
//# sourceMappingURL=Encrypting.js.map