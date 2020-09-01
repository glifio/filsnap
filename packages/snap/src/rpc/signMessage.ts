import {Message, SignedMessage, transactionSign, transactionSignRaw} from "@zondax/filecoin-signing-tools/js";
import {Wallet} from "../interfaces";
import {getKeyPair} from "../filecoin/account";
import {showConfirmationDialog} from "../util/confirmation";
import {LotusRpcApi} from "../filecoin/types";
import {MessageRequest} from "@nodefactory/filsnap-types";

export async function signMessage(
    wallet: Wallet, api: LotusRpcApi, messageRequest: MessageRequest
): Promise<SignedMessage> {
    const keypair = await getKeyPair(wallet);
    // extract gas params
    const gl = messageRequest.gaslimit && messageRequest.gaslimit !== 0 ? messageRequest.gaslimit : 0;
    const gp = messageRequest.gaspremium && messageRequest.gaspremium !== "0" ? messageRequest.gaspremium : "0";
    const gfc = messageRequest.gasfeecap && messageRequest.gasfeecap !== "0" ? messageRequest.gasfeecap : "0";
    // create message object
    let message: Message = {
      to: messageRequest.to,
      value: messageRequest.value,
      gaslimit: gl,
      gaspremium: gp,
      gasfeecap: gfc,
      from: keypair.address,
      method: 0, // code for basic transaction
      nonce: Number(await api.mpoolGetNonce(keypair.address))
    };
  // estimate gas usage if gas params not provided
    if (messageRequest.gaslimit === 0 && messageRequest.gasfeecap === "0" && messageRequest.gaspremium === "0") {
        message.gaslimit = await api.gasEstimateGasLimit(message, null);
        const messageEstimate = await api.gasEstimateMessageGas(message, {MaxFee: "0"}, null);
        message.gaspremium = messageEstimate.GasPremium;
        message.gasfeecap = messageEstimate.GasFeeCap;
        console.log("GAS CALCULATED");
    } else {
      console.log("GAS PROVIDED");
    }
    // show confirmation
    const confirmation = await showConfirmationDialog(
        wallet,
        `Do you want to sign message\n\n` +
        `from: ${message.from}\n` +
        `to: ${message.to}\n` +
        `value:${message.value}\n` +
        `gas limit:${message.gaslimit}\n` +
        `gas fee cap:${message.gasfeecap}\n` +
        `gas premium: ${message.gaspremium}\n` +
        `with account ${keypair.address}?`
    );
    if (confirmation) {
        return transactionSign(message, keypair.privateKey);
    }
    return null;
}

export async function signMessageRaw(wallet: Wallet, rawMessage: string): Promise<string> {
    const keypair = await getKeyPair(wallet);
    const confirmation = await showConfirmationDialog(
        wallet,
        `Do you want to sign message\n\n` +
        `${rawMessage}\n\n` +
        `with account ${keypair.address}?`
    );
    if (confirmation) {
        return transactionSignRaw(rawMessage, keypair.privateKey).toString("hex");
    }
    return null;
}