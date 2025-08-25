#!/bin/bash

echo "Installing Rustup..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

echo "Installing wasm-pack..."
curl https://drager.github.io/wasm-pack/installer/init.sh -sSf | sh -s -- -y

echo "Building carp-wasm..."
./build-carp.sh