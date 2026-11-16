# rdf-encryption

Encryption-at-rest library for RDF. Datasets are:

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
    file["🔐 RDF/Turtle file (encrypted)"]
  end
  subgraph conversion["Conversion"]
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
    encrypted -- write --> file
    file -- read --> encrypted
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
    +encode(dataset)
    +decode(dataset)
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
  note for PgpKeypair "Created from armored PGP public/private keys generated beforehand."
```

## What an encrypted dataset looks like

This cleartext dataset in Turtle format:

```turtle
PREFIX : <http://site.example/>

:person1 :name 'Jon Ka' .
```

… looks like this when encrypted:

```turtle
PREFIX qrmm: <https://vocab.qworum.net/qrmm.ttl#>
PREFIX :     <http://site.example/>

<< :person1 :name '''-----BEGIN PGP MESSAGE-----

wV4DPdvZxaUmc4ESAQdAoJsU/M7HIiFI2qvNaDQza2g5j2PQFABvx4xsg4MR
kUswcO5x3KLDPIEFSdpevCgSllmPEIHZwXOUnN0wodQCdICUx2ZRfpxGGI1L
AnXmJFEd0jcB0NgQBkxeblsEhBC5hb7QBZFmzkFZrlOb5IRV6IJ2zYE0UEBu
5EtdjOI/79X/a5UjDsr6Izg2
=isQT
-----END PGP MESSAGE-----'''
 >> qrmm:pgpencrypted true .
```

The `qrmm:pgpencrypted` predicate is part of the [`qrmm` ontology](https://vocab.qworum.net/#qrmm).

## How to use

```javascript
import { Encrypter, PgpKeypair } from "./mod.mjs";
import {
  Store, Parser, DataFactory as t, Writer,
} from 'https://unpkg.com/n3@v2.13.12/browser/n3.esm.min.js';

await run();

async function run() {
  const
  keypair = await createKeypair(),
  codec   = new Encrypter({keys: {encryption: keypair}}),

  // in-memory dataset compliant with https://rdf.js.org/dataset-spec/#dataset-interface
  dataset = new Store();

  dataset.add(t.quad(
    t.namedNode('https://site.example/person/1'),
    t.namedNode('https://site.example/name'),
    t.literal('Jon Ka'),
  ));

  // in-memory dataset compliant with https://rdf.js.org/dataset-spec/#dataset-interface
  const encryptedDataset = await codec.encrypt(dataset);
}

async function createKeypair() {
  return (await PgpKeypair.create({
    publicKey: `-----BEGIN PGP PUBLIC KEY BLOCK-----

xjMEavjdExYJKwYBBAHaRw8BAQdA/WHmUoz8qqvgE7IOnKDbysMWMunHuoz+
fmAIQV+ieDjNG0pvbiBTbWl0aCA8am9uQGV4YW1wbGUuY29tPsLAEwQTFgoA
hQWCavjdEwMLCQcJEKpXMV8rD7LrRRQAAAAAABwAIHNhbHRAbm90YXRpb25z
Lm9wZW5wZ3Bqcy5vcmc6aYe0KF7hfkRvTKZkbnHa0GbGSxhrzt3et+0hFaX1
cwUVCggODAQWAAIBAhkBApsDAh4BFiEErzc3fL0fvXnu8X3fqlcxXysPsusA
ABYcAQDjprR3sDL1Ll7+SyeA2snocWz3O9WrUg3r6VCOClQpJAEA+bk5vEmk
0Iu8xMQQTf34XIa31WZ5sDViyYaH7AGRwQXOOARq+N0TEgorBgEEAZdVAQUB
AQdA794PzZJvJZ4dkesmHExjECRFtvklIXv/OdbJ6S5vIDoDAQgHwr4EGBYK
AHAFgmr43RMJEKpXMV8rD7LrRRQAAAAAABwAIHNhbHRAbm90YXRpb25zLm9w
ZW5wZ3Bqcy5vcmezNARvykRket4o6PAn5v1gUNacVBbFoEEU7rbgNWwjBgKb
DBYhBK83N3y9H7157vF936pXMV8rD7LrAABDeQEAjlan+tZQgbhkiZ3Qz1Jk
1PWwv4MAsJkaPLf4ZT6sSg0BAJi20z8LKs+E9NMlWXRU4Lu5qEHOlj6SLLfz
mPUqocME
=MihV
-----END PGP PUBLIC KEY BLOCK-----`,

    privateKey: `-----BEGIN PGP PRIVATE KEY BLOCK-----

xYYEavjdExYJKwYBBAHaRw8BAQdA/WHmUoz8qqvgE7IOnKDbysMWMunHuoz+
fmAIQV+ieDj+CQMId0Zy6PGAqQLgik6zsWht2TXD1ZUAji7lVs7jHreqXIO2
DGY6BGC0ONcXtuDlklklKfwLs5kCUxYBU4W2+zTYGXJRmCY+2vOXt26ZJWJ9
p80bSm9uIFNtaXRoIDxqb25AZXhhbXBsZS5jb20+wsATBBMWCgCFBYJq+N0T
AwsJBwkQqlcxXysPsutFFAAAAAAAHAAgc2FsdEBub3RhdGlvbnMub3BlbnBn
cGpzLm9yZzpph7QoXuF+RG9MpmRucdrQZsZLGGvO3d637SEVpfVzBRUKCA4M
BBYAAgECGQECmwMCHgEWIQSvNzd8vR+9ee7xfd+qVzFfKw+y6wAAFhwBAOOm
tHewMvUuXv5LJ4DayehxbPc71atSDevpUI4KVCkkAQD5uTm8SaTQi7zExBBN
/fhchrfVZnmwNWLJhofsAZHBBceLBGr43RMSCisGAQQBl1UBBQEBB0Dv3g/N
km8lnh2R6yYcTGMQJEW2+SUhe/851snpLm8gOgMBCAf+CQMIX8gbRW50D2Lg
pmlA4UOYfU1+64eUrizcboT7xc2PNXjCZaPmIY8CgpCY/sn8lzjAMnx4pca2
vEQa++Uyf5K3KiN17eRUYfY64WnVg3TnqcK+BBgWCgBwBYJq+N0TCRCqVzFf
Kw+y60UUAAAAAAAcACBzYWx0QG5vdGF0aW9ucy5vcGVucGdwanMub3JnszQE
b8pEZHreKOjwJ+b9YFDWnFQWxaBBFO624DVsIwYCmwwWIQSvNzd8vR+9ee7x
fd+qVzFfKw+y6wAAQ3kBAI5Wp/rWUIG4ZImd0M9SZNT1sL+DALCZGjy3+GU+
rEoNAQCYttM/CyrPhPTTJVl0VOC7uahBzpY+kiy385j1KqHDBA==
=i0rs
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

∎
