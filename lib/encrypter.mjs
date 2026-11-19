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


const
predicates = {
  pgpencrypted: t.namedNode(iri`https://vocab.qworum.net/qrmm.ttl#pgpencrypted`.toString()),
},
datatypes = {
  boolean: t.namedNode(iri`http://www.w3.org/2001/XMLSchema#boolean`.toString())
},
literals = {
  trueLiteral: t.literal('true', datatypes.boolean)
};


/**
 * Encrypter/decrypter for in-memory RDF datasets that conform to the rdf.js.org `Dataset` interface.
 * @see {@link https://rdf.js.org/dataset-spec/#dataset-interface | Dataset interface}
 */
class Encrypter {
  /**
   * Note: `/predicates` contains named nodes not IRIs.
   * @type { { keys: { encryption: PgpKeypair[], decryption: PgpKeypair[] }, predicates: { select: (Object[] | undefined), ignore: (Object[] | undefined) } } }
   * @ignore
   */
  #config;

  /**
   * Creates an encrypter/decrypter.
   * 
   * `config` defines how to encrypt/decrypt a dataset:
   * - `/keys` contains the keys used for encrypting/decrypting.
   * - `/predicates` is used for encrypting. RDF statements whose literals are to be modified are selected or ignored based on its predicate. By default all statements are selected.
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
          config.predicates[e].every(k => k instanceof IRI) &&
          config.predicates[e].length > 0 // IRI array must not be empty.
        )) throw new TypeError(`error in config.predicates.${e}`);
      }
    );

    // Convert IRIs to named nodes.
    ['select', 'ignore'].forEach(
      e => {
        if(isUndefined(config.predicates[e])) return;
        config.predicates[e] = config.predicates[e].map(
          anIri => t.namedNode(anIri.toString())
        );
      }
    );

    this.#config = config;
  }
  

  /**
   * Encrypts a dataset.
   * @param {Object} dataset 
   * @returns {Object} encrypted dataset
   * @throws {Error}
   * @async
   */
  async encrypt(dataset) {
    const
    datasetOut     = new Store(),
    encryptionKeys = (
      this.#config.keys.encryption.filter(k => k.publicKey).map(k => k.publicKey)
    ),

    /**
     * The list of literals that have been encrypted so far, and their encrypted counterparts.
     * @example
     * ```javascript
     * [{from: t.literal("Jon Ka"), to: t.literal("-----BEGIN PGP MESSAGE-----

wV4DSan8Z5TI1w0SAQdAbOU/M3yCFFuY4AyBDxZSGJiBq74l+3vh4832gQIo
nyMwRrwTGdu2ObkaTzE7FeTCnvAMSk8JRS2rGFJdg/ujd1PT1feWMJQTqU5v
LjsqWan60jcBE7TaKVeBJQM9jafi/wAqbMkcM8sHpo2wUALlmhDuheThdx71
r/hYgNtRlse33n4+9ulTPbhA
=bumj
-----END PGP MESSAGE-----")}]
     * ```
     * @type {{from: Object, to: Object}[]}
     * @ignore
     */
    literalEncryptions = [];

    if(isEmptyArray(encryptionKeys))throw new Error("not found: encryption keys");

    for (const statementIn of dataset) {
      const statementOut = (
        await this.#encryptTriple(statementIn, statementIn.graph, literalEncryptions, encryptionKeys)
      );
      // console.debug(``,statementOut);
      datasetOut.add(statementOut);
    }

    return datasetOut;
  }


  /**
   * 
   * @param {Object} triple a quad
   * @param {Object} graph 
   * @param {{from: Object, to: Object}[]} literalEncryptions  list of literals that have been encrypted so far, and their encrypted counterparts
   * @param {Object[]} encryptionKeys 
   * @returns 
   * @ignore
   */
  async #encryptTriple(triple, graph, literalEncryptions, encryptionKeys) {
    const {predicate, object} = triple;
    let {subject} = triple;

    if (isTriple(subject)) {
      subject = await this.#encryptTriple(subject, graph, literalEncryptions, encryptionKeys);
    }

    // statements that don't contain literals pass through
    if (!isLiteral(object)) {
      return t.quad(subject, predicate, object, graph);
    }

    // ignore literal for encryption?
    const 
    ignoreQuadForEncryption = (
      this.#config.predicates.ignore?.find(ignoredPredicate => ignoredPredicate.equals(predicate))
    );
    if (ignoreQuadForEncryption) {
      return t.quad(subject, predicate, object, graph);
    }

