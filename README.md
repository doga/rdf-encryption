# rdf-encryption

Encryption-at-rest for RDF. Datasets are:

1. encrypted in-memory before storing them in RDF stores or serialising them into files, and
1. decrypted in-memory before use.

Note that only literals are encrypted, and it is possible to encrypt only some literals. Indeed, it may be preferable to keep some literals in cleartext form in order to preserve the textual matching capabilities of SPARQL engines.

## Encryption-at-rest and consumption-in-cleartext

```mermaid
---
title: Encryption-at-rest and consumption-in-cleartext
---
flowchart LR
  subgraph storage["Storage"]
    store["🔐 RDF store (encrypted)"]
    trig["🔐 TriG file (encrypted)"]
  end
  subgraph conversion["Encryption & decryption "]
    cleartext["In-memory dataset (cleartext)"]
    encrypted["🔐 In-memory dataset (encrypted)"]
  end
    prosumer["🧑‍💻 Data producer/consumer"]
    cleartext -- encrypt --> encrypted
    encrypted -- decrypt --> cleartext
    prosumer -- write --> cleartext
    cleartext -- read --> prosumer
    encrypted -- write --> store
    store -- read --> encrypted
    encrypted -- write --> trig
    trig -- read --> encrypted
```

## Classes provided by this library

```mermaid
---
title: Classes provided by this library
---
classDiagram
  direction LR
  class Encrypter {
    -config
    +encrypt(dataset)
    +decrypt(dataset)
  }
  class PgpKeypair {
    $create(armoredKeys)
  }
  class Keypair {
    +publicKey
    +privateKey
  }
  PgpKeypair --|> Keypair: extends
  Encrypter --> PgpKeypair : imports
  note for Encrypter "Converts between encrypted and cleartext datasets."
  note for PgpKeypair "Created from existing armored PGP public/private keys."
```

## What an encrypted dataset looks like

This cleartext dataset in Turtle (and TriG) format:

```turtle
PREFIX : <http://site.example/>

:person1 :name 'Jon Ka' .
```

… looks like this when encrypted:

```turtle
PREFIX qrmm: <https://vocab.qworum.net/qrmm.ttl#>
PREFIX :     <http://site.example/>

<< :person1 :name '''-----BEGIN PGP MESSAGE-----

wV4DSan8Z5TI1w0SAQdAFvEFTO3aV4OkoxbYoSmtv+4sI9zehkd/Wc6/NNfn
mWowKZJLQYHSQxXd5GIGnCR6BbpyrKNOkaWcMq8MNP8HCZqPoJF22Zg3Fcpo
8tTKbNSn0jcBwNFpTs7TR+wvDjLvgzQFrLHgJTaY+c/38h7Fyt+ksTPzAni0
yvXZ1CVZvK5Wv7TQpZTLBysn
=N0UZ
-----END PGP MESSAGE-----'''
 >> qrmm:pgpencrypted true .
```

