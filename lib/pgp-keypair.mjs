import { openpgp } from "../deps.mjs";
import { Keypair, NotImplemented } from "./keypair.mjs";

class PgpKeypair extends Keypair {
  /**
   * 
   * @param {string} privateKey 
   * @param {string} publicKey 
   */
  constructor(privateKey, publicKey){
    super(privateKey, publicKey);
  }

  /**
   * 
   * @param {string} cleartext 
   */
  async encrypt(cleartext) {
    throw new NotImplemented("");
  }
  
  /**
   * 
   * @param {string} encryptedText
   */
  async decrypt(encryptedText) {
    throw new NotImplemented("");
  }
  
  /**
   * 
   * @param {string} cleartext 
   */
  async sign(cleartext) {
    throw new NotImplemented("");
  }
  
  /**
   * 
   * @param {string} cleartext 
   * @param {string} signature 
   */
  async verifySignature(cleartext, signature) {
    throw new NotImplemented("");
  }
}

export { PgpKeypair };
