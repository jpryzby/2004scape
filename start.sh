#!/bin/sh

if ! command -v git 2>&1 >/dev/null; then
	echo You must install Git to proceed
	exit 1
fi

if ! command -v node 2>&1 >/dev/null; then
	echo You must install Node to proceed
	exit 1
fi

if ! command -v bun 2>&1 >/dev/null; then
	npm i -g bun
fi

if ! command -v bun 2>&1 >/dev/null; then
	echo You must install Bun to proceed
	exit 1
fi

if ! command -v java 2>&1 >/dev/null; then
	echo You must install Java 17 or newer to proceed
	exit 1
fi

jver=$(java -version 2>&1 | head -1 | cut -d'"' -f2 | sed '/^1\./s///' | cut -d'.' -f1)
if [ $jver -lt 17 ]; then
	echo You must install Java 17 or newer to proceed
	echo And it must be your primary Java version!
	exit 1
fi

bun install
bun run start.ts