The `qrmm:pgpencrypted` predicate is part of the [`qrmm` ontology](https://vocab.qworum.net/#qrmm).

_Note: TriG is a superset of Turtle. TriG files can store any RDF dataset, whereas in Turtle files the statements cannot have a graph term. This makes Turtle unsuitable as a general-purpose serialisation format for RDF datasets._

## How to use

```javascript
import { Encrypter, PgpKeypair } from "./mod.mjs";
import {
  Store, Parser, DataFactory as t, Writer,
} from 'https://unpkg.com/n3@v2.13.12/browser/n3.esm.min.js';

await run();

async function run() {
  const
  keypair   = await createKeypair(),
  encrypter = new Encrypter({keys: {encryption: [keypair]}}),

  // in-memory dataset compliant with https://rdf.js.org/dataset-spec/#dataset-interface
  dataset = new Store();

  dataset.add(t.quad(
    t.namedNode('https://site.example/person/1'),
    t.namedNode('https://site.example/name'),
    t.literal('Jon Ka'),
  ));

  // in-memory dataset compliant with https://rdf.js.org/dataset-spec/#dataset-interface
  const encryptedDataset = await encrypter.encrypt(dataset);
}

async function createKeypair() {
  return (await PgpKeypair.create({
    publicKey: `-----BEGIN PGP PUBLIC KEY BLOCK-----

xjMEavv2wBYJKwYBBAHaRw8BAQdA80xKW/kssD8Lr+wjXrML4tBMWqPZN9CL
jyikEE/nkRTNG0pvbiBTbWl0aCA8am9uQGV4YW1wbGUuY29tPsLAEwQTFgoA
hQWCavv2wAMLCQcJEEPZUXMZhjlFRRQAAAAAABwAIHNhbHRAbm90YXRpb25z
Lm9wZW5wZ3Bqcy5vcmdud6VVFuYC2f58ypRjNYbKJ2Fqh5Wsr/Agir5iUDrc
cgUVCggODAQWAAIBAhkBApsDAh4BFiEE824sqUPAN/f1FwH7Q9lRcxmGOUUA
AE/jAQCwYcEFK+eKXCqnPTcE7wMNknjcoblAcbU2YyWouf/jggD+Lrcw6jy1
fsE/0TKQhql29km+EYwTYzr1BCZf/f56PwHOOARq+/bAEgorBgEEAZdVAQUB
AQdAhg2C/OXuurVcak6ENtUv7RjmimoCqy3eej1O3GxRzj8DAQgHwr4EGBYK
AHAFgmr79sAJEEPZUXMZhjlFRRQAAAAAABwAIHNhbHRAbm90YXRpb25zLm9w
ZW5wZ3Bqcy5vcmcodDYGGeniloyzEVtT1h6Ae9P373Tvgc2SJfQrMBD35gKb
DBYhBPNuLKlDwDf39RcB+0PZUXMZhjlFAACwzQEA1+hZat8Xq9F7nXgSniXn
7S65m9fhdNGI4qHLz00puo0BAMZ36aIvVASk2MIOH+RBdrDvcMTdazPaQBUs
lsFK7JQF
=brsg
-----END PGP PUBLIC KEY BLOCK-----`,

    privateKey: `-----BEGIN PGP PRIVATE KEY BLOCK-----

xVgEavv2wBYJKwYBBAHaRw8BAQdA80xKW/kssD8Lr+wjXrML4tBMWqPZN9CL
jyikEE/nkRQAAP40zJvRm65CSo69fb+6w6kFwFB+ah0W0R0kEDJp2CXsQhAE
zRtKb24gU21pdGggPGpvbkBleGFtcGxlLmNvbT7CwBMEExYKAIUFgmr79sAD
CwkHCRBD2VFzGYY5RUUUAAAAAAAcACBzYWx0QG5vdGF0aW9ucy5vcGVucGdw
anMub3JnbnelVRbmAtn+fMqUYzWGyidhaoeVrK/wIIq+YlA63HIFFQoIDgwE
FgACAQIZAQKbAwIeARYhBPNuLKlDwDf39RcB+0PZUXMZhjlFAABP4wEAsGHB
BSvnilwqpz03BO8DDZJ43KG5QHG1NmMlqLn/44IA/i63MOo8tX7BP9EykIap
dvZJvhGME2M69QQmX/3+ej8Bx10Eavv2wBIKKwYBBAGXVQEFAQEHQIYNgvzl
7rq1XGpOhDbVL+0Y5opqAqst3no9TtxsUc4/AwEIBwAA/3Tm2yvQOS10aubP
ESudFJxxO09IZh58fYJ7S99AfOJ4D67CvgQYFgoAcAWCavv2wAkQQ9lRcxmG
OUVFFAAAAAAAHAAgc2FsdEBub3RhdGlvbnMub3BlbnBncGpzLm9yZyh0NgYZ
6eKWjLMRW1PWHoB70/fvdO+BzZIl9CswEPfmApsMFiEE824sqUPAN/f1FwH7
Q9lRcxmGOUUAALDNAQDX6Flq3xer0XudeBKeJeftLrmb1+F00YjiocvPTSm6
jQEAxnfpoi9UBKTYwg4f5EF2sO9wxN1rM9pAFSyWwUrslAU=
=/mU1
-----END PGP PRIVATE KEY BLOCK-----`
  }));
}
```

## Other libraries this library depends on

```mermaid
---
title: Other libraries this library depends on
---
flowchart TD
  rdf-encryption
  openpgp["OpenPGP"]:::external
  n3["N3.js"]:::external
  IRI
  language
  js-utils

  %% ═══ Edges ═══
  rdf-encryption -- import --> language
  rdf-encryption -- import --> IRI
  rdf-encryption -- import --> js-utils
  rdf-encryption -- import --> n3
  rdf-encryption -- import --> openpgp

  %% ═══ Click targets ═══
  click rdf-encryption "https://github.com/doga/rdf-encryption"
  click openpgp "https://github.com/openpgpjs/openpgpjs"
  click n3 "https://github.com/rdfjs/N3.js"
  click IRI "https://github.com/doga/IRI"
  click language "https://github.com/doga/language"
  click js-utils "https://github.com/doga/js-utils"

  %% ═══ Classes ═══
  classDef external fill:#1e3a8a,stroke:#1e40af,stroke-width:2px,color:#dbeafe,rx:6,ry:6

  %% ═══ Styles ═══
  %%style javascript fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F,rx:6,ry:6
  %%style browser fill:#EDE9FE,stroke:#7C3AED,stroke-width:2px,color:#4C1D95,rx:6,ry:6
  %%style deno fill:#ECFEFF,stroke:#0891B2,stroke-width:2px,color:#164E63,rx:6,ry:6



  %%linkStyle 3 stroke:#ff3,stroke-width:4px,color:red;
```

## Target runtimes

This library can run on all JavaScript runtimes, both in-browser and off-browser.

∎
