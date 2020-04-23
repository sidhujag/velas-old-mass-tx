import { VLXtoSatoshi } from "./lib/Crypto/utils";
import Client from "./lib/Client";
import Crypto from "./lib/Crypto";
// import * as bip39 from 'bip39';


async function send(privateKey: string, to_addr: string) {
    const client = new Client("mainnet");
    const vc = await Crypto.init();

    // let seed = bip39.mnemonicToSeedSync(mnemonic);
    // let seedHex = seed.toString('hex');

    const hdKeys = vc.keysGen.fromPrivateKey(privateKey);
    //const hdKeys = vc.keysGen.fromSeed(seedHex, 1);

    const wallet = hdKeys.toWallet();
    const wallet_addr = wallet.Base58Address;
    console.log("From wallet: " + wallet_addr);


    let unspents = [];
    try {
        unspents = await client.wallet.getUnspents(wallet_addr);
    } catch(e) {
        console.log("Error in getUnspents");
        unspents = [];
        // throw "Error in getUnspents";
    }

    if (unspents.length == 0 || unspents[0].value <= 0) {
        return 0;
    }

    let new_count = unspents.length > 200 ? 200 : unspents.length;
    console.log("Total UTXO: " + unspents.length  + " Total tx: " + new_count);

    let new_unspents = [];
    let money = 0;

    for (let i = 0; i < new_count; i++) {
        new_unspents.push(unspents[i]);
        money = money + Number(unspents[i].value);
    }

    let amount = money / 100000000 - 0.001;
    amount = +(amount.toFixed(8));
    
    try {
        let satoshiAmount = VLXtoSatoshi((amount));
        console.log("VLXtoSatoshi: " + satoshiAmount);
    } catch(e) {
        console.log("Error in VLXtoSatoshi");

        throw "Error in VLXtoSatoshi";
    }

    const txUnsigned = vc.tx.generate(
        new_unspents,
        VLXtoSatoshi(amount),
        hdKeys,
        wallet_addr,
        to_addr,
        BigInt(100000)
    );

    const tx = txUnsigned.sign();
    await client.wallet.send(tx)
        .then(() => {
            console.log("Send " + new_count + " tx");
            console.log("Amount: " + amount);
            setTimeout(function () {
                send(privateKey, to_addr);
            }, 3000);
        }).catch((err) => {
            console.log(err)
        });
}

const privateKey = process.argv[2] || "";
const addr = process.argv[3] || "";

if (privateKey === "" || addr === "") {
    console.log("PRIVATE_KEY or ADDRESS not found");
    console.log("Use: npm run send [MNEMPRIVATE_KEYONIC] [ADDRESS]")
} else {
    send(privateKey, addr)
}
