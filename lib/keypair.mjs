class NotImplemented extends Error {
  constructor(message){
    super(message);
  }
  
}

class Keypair {
  /**
   * @type {*} 
   * @ignore
   */
  #publicKey;

  /**
   * @type {*} 
   * @ignore
   */
  #privateKey;

  /**
   * 
   * @param {*} privateKey 
   * @param {*} publicKey 
   */
  constructor(privateKey, publicKey){
    this.#privateKey = privateKey;
    this.#publicKey  = publicKey;
  }

  /** @returns {*} */
  get privateKey(){return this.#privateKey;}

  /** @returns {*} */
  get publicKey(){return this.#publicKey;}

  /**
   * 
   * @param {string} cleartext 
   * @returns {string}
   * @async
   */
  async encrypt(cleartext) {
    throw new NotImplemented("");
  }
  
  /**
   * 
   * @param {string} encryptedText
   * @returns {string}
   * @async
   */
  async decrypt(encryptedText) {
    throw new NotImplemented("");
  }
  
  /**
   * 
   * @param {string} cleartext 
   * @returns {string}
   * @async
   */
  async sign(cleartext) {
    throw new NotImplemented("");
  }
  
  /**
   * 
   * @param {string} cleartext 
   * @param {string} signature 
   * @async
   */
  async verifySignature(cleartext, signature) {
    throw new NotImplemented("");
  }
  
}

export { Keypair, NotImplemented };
