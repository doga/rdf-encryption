
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

}

export { 
  Keypair, 
};
