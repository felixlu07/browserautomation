# OPENAI Powered Browser Automation Puppeteer Extension Transport

![lint](https://github.com/gajananpp/puppeteer-extension-transport/actions/workflows/lint.yml/badge.svg) 
![build](https://github.com/gajananpp/puppeteer-extension-transport/actions/workflows/build.yml/badge.svg) 
[![npm version](https://badge.fury.io/js/puppeteer-extension-transport.svg)](https://www.npmjs.com/package/puppeteer-extension-transport)

This package allows you to use [**puppeteer-core**](https://github.com/puppeteer/puppeteer#puppeteer-core) in your browser extension's background page/service worker. It internally uses chrome.debugger extension api.

<br>

> **IMPORTANT NOTE** :- 
> For this to work, extension should have **debugger** permission specified in it's manifest json. Check [manifest.json](examples/extension-v2/manifest.json) in examples for reference.

<br>

## Installation

To install this package run:
```
git clone https://github.com/gajananpp/puppeteer-extension-transport.git
cd puppeteer-extension-transport
npm install
npm run compile
cd build/examples/extension-v3
```

<br>

## Usage

There are [v2 extension example](examples/extension-v2) and [v3 extension example](examples/extension-v3) in examples folder which you can load in your browser to test. 


Check puppeteer documentation [here](https://pptr.dev/).

<br>

## API

Check other available options/config for this package [here](docs/README.md).

<br>

## FAQ

**Q: With which browsers can this be used ?**
<br>
This can be used with chrome and chromium based browsers.

<br>

**Q: Does this require browser to be started with some CLI flags ?**
<br>
No. This package internally uses `chrome.debugger` api to communicate with chrome devtools protocol.

<br>

**Q: What do i need to specify in manifest.json of extension ?**
<br>
You will atleast need to specify below in manifest.json:
```json
"permissions": ["debugger"]
```
Check example [v2 manifest.json](examples/extension-v2/manifest.json) or [v3 manifest.json](examples/extension-v3/manifest.json) 

<br>

**Q: Who could use this ?**
<br>
If you are planning to do any of the following in extension:
1. do automation.
2. profiling, debugging, monitoring and handling lifecycle events of web pages.
3. any other thing you would like to use puppeteer for.
<br>

## Puppeteer IDE Extension
[Extension](https://github.com/gajananpp/puppeteer-ide-extension) made using this library.