    // don't select literal for encryption?
    const dontSelectQuadForEncryption = (
      this.#config.predicates.select &&
      !this.#config.predicates.select.find(selectedPredicate => selectedPredicate.equals(predicate))
    );
    if (dontSelectQuadForEncryption) { 
      return t.quad(subject, predicate, object, graph);
    }

    // encrypt literal
    let encryptedLiteral = literalEncryptions.find(e => e.from.equals(object))?.to;
    if (!encryptedLiteral) {
      // console.debug(`encryptedLiteral not found`);
      const 
      encryptedValue = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: object.value }),
        encryptionKeys
      });

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

      literalEncryptions.push({from: object, to: encryptedLiteral});
    } else {
      // console.debug(`encryptedLiteral found`);
    }

    return (
      t.quad(
        t.quad(subject, predicate, encryptedLiteral, graph),
        predicates.pgpencrypted,
        t.literal('true', datatypes.boolean),
        graph
      )
    );
  }


  /**
   * Decrypts a dataset.
   * @param {Object} dataset
   * @returns {Object} decrypted dataset
   * @throws {Error}
   * @async
   */
  async decrypt(dataset) {
    const
    datasetOut     = new Store(),
    decryptionKeys = (
      this.#config.keys.decryption.filter(k => k.privateKey).map(k => k.privateKey)
    ),

    /**
     * The list of literals that have been decrypted so far, and their decrypted counterparts.
     * @example
     * ```javascript
     * [{from: t.literal("-----BEGIN PGP MESSAGE-----

wV4DSan8Z5TI1w0SAQdAbOU/M3yCFFuY4AyBDxZSGJiBq74l+3vh4832gQIo
nyMwRrwTGdu2ObkaTzE7FeTCnvAMSk8JRS2rGFJdg/ujd1PT1feWMJQTqU5v
LjsqWan60jcBE7TaKVeBJQM9jafi/wAqbMkcM8sHpo2wUALlmhDuheThdx71
r/hYgNtRlse33n4+9ulTPbhA
=bumj
-----END PGP MESSAGE-----"), to: t.literal("Jon Ka")}]
     * ```
     * @type {{from: Object, to: Object}[]}
     * @ignore
     */
    literalDecryptions = [];

    if(isEmptyArray(decryptionKeys))throw new Error("not found: decryption keys");

    for (const statementIn of dataset) {
      const statementOut = (
        await this.#decryptTriple(statementIn, statementIn.graph, literalDecryptions, decryptionKeys)
      );
      // console.debug(`decrypt statementOut`,statementOut);
      datasetOut.add(statementOut);
    }

    return datasetOut;
  }


  /**
   * 
   * @param {Object} triple a quad
   * @param {Object} graph 
   * @param {{from: Object, to: Object}[]} literalDecryptions list of literals that have been decrypted so far, and their decrypted counterparts
   * @param {Object[]} decryptionKeys 
   * @returns 
   * @ignore
   */
  async #decryptTriple(triple, graph, literalDecryptions, decryptionKeys){
    const {subject, predicate, object} = triple;

    if (
      predicate.equals(predicates.pgpencrypted) &&
      object.equals(literals.trueLiteral)
    ) {
      // console.debug(`must decrypt`);
      if(!(isTriple(subject) && isLiteral(subject.object)))throw new Error("error in encryption statement");

      let decryptedLiteral = literalDecryptions.find(e => e.from.equals(subject.object))?.to;
      if (!decryptedLiteral) {
        // console.debug(`decryptedLiteral not found`);
        const 
        message = await openpgp.readMessage({
            armoredMessage: subject.object.value
        }),
        { data: decryptedLiteralValue } = await openpgp.decrypt({message, decryptionKeys});

        decryptedLiteral = t.literal(
          decryptedLiteralValue, 
          (
            isEmptyString(subject.object.language)
            ? subject.object.datatype
            : (
              subject.object.direction
              ? {language: subject.object.language, direction: subject.object.direction}
              : subject.object.language
            )
          )
        );

        literalDecryptions.push({from: subject.object, to: decryptedLiteral});
      } else {
        // console.debug(`decryptedLiteral found`);
      }

      return (
        t.quad(
          (
            isTriple(subject.subject) 
            ? await this.#decryptTriple(subject.subject, graph, literalDecryptions, decryptionKeys) 
            : subject.subject
          ), 
          subject.predicate, decryptedLiteral, graph
        )
      );
    }

    return (
      t.quad(
        (
          isTriple(subject) 
          ? await this.#decryptTriple(subject, graph, literalDecryptions, decryptionKeys) 
          : subject
        ), 
        predicate, object, graph
      )
    );
  }

}

export {Encrypter};
