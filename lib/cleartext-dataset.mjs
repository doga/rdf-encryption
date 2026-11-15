import { PgpKeypair } from "./pgp-keypair.mjs";
import {
  isTerm, isNamedNode, isBlankNode, isLiteral, isDefaultGraph, isQuad, isTriple,
} from "./utils/rdf-utils.mjs";
import { 
  IRI,
  Store, DataFactory as t,
  isNull, isUndefined, isArray, isPlainObject, isString, isEmptyString, isEmptyArray, isBoolean,
  openpgp,
} from "../deps.mjs";

/**
 * In-memory RDF dataset where the literals are in cleartext. When importing a dataset:
 * 
 * - encrypted literals are decrypted.
 * - signatures are verified and removed for signed literals.
 */
class CleartextDataset {
  /**
   * @type { {keys: { encryption: PgpKeypair[], decryption: PgpKeypair[], signing: PgpKeypair[], verification: PgpKeypair[]}, predicates: {select: IRI[], ignore: IRI[]} } }
   * @ignore
   */
  #config;

  /**
   * An in-memory RDF dataset. Literals are neither encrypted nor signed.
   * @type {Object}
   * @ignore
   * @see {@link https://rdf.js.org/dataset-spec/#dataset-interface | Dataset interface}
   */
  #value;

  /**
   * Creates an in-memory RDF dataset where the literals are in cleartext.
   * 
   * `config` defines how to import and export a dataset:
   * - `/keys` contains the keys used for imports and exports.
   * - `/predicates` is used for exports. RDF statements whose literals are to be modified are selected or ignored based on its predicate. By default all statements are selected.
   * 
   * @param { ({keys: ({ encryption: (PgpKeypair[] | PgpKeypair | undefined), decryption: (PgpKeypair[] | PgpKeypair | undefined), signing: (PgpKeypair[] | PgpKeypair | undefined), verification: (PgpKeypair[] | PgpKeypair | undefined)} | undefined), predicates: ({select: (IRI[] | IRI | undefined), ignore: (IRI[] | IRI | undefined)} | undefined) } | undefined) } config
   * @throws {TypeError}
   */
  constructor(config){
    // check config, and transform config to its canonical format
    if(isUndefined(config)) {
      config = {
        keys      : {encryption: [], decryption: [], signing: [], verification: []},
        predicates: {select: [], ignore: []}
      };
    }
    if(!isPlainObject(config))throw new TypeError("not a config");
    if(isUndefined(config.keys)) config.keys = {encryption: [], decryption: [], signing: [], verification: []};
    if (!isPlainObject(config.keys)) throw new TypeError("error in config.keys");
    ['encryption', 'decryption', 'signing', 'verification'].forEach( // check config.keys fields
      e => {
        if(isUndefined(config.keys[e]))config.keys[e] = [];
        if(config.keys[e] instanceof PgpKeypair) config.keys[e] = [config.keys[e]];
        if (!(
          isArray(config.keys[e]) &&
          config.keys[e].every(k => k instanceof PgpKeypair)
        )) throw new TypeError(`error in config.keys.${e}`);
      }
    );
    if(isUndefined(config.predicates)) config.predicates = {select: [], ignore: []};
    if (!isPlainObject(config.predicates)) throw new TypeError("error in config.predicates");
    ['select', 'ignore'].forEach( // check config.predicates fields
      e => {
        if(isUndefined(config.predicates[e]))config.predicates[e] = [];
        if(config.predicates[e] instanceof IRI) config.predicates[e] = [config.predicates[e]];
        if (!(
          isArray(config.predicates[e]) &&
          config.predicates[e].every(k => k instanceof IRI)
        )) throw new TypeError(`error in config.predicates.${e}`);
      }
    );

    this.#config = config;
    this.#value  = new Store();
  }

  /**
   * @returns {number} the number of statements in this dataset
   */
  get size(){return this.#value.size;}

  /**
   * Returns an in-memory copy of this dataset. The copy's literals may be encrypted and/or signed.
   * By default the returned dataset is neither signed nor encrypted.
   * @example exporting a dataset with signed literals.
   * ```javascript
   * const ds = cleartextDs.exportDataset({sign: true});
   * ```
   * @param {({encrypt: (boolean | undefined), sign: (boolean | undefined)} | undefined)} options 
   * @returns {Object} an object that conforms to the rdf.js.org `Dataset` interface.
   * @throws {TypeError}
   * @async
   * @see {@link https://rdf.js.org/dataset-spec/#dataset-interface | Dataset interface}
   */
  async exportDataset(options){
    // check options, and transform options to its canonical format
    if(isUndefined(options)) options = {encrypt: false, sign: false};
    if(!isPlainObject(options))throw new TypeError("invalid options");
    if(isUndefined(options.encrypt)) options.encrypt = false;
    if(!isBoolean(options.encrypt))throw new TypeError("invalid options.encrypt");
    if(isUndefined(options.sign)) options.sign = false;
    if(!isBoolean(options.sign))throw new TypeError("invalid options.sign");

    const res = new Store();
    res.addAll(this.#value); // TODO: implement
    return res;
  }

  /**
   * Imports an in-memory RDF dataset. Any encrypted literal is decrypted before importing.
   * Any signed literal is verified before importing. 
   * @param {Object} dataset An in-memory RDF dataset to import.
   * @throws {TypeError}
   * @async
   * @see {@link https://rdf.js.org/dataset-spec/#dataset-interface | Dataset interface}
   */
  async addAll(dataset){
    try {
      for (const quad of dataset) {
        let {subject, predicate, object, graph} = quad;
        if (isLiteral(object)) {
          const
          armoredMsgStartIndex = object.value.indexOf('-----BEGIN PGP MESSAGE-----'),
          armoredMsgEndIndex   = object.value.indexOf('-----END PGP MESSAGE-----'),
          possiblyArmoredMsg   = (armoredMsgStartIndex !== -1 && armoredMsgEndIndex !== -1 && armoredMsgStartIndex < armoredMsgEndIndex);

          if(possiblyArmoredMsg){
            // TODO object in cleartext
          }
        }
        this.#value.add(t.quad(subject, predicate, object, graph));
      }
    } catch (error) {
      throw new TypeError(`${error}`);
    }
  }

}

export { CleartextDataset };
