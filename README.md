# Concordium Contracts Events Indexer

## What it is?

On Concordium Chain. The contracts can be coded to emit events. Which are the source for Off chain products to analyze whats happening on chain.
This project provides a reference implementation for Node JS in Typescript to listen to such events and index them in database to be queried account to the business logic.

## Components

-   [Server](./server) : Its the backend code for a web service to which the users can connect and query for aggregated events and `listener` which has the code for long running process to listen for contract events.
-   [Server Rust Bindings](./server-rust-bindings) : Rust code that compiles to wasm and provides helper methods to deserialize the events.

## Build

```
cd server-rust-bindings
yarn run build
```

## Execute

The following command will execute the listener and will continuously run and look for new events.

```bash
NODE_ENDPOINT=localhost
NODE_PORT=20002
DB_CONN_STRING="mongodb://root:example@localhost:27017/"
STARTING_BLOCK_HASH="f44a796e78dafe98d669e3aa9c5bc8770f224f5236adc7a3cd90fdecf1d4b361"

cd server
yarn run dev:listener
```

The following command will run the web backend and allows the user to query for aggregated events.

```bash
DB_CONN_STRING="mongodb://root:example@localhost:27017/"
cd server
yarn run dev:web
```