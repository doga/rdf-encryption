import { PgpKeypair } from "./pgp-keypair.mjs";
import {
  isTerm, isNamedNode, isBlankNode, isLiteral, isDefaultGraph, isQuad, isTriple,
} from "./utils/rdf-utils.mjs";
import { 
  IRI, iri,
  Store, DataFactory as t,
  isNull, isUndefined, isArray, isPlainObject, isString, isEmptyString, isEmptyArray, isBoolean,
  openpgp,
} from "../deps.mjs";


/**
 * Encoder/decoder for in-memory RDF datasets that conform to the rdf.js.org `Dataset` interface.
 * - Encoding consists in encrypting literals.
 * - Decoding consists in decrypting literals.
 * 
 * @see {@link https://rdf.js.org/dataset-spec/#dataset-interface | Dataset interface}
 */
class Encrypter {
  /**
   * @type { { keys: { encryption: PgpKeypair[], decryption: PgpKeypair[] }, predicates: { select: (IRI[] | undefined), ignore: (IRI[] | undefined) } } }
   * @ignore
   */
  #config;

  /**
   * Creates an encoder/decoder.
   * 
   * `config` defines how to encode/decode a dataset:
   * - `/keys` contains the keys used for encoding or decoding.
   * - `/predicates` is used for encoding. RDF statements whose literals are to be modified are selected or ignored based on its predicate. By default all statements are selected.
   * - any `/predicates/select` or `/predicates/ignore` that is not undefined must be a non-empty IRI array.
   * 
   * @param { {keys: { encryption: (PgpKeypair[] | PgpKeypair | undefined), decryption: (PgpKeypair[] | PgpKeypair | undefined)}, predicates: ({select: (IRI[] | IRI | undefined), ignore: (IRI[] | IRI | undefined)} | undefined) } } config
   * @throws {TypeError}
   */
  constructor(config){
    // check config, and transform config to its canonical format
    if(!isPlainObject(config))throw new TypeError("not a config");
    // config.keys
    if (!isPlainObject(config.keys)) throw new TypeError("error in config.keys");
    ['encryption', 'decryption'].forEach( // check config.keys fields
      e => {
        if(isUndefined(config.keys[e]))config.keys[e] = [];
        if(config.keys[e] instanceof PgpKeypair) config.keys[e] = [config.keys[e]];
        if (!(
          isArray(config.keys[e]) &&
          config.keys[e].every(k => k instanceof PgpKeypair)
        )) throw new TypeError(`error in config.keys.${e}`);
      }
    );
    // config.predicates
    if(isUndefined(config.predicates)) config.predicates = {};
    if (!isPlainObject(config.predicates)) throw new TypeError("error in config.predicates");
    ['select', 'ignore'].forEach( // check config.predicates fields
      e => {
        if(isUndefined(config.predicates[e])) return; // config.predicates[e] = [];
        if(config.predicates[e] instanceof IRI) config.predicates[e] = [config.predicates[e]];
        if (!(
          isArray(config.predicates[e]) &&
          config.predicates[e].length > 0 &&
          config.predicates[e].every(k => k instanceof IRI)
        )) throw new TypeError(`error in config.predicates.${e}`);
      }
    );

    this.#config = config;
  }
  
  /**
   * Encodes an RDF dataset.
   * @param {Object} dataset 
   * @returns {Object} encoded dataset
   * @throws {Error}
   * @async
   */
  async encrypt(dataset) {
    const
    encryptionKeys = (
      this.#config.keys.encryption
      .filter(k => k.publicKey)
      .map(k => k.publicKey)
    ),
    datasetOut = new Store();

    if(isEmptyArray(encryptionKeys))throw new Error("not found: encryption keys");

    for (const quad of dataset) {
      const {subject, predicate, object, graph} = quad;

      // copy statements that don't contain literals
      if (!isLiteral(object)) {
        datasetOut.add(quad); continue;
      }

      // ignore literal for encryption?
      if (this.#config.predicates.ignore?.find(anIri => anIri.equals(iri`${predicate.value}`))) {
        // ignore
        datasetOut.add(quad); continue;
      }

      // select literal for encryption?
      if (
        this.#config.predicates.select &&
        !this.#config.predicates.select.find(anIri => anIri.equals(iri`${predicate.value}`))
      ) {
        // don't select
        datasetOut.add(quad); continue;
      }

      const 
      encryptedValue = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: object.value }),
        encryptionKeys
      }),
      encryptedLiteral = t.literal(
        encryptedValue, 
        (
          isEmptyString(object.language)
          ? object.datatype
          : (
            object.direction
            ? {language: object.language, direction: object.direction}
            : object.language
          )
        )
      );

      datasetOut.add(
        t.quad(
          t.quad(subject, predicate, encryptedLiteral),
          t.namedNode(iri`https://vocab.qworum.net/qrmm.ttl#pgpencrypted`.toString()),
          t.literal('true', t.namedNode(iri`http://www.w3.org/2001/XMLSchema#boolean`.toString())),
          graph
        )
      )
    }

    return datasetOut;
  }
  
  /**
   * Decodes an RDF dataset.
   * @param {Object} dataset
   * @returns {Object} decoded dataset
   * @throws {Error}
   * @async
   */
  async decrypt(dataset) {
    
  }
}

export {Encrypter};
