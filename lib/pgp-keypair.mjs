import { openpgp } from "../deps.mjs";
import { Keypair } from "./keypair.mjs";


class PgpKeypair extends Keypair {
  /**
   * 
   * @param {(Object | null)} privateKey 
   * @param {(Object | null)} publicKey 
   * @ignore
   */
  constructor(privateKey, publicKey){
    super(privateKey, publicKey);
  }

  /**
   * If `armoredKeys` is `undefined`, then a new keypair is generated. Otherwise, at least a private or public PGP key is required.
   * @param {{privateKey: (string | undefined), publicKey: (string | undefined)}} armoredKeys 
   * @throws {TypeError}
   */
  static async create(armoredKeys){
    try {
      const
      privateKey = (
        armoredKeys.privateKey === undefined 
        ? null 
        : await openpgp.readPrivateKey({ armoredKey: armoredKeys.privateKey })
        // await openpgp.decryptKey({ // DECRYPT ?????
        //   privateKey: await openpgp.readPrivateKey({ armoredKey: armoredKeys.privateKey })
        // })
      ),
      publicKey = (
        armoredKeys.publicKey === undefined 
        ? null
        : await openpgp.readKey({ armoredKey: armoredKeys.publicKey })
      );

      if(!privateKey && !publicKey)throw Error('no private key and no public key');

      return new PgpKeypair(privateKey, publicKey);
    } catch (error) {
      throw new TypeError(`${error}`);
    }
  }

}

export { PgpKeypair };
