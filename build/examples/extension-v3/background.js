(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web_1 = __importDefault(require("puppeteer-core/lib/cjs/puppeteer/web"));
const lib_1 = require("../../lib");
const run = (tabId, loadingPort, dischargePort) => __awaiter(void 0, void 0, void 0, function* () {
    const extensionTransport = yield lib_1.ExtensionDebuggerTransport.create(tabId);
    const browser = yield web_1.default.connect({
        transport: extensionTransport,
        defaultViewport: null,
    });
    // use first page from pages instead of using browser.newPage()
    const [page] = yield browser.pages();
    // For example, filling in fields based on user input from the popup:
    yield page.click('div.css-164r41r button[type="button"]');
    // Wait for the modal to appear
    const modalSelector = '.MuiDialog-root';
    yield page.waitForSelector(modalSelector);
    // Type "Singapore" into the loading.port input field and select the first autocomplete option
    yield page.type('input[name="loading.port"]', loadingPort);
    const loadingPortAutocompleteSelector = '.MuiAutocomplete-option';
    yield page.waitForSelector(loadingPortAutocompleteSelector);
    const loadingPortAutocompleteOptions = yield page.$$(loadingPortAutocompleteSelector);
    yield loadingPortAutocompleteOptions[0].click();
    // Type "Bangkok" into the discharge.port input field and select the first autocomplete option
    yield page.type('input[name="discharge.port"]', dischargePort);
    const dischargePortAutocompleteSelector = '.MuiAutocomplete-option';
    yield page.waitForSelector(dischargePortAutocompleteSelector);
    const dischargePortAutocompleteOptions = yield page.$$(dischargePortAutocompleteSelector);
    yield dischargePortAutocompleteOptions[0].click();
    // Enter the date into the input field
    yield page.type('input[name="etd"]', '23/04/2023 00:00');
    // Click on the "Save" button
    yield page.click('button[data-testid="modalSave"]');
});
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "executePuppeteerScript") {
        run(request.tabId, request.loadingPort, request.dischargePort);
    }
});
// get the current time for context in the system message
let time = new Date().toLocaleString('en-US');
// create a system message
const systemMessage = "You are a helpful chat bot. Your answer should not be too long. current time: " + time;
// initialize the message array with a system message
let messageArray = [
    { role: "system", content: systemMessage }
];
// a event listener to listen for a message from the content script that says the user has openend the popup
chrome.runtime.onMessage.addListener(function (request) {
    // check if the request contains a message that the user has opened the popup
    if (request.openedPopup) {
        // reset the message array to remove the previous conversation
        messageArray = [
            { role: "system", content: systemMessage }
        ];
    }
});
chrome.action.onClicked.addListener((tab) => {
    // Store the current tab ID in the chrome.storage.local
    chrome.storage.local.set({ currentTabId: tab.id });
});
// listen for a request message from the content script
chrome.runtime.onMessage.addListener(function (request) {
    return __awaiter(this, void 0, void 0, function* () {
        if (request.input) {
            // let apiKey = await new Promise(resolve => chrome.storage.local.get(['apiKey'], result => resolve(result.apiKey)));
            let apiKey = "YOUR_API_KEY_HERE";
            // let apiModel = await new Promise(resolve => chrome.storage.local.get(['apiModel'], result => resolve(result.apiModel)));
            let apiModel = "gpt-3.5-turbo";
            // payload format to append to messageArray
            let uniqueMessage = "I want you to only reply with the output inside one unique code block, and nothing else. DO NOT write explanations. Extract shipment information from the user and provide the information in the following payload format: \n{\n  loading.port: {country/port from},\n  discharge.port: {country/port to}\n}\n\nQuery:";
            // Add the user's message and uniqueMessage to the message array
            messageArray.push({ role: "user", content: uniqueMessage + request.input });
            try {
                // send the request containing the messages to the OpenAI API
                let response = yield fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        "model": apiModel,
                        "messages": messageArray
                    })
                });
                // check if the API response is ok Else throw an error
                if (!response.ok) {
                    throw new Error(`Failed to fetch. Status code: ${response.status}`);
                }
                // get the data from the API response as json
                let data = yield response.json();
                // check if the API response contains an answer
                if (data && data.choices && data.choices.length > 0) {
                    // get the answer from the API response
                    let response = data.choices[0].message.content;
                    // send the answer back to the content script
                    chrome.runtime.sendMessage({ answer: response });
                    // Add the response from the assistant to the message array
                    messageArray.push({ role: "assistant", "content": response });
                }
            }
            catch (error) {
                // send error message back to the content script
                chrome.runtime.sendMessage({ answer: "No answer Received: Make sure the entered API-Key is correct." });
            }
        }
        // return true to indicate that the message has been handled
        return true;
    });
});

},{"../../lib":2,"puppeteer-core/lib/cjs/puppeteer/web":56}],2:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionDebuggerTransport = void 0;
/**
 * A puppeteer connection transport for extension.
 */
class ExtensionDebuggerTransport {
    constructor(target) {
        /**
         * If required, adjust this value to increase or decrese delay in ms between subsequent commands.
         * > Note :- decreasing it too much can give issues
         *
         * @default 0.04 * 1000
         */
        this.delay = 0.04 * 1000;
        this.target = target;
        this._sessionId = target.id;
        this.debugee = {
            tabId: target.tabId,
        };
        chrome.debugger.onEvent.addListener((source, method, params) => {
            const event = {
                method: method,
                params: params,
                sessionId: this._sessionId,
            };
            source.tabId === this.target.tabId ? this._emit(event) : null;
        });
        chrome.debugger.onDetach.addListener(source => {
            source.tabId === this.target.tabId ? this._closeTarget() : null;
        });
    }
    /**
     * Returns a puppeteer connection transport instance for extension.
     * @example
     * How to use it:
     * ```javascript
     * const extensionTransport = await ExtensionDebuggerTransport.create(tabId)
     * const browser = await puppeteer.connect({
     *  transport: extensionTransport,
     *  defaultViewport: null
     * })
     *
     * // use first page from pages instead of using browser.newPage()
     * const [page] = await browser.pages()
     * await page.goto('https://wikipedia.org')
     * ```
     *
     * @param tabId - The id of tab to target. You can get this using chrome.tabs api
     * @param functionSerializer - Optional function serializer. If not specified and
     * if extension's manifest.json contains `unsafe_eval` then defaults to `new Function()`
     * else defaults to `() => {}`
     * @returns - The instance of {@link ExtensionDebuggerTransport}
     *
     * @throws Error
     * If debugger permission not given to extension
     */
    static create(tabId, functionSerializer) {
        if (chrome.debugger) {
            const debugee = {
                tabId: tabId,
            };
            return new Promise((resolve, reject) => {
                chrome.debugger.attach(debugee, '1.3', () => __awaiter(this, void 0, void 0, function* () {
                    const error = chrome.runtime.lastError;
                    if (!error) {
                        const target = yield this._getTargetInfo(debugee);
                        const transport = new ExtensionDebuggerTransport(target);
                        transport._initialize(functionSerializer);
                        resolve(transport);
                    }
                    else {
                        reject(error);
                    }
                }));
            });
        }
        else {
            throw new Error('no debugger permission');
        }
    }
    /** @internal */
    send(message) {
        const command = JSON.parse(message);
        const targetCommands = [
            'Target.getBrowserContexts',
            'Target.setDiscoverTargets',
            'Target.attachToTarget',
            'Target.activateTarget',
            'Target.closeTarget',
        ];
        if (targetCommands.includes(command.method)) {
            this._handleTargetCommand(command);
        }
        else {
            chrome.debugger.sendCommand(this.debugee, command.method, command.params, result => this._handleCommandResponse(command, result));
        }
    }
    /** @internal */
    close() {
        chrome.debugger.detach(this.debugee, () => this._closeTarget());
    }
    static _getTargetInfo(debugee) {
        return new Promise((resolve, reject) => {
            chrome.debugger.getTargets(targets => {
                const target = targets
                    .filter(target => target.attached && target.tabId === debugee.tabId)
                    .map(target => {
                    return Object.assign(Object.assign({}, target), { targetId: target.id, canAccessOpener: false });
                });
                target[0] ? resolve(target[0]) : reject(new Error('target not found'));
            });
        });
    }
    _initialize(functionSerializer) {
        if (functionSerializer) {
            Function = functionSerializer;
        }
        else {
            try {
                new Function();
            }
            catch (e) {
                Function = function () {
                    return () => { };
                };
            }
        }
    }
    _handleCommandResponse(command, result) {
        const error = chrome.runtime.lastError;
        const response = Object.assign(Object.assign({}, command), { error: error, result: result });
        this._delaySend(response);
    }
    _handleTargetCommand(command) {
        const response = Object.assign(Object.assign({}, command), { error: undefined, result: {} });
        switch (command.method) {
            case 'Target.getBrowserContexts':
                response.result = {
                    browserContextIds: [],
                };
                break;
            case 'Target.setDiscoverTargets':
                response.result = null;
                this._emitTargetCreated();
                break;
            case 'Target.attachToTarget':
                response.result = {
                    sessionId: this._sessionId,
                };
                this._emitTargetAttached();
                break;
            case 'Target.activateTarget':
                response.result = null;
                break;
            case 'Target.closeTarget':
                response.result = {
                    success: true,
                };
                setTimeout(() => this.close(), this.delay);
                break;
        }
        this._delaySend(response);
    }
    _emitTargetCreated() {
        const event = {
            method: 'Target.targetCreated',
            params: {
                targetInfo: this.target,
            },
        };
        this._emit(event);
    }
    _emitTargetAttached() {
        const event = {
            method: 'Target.attachedToTarget',
            params: {
                targetInfo: this.target,
                sessionId: this._sessionId,
                waitingForDebugger: false,
            },
        };
        this._emit(event);
    }
    _emitTargetDetached() {
        const event = {
            method: 'Target.detachedFromTarget',
            params: {
                targetId: this.target.id,
                sessionId: this._sessionId,
            },
        };
        this._emit(event);
    }
    _closeTarget() {
        var _a;
        this._emitTargetDetached();
        (_a = this.onclose) === null || _a === void 0 ? void 0 : _a.call(null);
    }
    _emit(event) {
        var _a;
        (_a = this === null || this === void 0 ? void 0 : this.onmessage) === null || _a === void 0 ? void 0 : _a.call(null, JSON.stringify(event));
    }
    _delaySend(response) {
        setTimeout(() => {
            var _a;
            (_a = this === null || this === void 0 ? void 0 : this.onmessage) === null || _a === void 0 ? void 0 : _a.call(null, JSON.stringify(response));
        }, this.delay);
    }
}
exports.ExtensionDebuggerTransport = ExtensionDebuggerTransport;

},{}],3:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],4:[function(require,module,exports){

},{}],5:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"dup":4}],6:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":3,"buffer":6,"ieee754":8}],7:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}

},{}],8:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],9:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}

},{}],10:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var w = d * 7;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isFinite(val)) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'weeks':
    case 'week':
    case 'w':
      return n * w;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (msAbs >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (msAbs >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (msAbs >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return plural(ms, msAbs, d, 'day');
  }
  if (msAbs >= h) {
    return plural(ms, msAbs, h, 'hour');
  }
  if (msAbs >= m) {
    return plural(ms, msAbs, m, 'minute');
  }
  if (msAbs >= s) {
    return plural(ms, msAbs, s, 'second');
  }
  return ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, msAbs, n, name) {
  var isPlural = msAbs >= n * 1.5;
  return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
}

},{}],11:[function(require,module,exports){
(function (global){(function (){
"use strict";

// ref: https://github.com/tc39/proposal-global
var getGlobal = function () {
	// the only reliable means to get the global object is
	// `Function('return this')()`
	// However, this causes CSP violations in Chrome apps.
	if (typeof self !== 'undefined') { return self; }
	if (typeof window !== 'undefined') { return window; }
	if (typeof global !== 'undefined') { return global; }
	throw new Error('unable to locate global object');
}

var global = getGlobal();

module.exports = exports = global.fetch;

// Needed for TypeScript and Webpack.
if (global.fetch) {
	exports.default = global.fetch.bind(global);
}

exports.Headers = global.Headers;
exports.Request = global.Request;
exports.Response = global.Response;
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],12:[function(require,module,exports){
(function (process){(function (){
// 'path' module extracted from Node.js v8.11.1 (only the posix part)
// transplited with Babel

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

module.exports = posix;

}).call(this)}).call(this,require('_process'))
},{"_process":13}],13:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],14:[function(require,module,exports){
"use strict";
/**
 * Copyright 2018 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Accessibility = void 0;
/**
 * The Accessibility class provides methods for inspecting Chromium's
 * accessibility tree. The accessibility tree is used by assistive technology
 * such as {@link https://en.wikipedia.org/wiki/Screen_reader | screen readers} or
 * {@link https://en.wikipedia.org/wiki/Switch_access | switches}.
 *
 * @remarks
 *
 * Accessibility is a very platform-specific thing. On different platforms,
 * there are different screen readers that might have wildly different output.
 *
 * Blink - Chrome's rendering engine - has a concept of "accessibility tree",
 * which is then translated into different platform-specific APIs. Accessibility
 * namespace gives users access to the Blink Accessibility Tree.
 *
 * Most of the accessibility tree gets filtered out when converting from Blink
 * AX Tree to Platform-specific AX-Tree or by assistive technologies themselves.
 * By default, Puppeteer tries to approximate this filtering, exposing only
 * the "interesting" nodes of the tree.
 *
 * @public
 */
class Accessibility {
    /**
     * @internal
     */
    constructor(client) {
        this._client = client;
    }
    /**
     * Captures the current state of the accessibility tree.
     * The returned object represents the root accessible node of the page.
     *
     * @remarks
     *
     * **NOTE** The Chromium accessibility tree contains nodes that go unused on
     * most platforms and by most screen readers. Puppeteer will discard them as
     * well for an easier to process tree, unless `interestingOnly` is set to
     * `false`.
     *
     * @example
     * An example of dumping the entire accessibility tree:
     * ```js
     * const snapshot = await page.accessibility.snapshot();
     * console.log(snapshot);
     * ```
     *
     * @example
     * An example of logging the focused node's name:
     * ```js
     * const snapshot = await page.accessibility.snapshot();
     * const node = findFocusedNode(snapshot);
     * console.log(node && node.name);
     *
     * function findFocusedNode(node) {
     *   if (node.focused)
     *     return node;
     *   for (const child of node.children || []) {
     *     const foundNode = findFocusedNode(child);
     *     return foundNode;
     *   }
     *   return null;
     * }
     * ```
     *
     * @returns An AXNode object representing the snapshot.
     *
     */
    async snapshot(options = {}) {
        const { interestingOnly = true, root = null } = options;
        const { nodes } = await this._client.send('Accessibility.getFullAXTree');
        let backendNodeId = null;
        if (root) {
            const { node } = await this._client.send('DOM.describeNode', {
                objectId: root._remoteObject.objectId,
            });
            backendNodeId = node.backendNodeId;
        }
        const defaultRoot = AXNode.createTree(nodes);
        let needle = defaultRoot;
        if (backendNodeId) {
            needle = defaultRoot.find((node) => node.payload.backendDOMNodeId === backendNodeId);
            if (!needle)
                return null;
        }
        if (!interestingOnly)
            return this.serializeTree(needle)[0];
        const interestingNodes = new Set();
        this.collectInterestingNodes(interestingNodes, defaultRoot, false);
        if (!interestingNodes.has(needle))
            return null;
        return this.serializeTree(needle, interestingNodes)[0];
    }
    serializeTree(node, interestingNodes) {
        const children = [];
        for (const child of node.children)
            children.push(...this.serializeTree(child, interestingNodes));
        if (interestingNodes && !interestingNodes.has(node))
            return children;
        const serializedNode = node.serialize();
        if (children.length)
            serializedNode.children = children;
        return [serializedNode];
    }
    collectInterestingNodes(collection, node, insideControl) {
        if (node.isInteresting(insideControl))
            collection.add(node);
        if (node.isLeafNode())
            return;
        insideControl = insideControl || node.isControl();
        for (const child of node.children)
            this.collectInterestingNodes(collection, child, insideControl);
    }
}
exports.Accessibility = Accessibility;
class AXNode {
    constructor(payload) {
        this.children = [];
        this._richlyEditable = false;
        this._editable = false;
        this._focusable = false;
        this._hidden = false;
        this.payload = payload;
        this._name = this.payload.name ? this.payload.name.value : '';
        this._role = this.payload.role ? this.payload.role.value : 'Unknown';
        this._ignored = this.payload.ignored;
        for (const property of this.payload.properties || []) {
            if (property.name === 'editable') {
                this._richlyEditable = property.value.value === 'richtext';
                this._editable = true;
            }
            if (property.name === 'focusable')
                this._focusable = property.value.value;
            if (property.name === 'hidden')
                this._hidden = property.value.value;
        }
    }
    _isPlainTextField() {
        if (this._richlyEditable)
            return false;
        if (this._editable)
            return true;
        return this._role === 'textbox' || this._role === 'searchbox';
    }
    _isTextOnlyObject() {
        const role = this._role;
        return role === 'LineBreak' || role === 'text' || role === 'InlineTextBox';
    }
    _hasFocusableChild() {
        if (this._cachedHasFocusableChild === undefined) {
            this._cachedHasFocusableChild = false;
            for (const child of this.children) {
                if (child._focusable || child._hasFocusableChild()) {
                    this._cachedHasFocusableChild = true;
                    break;
                }
            }
        }
        return this._cachedHasFocusableChild;
    }
    find(predicate) {
        if (predicate(this))
            return this;
        for (const child of this.children) {
            const result = child.find(predicate);
            if (result)
                return result;
        }
        return null;
    }
    isLeafNode() {
        if (!this.children.length)
            return true;
        // These types of objects may have children that we use as internal
        // implementation details, but we want to expose them as leaves to platform
        // accessibility APIs because screen readers might be confused if they find
        // any children.
        if (this._isPlainTextField() || this._isTextOnlyObject())
            return true;
        // Roles whose children are only presentational according to the ARIA and
        // HTML5 Specs should be hidden from screen readers.
        // (Note that whilst ARIA buttons can have only presentational children, HTML5
        // buttons are allowed to have content.)
        switch (this._role) {
            case 'doc-cover':
            case 'graphics-symbol':
            case 'img':
            case 'Meter':
            case 'scrollbar':
            case 'slider':
            case 'separator':
            case 'progressbar':
                return true;
            default:
                break;
        }
        // Here and below: Android heuristics
        if (this._hasFocusableChild())
            return false;
        if (this._focusable && this._name)
            return true;
        if (this._role === 'heading' && this._name)
            return true;
        return false;
    }
    isControl() {
        switch (this._role) {
            case 'button':
            case 'checkbox':
            case 'ColorWell':
            case 'combobox':
            case 'DisclosureTriangle':
            case 'listbox':
            case 'menu':
            case 'menubar':
            case 'menuitem':
            case 'menuitemcheckbox':
            case 'menuitemradio':
            case 'radio':
            case 'scrollbar':
            case 'searchbox':
            case 'slider':
            case 'spinbutton':
            case 'switch':
            case 'tab':
            case 'textbox':
            case 'tree':
            case 'treeitem':
                return true;
            default:
                return false;
        }
    }
    isInteresting(insideControl) {
        const role = this._role;
        if (role === 'Ignored' || this._hidden || this._ignored)
            return false;
        if (this._focusable || this._richlyEditable)
            return true;
        // If it's not focusable but has a control role, then it's interesting.
        if (this.isControl())
            return true;
        // A non focusable child of a control is not interesting
        if (insideControl)
            return false;
        return this.isLeafNode() && !!this._name;
    }
    serialize() {
        const properties = new Map();
        for (const property of this.payload.properties || [])
            properties.set(property.name.toLowerCase(), property.value.value);
        if (this.payload.name)
            properties.set('name', this.payload.name.value);
        if (this.payload.value)
            properties.set('value', this.payload.value.value);
        if (this.payload.description)
            properties.set('description', this.payload.description.value);
        const node = {
            role: this._role,
        };
        const userStringProperties = [
            'name',
            'value',
            'description',
            'keyshortcuts',
            'roledescription',
            'valuetext',
        ];
        const getUserStringPropertyValue = (key) => properties.get(key);
        for (const userStringProperty of userStringProperties) {
            if (!properties.has(userStringProperty))
                continue;
            node[userStringProperty] = getUserStringPropertyValue(userStringProperty);
        }
        const booleanProperties = [
            'disabled',
            'expanded',
            'focused',
            'modal',
            'multiline',
            'multiselectable',
            'readonly',
            'required',
            'selected',
        ];
        const getBooleanPropertyValue = (key) => properties.get(key);
        for (const booleanProperty of booleanProperties) {
            // RootWebArea's treat focus differently than other nodes. They report whether
            // their frame  has focus, not whether focus is specifically on the root
            // node.
            if (booleanProperty === 'focused' && this._role === 'RootWebArea')
                continue;
            const value = getBooleanPropertyValue(booleanProperty);
            if (!value)
                continue;
            node[booleanProperty] = getBooleanPropertyValue(booleanProperty);
        }
        const tristateProperties = ['checked', 'pressed'];
        for (const tristateProperty of tristateProperties) {
            if (!properties.has(tristateProperty))
                continue;
            const value = properties.get(tristateProperty);
            node[tristateProperty] =
                value === 'mixed' ? 'mixed' : value === 'true' ? true : false;
        }
        const numericalProperties = [
            'level',
            'valuemax',
            'valuemin',
        ];
        const getNumericalPropertyValue = (key) => properties.get(key);
        for (const numericalProperty of numericalProperties) {
            if (!properties.has(numericalProperty))
                continue;
            node[numericalProperty] = getNumericalPropertyValue(numericalProperty);
        }
        const tokenProperties = [
            'autocomplete',
            'haspopup',
            'invalid',
            'orientation',
        ];
        const getTokenPropertyValue = (key) => properties.get(key);
        for (const tokenProperty of tokenProperties) {
            const value = getTokenPropertyValue(tokenProperty);
            if (!value || value === 'false')
                continue;
            node[tokenProperty] = getTokenPropertyValue(tokenProperty);
        }
        return node;
    }
    static createTree(payloads) {
        const nodeById = new Map();
        for (const payload of payloads)
            nodeById.set(payload.nodeId, new AXNode(payload));
        for (const node of nodeById.values()) {
            for (const childId of node.payload.childIds || [])
                node.children.push(nodeById.get(childId));
        }
        return nodeById.values().next().value;
    }
}

},{}],15:[function(require,module,exports){
"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ariaHandler = void 0;
async function queryAXTree(client, element, accessibleName, role) {
    const { nodes } = await client.send('Accessibility.queryAXTree', {
        objectId: element._remoteObject.objectId,
        accessibleName,
        role,
    });
    const filteredNodes = nodes.filter((node) => node.role.value !== 'StaticText');
    return filteredNodes;
}
const normalizeValue = (value) => value.replace(/ +/g, ' ').trim();
const knownAttributes = new Set(['name', 'role']);
const attributeRegexp = /\[\s*(?<attribute>\w+)\s*=\s*(?<quote>"|')(?<value>\\.|.*?(?=\k<quote>))\k<quote>\s*\]/g;
function parseAriaSelector(selector) {
    const queryOptions = {};
    const defaultName = selector.replace(attributeRegexp, (_, attribute, quote, value) => {
        attribute = attribute.trim();
        if (!knownAttributes.has(attribute))
            throw new Error(`Unknown aria attribute "${attribute}" in selector`);
        queryOptions[attribute] = normalizeValue(value);
        return '';
    });
    if (defaultName && !queryOptions.name)
        queryOptions.name = normalizeValue(defaultName);
    return queryOptions;
}
const queryOne = async (element, selector) => {
    const exeCtx = element.executionContext();
    const { name, role } = parseAriaSelector(selector);
    const res = await queryAXTree(exeCtx._client, element, name, role);
    if (res.length < 1) {
        return null;
    }
    return exeCtx._adoptBackendNodeId(res[0].backendDOMNodeId);
};
const waitFor = async (domWorld, selector, options) => {
    const binding = {
        name: 'ariaQuerySelector',
        pptrFunction: async (selector) => {
            const document = await domWorld._document();
            const element = await queryOne(document, selector);
            return element;
        },
    };
    return domWorld.waitForSelectorInPage((_, selector) => globalThis.ariaQuerySelector(selector), selector, options, binding);
};
const queryAll = async (element, selector) => {
    const exeCtx = element.executionContext();
    const { name, role } = parseAriaSelector(selector);
    const res = await queryAXTree(exeCtx._client, element, name, role);
    return Promise.all(res.map((axNode) => exeCtx._adoptBackendNodeId(axNode.backendDOMNodeId)));
};
const queryAllArray = async (element, selector) => {
    const elementHandles = await queryAll(element, selector);
    const exeCtx = element.executionContext();
    const jsHandle = exeCtx.evaluateHandle((...elements) => elements, ...elementHandles);
    return jsHandle;
};
/**
 * @internal
 */
exports.ariaHandler = {
    queryOne,
    waitFor,
    queryAll,
    queryAllArray,
};

},{}],16:[function(require,module,exports){
"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserContext = exports.Browser = void 0;
const assert_js_1 = require("./assert.js");
const helper_js_1 = require("./helper.js");
const Target_js_1 = require("./Target.js");
const EventEmitter_js_1 = require("./EventEmitter.js");
const Connection_js_1 = require("./Connection.js");
const TaskQueue_js_1 = require("./TaskQueue.js");
const WEB_PERMISSION_TO_PROTOCOL_PERMISSION = new Map([
    ['geolocation', 'geolocation'],
    ['midi', 'midi'],
    ['notifications', 'notifications'],
    // TODO: push isn't a valid type?
    // ['push', 'push'],
    ['camera', 'videoCapture'],
    ['microphone', 'audioCapture'],
    ['background-sync', 'backgroundSync'],
    ['ambient-light-sensor', 'sensors'],
    ['accelerometer', 'sensors'],
    ['gyroscope', 'sensors'],
    ['magnetometer', 'sensors'],
    ['accessibility-events', 'accessibilityEvents'],
    ['clipboard-read', 'clipboardReadWrite'],
    ['clipboard-write', 'clipboardReadWrite'],
    ['payment-handler', 'paymentHandler'],
    ['persistent-storage', 'durableStorage'],
    ['idle-detection', 'idleDetection'],
    // chrome-specific permissions we have.
    ['midi-sysex', 'midiSysex'],
]);
/**
 * A Browser is created when Puppeteer connects to a Chromium instance, either through
 * {@link PuppeteerNode.launch} or {@link Puppeteer.connect}.
 *
 * @remarks
 *
 * The Browser class extends from Puppeteer's {@link EventEmitter} class and will
 * emit various events which are documented in the {@link BrowserEmittedEvents} enum.
 *
 * @example
 *
 * An example of using a {@link Browser} to create a {@link Page}:
 * ```js
 * const puppeteer = require('puppeteer');
 *
 * (async () => {
 *   const browser = await puppeteer.launch();
 *   const page = await browser.newPage();
 *   await page.goto('https://example.com');
 *   await browser.close();
 * })();
 * ```
 *
 * @example
 *
 * An example of disconnecting from and reconnecting to a {@link Browser}:
 * ```js
 * const puppeteer = require('puppeteer');
 *
 * (async () => {
 *   const browser = await puppeteer.launch();
 *   // Store the endpoint to be able to reconnect to Chromium
 *   const browserWSEndpoint = browser.wsEndpoint();
 *   // Disconnect puppeteer from Chromium
 *   browser.disconnect();
 *
 *   // Use the endpoint to reestablish a connection
 *   const browser2 = await puppeteer.connect({browserWSEndpoint});
 *   // Close Chromium
 *   await browser2.close();
 * })();
 * ```
 *
 * @public
 */
class Browser extends EventEmitter_js_1.EventEmitter {
    /**
     * @internal
     */
    constructor(connection, contextIds, ignoreHTTPSErrors, defaultViewport, process, closeCallback, targetFilterCallback) {
        super();
        this._ignoredTargets = new Set();
        this._ignoreHTTPSErrors = ignoreHTTPSErrors;
        this._defaultViewport = defaultViewport;
        this._process = process;
        this._screenshotTaskQueue = new TaskQueue_js_1.TaskQueue();
        this._connection = connection;
        this._closeCallback = closeCallback || function () { };
        this._targetFilterCallback = targetFilterCallback || (() => true);
        this._defaultContext = new BrowserContext(this._connection, this, null);
        this._contexts = new Map();
        for (const contextId of contextIds)
            this._contexts.set(contextId, new BrowserContext(this._connection, this, contextId));
        this._targets = new Map();
        this._connection.on(Connection_js_1.ConnectionEmittedEvents.Disconnected, () => this.emit("disconnected" /* Disconnected */));
        this._connection.on('Target.targetCreated', this._targetCreated.bind(this));
        this._connection.on('Target.targetDestroyed', this._targetDestroyed.bind(this));
        this._connection.on('Target.targetInfoChanged', this._targetInfoChanged.bind(this));
    }
    /**
     * @internal
     */
    static async create(connection, contextIds, ignoreHTTPSErrors, defaultViewport, process, closeCallback, targetFilterCallback) {
        const browser = new Browser(connection, contextIds, ignoreHTTPSErrors, defaultViewport, process, closeCallback, targetFilterCallback);
        await connection.send('Target.setDiscoverTargets', { discover: true });
        return browser;
    }
    /**
     * The spawned browser process. Returns `null` if the browser instance was created with
     * {@link Puppeteer.connect}.
     */
    process() {
        return this._process;
    }
    /**
     * Creates a new incognito browser context. This won't share cookies/cache with other
     * browser contexts.
     *
     * @example
     * ```js
     * (async () => {
     *  const browser = await puppeteer.launch();
     *   // Create a new incognito browser context.
     *   const context = await browser.createIncognitoBrowserContext();
     *   // Create a new page in a pristine context.
     *   const page = await context.newPage();
     *   // Do stuff
     *   await page.goto('https://example.com');
     * })();
     * ```
     */
    async createIncognitoBrowserContext(options = {}) {
        const { proxyServer = '', proxyBypassList = [] } = options;
        const { browserContextId } = await this._connection.send('Target.createBrowserContext', {
            proxyServer,
            proxyBypassList: proxyBypassList && proxyBypassList.join(','),
        });
        const context = new BrowserContext(this._connection, this, browserContextId);
        this._contexts.set(browserContextId, context);
        return context;
    }
    /**
     * Returns an array of all open browser contexts. In a newly created browser, this will
     * return a single instance of {@link BrowserContext}.
     */
    browserContexts() {
        return [this._defaultContext, ...Array.from(this._contexts.values())];
    }
    /**
     * Returns the default browser context. The default browser context cannot be closed.
     */
    defaultBrowserContext() {
        return this._defaultContext;
    }
    /**
     * @internal
     * Used by BrowserContext directly so cannot be marked private.
     */
    async _disposeContext(contextId) {
        await this._connection.send('Target.disposeBrowserContext', {
            browserContextId: contextId || undefined,
        });
        this._contexts.delete(contextId);
    }
    async _targetCreated(event) {
        const targetInfo = event.targetInfo;
        const { browserContextId } = targetInfo;
        const context = browserContextId && this._contexts.has(browserContextId)
            ? this._contexts.get(browserContextId)
            : this._defaultContext;
        const shouldAttachToTarget = this._targetFilterCallback(targetInfo);
        if (!shouldAttachToTarget) {
            this._ignoredTargets.add(targetInfo.targetId);
            return;
        }
        const target = new Target_js_1.Target(targetInfo, context, () => this._connection.createSession(targetInfo), this._ignoreHTTPSErrors, this._defaultViewport, this._screenshotTaskQueue);
        (0, assert_js_1.assert)(!this._targets.has(event.targetInfo.targetId), 'Target should not exist before targetCreated');
        this._targets.set(event.targetInfo.targetId, target);
        if (await target._initializedPromise) {
            this.emit("targetcreated" /* TargetCreated */, target);
            context.emit("targetcreated" /* TargetCreated */, target);
        }
    }
    async _targetDestroyed(event) {
        if (this._ignoredTargets.has(event.targetId))
            return;
        const target = this._targets.get(event.targetId);
        target._initializedCallback(false);
        this._targets.delete(event.targetId);
        target._closedCallback();
        if (await target._initializedPromise) {
            this.emit("targetdestroyed" /* TargetDestroyed */, target);
            target
                .browserContext()
                .emit("targetdestroyed" /* TargetDestroyed */, target);
        }
    }
    _targetInfoChanged(event) {
        if (this._ignoredTargets.has(event.targetInfo.targetId))
            return;
        const target = this._targets.get(event.targetInfo.targetId);
        (0, assert_js_1.assert)(target, 'target should exist before targetInfoChanged');
        const previousURL = target.url();
        const wasInitialized = target._isInitialized;
        target._targetInfoChanged(event.targetInfo);
        if (wasInitialized && previousURL !== target.url()) {
            this.emit("targetchanged" /* TargetChanged */, target);
            target
                .browserContext()
                .emit("targetchanged" /* TargetChanged */, target);
        }
    }
    /**
     * The browser websocket endpoint which can be used as an argument to
     * {@link Puppeteer.connect}.
     *
     * @returns The Browser websocket url.
     *
     * @remarks
     *
     * The format is `ws://${host}:${port}/devtools/browser/<id>`.
     *
     * You can find the `webSocketDebuggerUrl` from `http://${host}:${port}/json/version`.
     * Learn more about the
     * {@link https://chromedevtools.github.io/devtools-protocol | devtools protocol} and
     * the {@link
     * https://chromedevtools.github.io/devtools-protocol/#how-do-i-access-the-browser-target
     * | browser endpoint}.
     */
    wsEndpoint() {
        return this._connection.url();
    }
    /**
     * Promise which resolves to a new {@link Page} object. The Page is created in
     * a default browser context.
     */
    async newPage() {
        return this._defaultContext.newPage();
    }
    /**
     * @internal
     * Used by BrowserContext directly so cannot be marked private.
     */
    async _createPageInContext(contextId) {
        const { targetId } = await this._connection.send('Target.createTarget', {
            url: 'about:blank',
            browserContextId: contextId || undefined,
        });
        const target = this._targets.get(targetId);
        (0, assert_js_1.assert)(await target._initializedPromise, 'Failed to create target for page');
        const page = await target.page();
        return page;
    }
    /**
     * All active targets inside the Browser. In case of multiple browser contexts, returns
     * an array with all the targets in all browser contexts.
     */
    targets() {
        return Array.from(this._targets.values()).filter((target) => target._isInitialized);
    }
    /**
     * The target associated with the browser.
     */
    target() {
        return this.targets().find((target) => target.type() === 'browser');
    }
    /**
     * Searches for a target in all browser contexts.
     *
     * @param predicate - A function to be run for every target.
     * @returns The first target found that matches the `predicate` function.
     *
     * @example
     *
     * An example of finding a target for a page opened via `window.open`:
     * ```js
     * await page.evaluate(() => window.open('https://www.example.com/'));
     * const newWindowTarget = await browser.waitForTarget(target => target.url() === 'https://www.example.com/');
     * ```
     */
    async waitForTarget(predicate, options = {}) {
        const { timeout = 30000 } = options;
        const existingTarget = this.targets().find(predicate);
        if (existingTarget)
            return existingTarget;
        let resolve;
        const targetPromise = new Promise((x) => (resolve = x));
        this.on("targetcreated" /* TargetCreated */, check);
        this.on("targetchanged" /* TargetChanged */, check);
        try {
            if (!timeout)
                return await targetPromise;
            return await helper_js_1.helper.waitWithTimeout(targetPromise, 'target', timeout);
        }
        finally {
            this.removeListener("targetcreated" /* TargetCreated */, check);
            this.removeListener("targetchanged" /* TargetChanged */, check);
        }
        function check(target) {
            if (predicate(target))
                resolve(target);
        }
    }
    /**
     * An array of all open pages inside the Browser.
     *
     * @remarks
     *
     * In case of multiple browser contexts, returns an array with all the pages in all
     * browser contexts. Non-visible pages, such as `"background_page"`, will not be listed
     * here. You can find them using {@link Target.page}.
     */
    async pages() {
        const contextPages = await Promise.all(this.browserContexts().map((context) => context.pages()));
        // Flatten array.
        return contextPages.reduce((acc, x) => acc.concat(x), []);
    }
    /**
     * A string representing the browser name and version.
     *
     * @remarks
     *
     * For headless Chromium, this is similar to `HeadlessChrome/61.0.3153.0`. For
     * non-headless, this is similar to `Chrome/61.0.3153.0`.
     *
     * The format of browser.version() might change with future releases of Chromium.
     */
    async version() {
        const version = await this._getVersion();
        return version.product;
    }
    /**
     * The browser's original user agent. Pages can override the browser user agent with
     * {@link Page.setUserAgent}.
     */
    async userAgent() {
        const version = await this._getVersion();
        return version.userAgent;
    }
    /**
     * Closes Chromium and all of its pages (if any were opened). The {@link Browser} object
     * itself is considered to be disposed and cannot be used anymore.
     */
    async close() {
        await this._closeCallback.call(null);
        this.disconnect();
    }
    /**
     * Disconnects Puppeteer from the browser, but leaves the Chromium process running.
     * After calling `disconnect`, the {@link Browser} object is considered disposed and
     * cannot be used anymore.
     */
    disconnect() {
        this._connection.dispose();
    }
    /**
     * Indicates that the browser is connected.
     */
    isConnected() {
        return !this._connection._closed;
    }
    _getVersion() {
        return this._connection.send('Browser.getVersion');
    }
}
exports.Browser = Browser;
/**
 * BrowserContexts provide a way to operate multiple independent browser
 * sessions. When a browser is launched, it has a single BrowserContext used by
 * default. The method {@link Browser.newPage | Browser.newPage} creates a page
 * in the default browser context.
 *
 * @remarks
 *
 * The Browser class extends from Puppeteer's {@link EventEmitter} class and
 * will emit various events which are documented in the
 * {@link BrowserContextEmittedEvents} enum.
 *
 * If a page opens another page, e.g. with a `window.open` call, the popup will
 * belong to the parent page's browser context.
 *
 * Puppeteer allows creation of "incognito" browser contexts with
 * {@link Browser.createIncognitoBrowserContext | Browser.createIncognitoBrowserContext}
 * method. "Incognito" browser contexts don't write any browsing data to disk.
 *
 * @example
 * ```js
 * // Create a new incognito browser context
 * const context = await browser.createIncognitoBrowserContext();
 * // Create a new page inside context.
 * const page = await context.newPage();
 * // ... do stuff with page ...
 * await page.goto('https://example.com');
 * // Dispose context once it's no longer needed.
 * await context.close();
 * ```
 * @public
 */
class BrowserContext extends EventEmitter_js_1.EventEmitter {
    /**
     * @internal
     */
    constructor(connection, browser, contextId) {
        super();
        this._connection = connection;
        this._browser = browser;
        this._id = contextId;
    }
    /**
     * An array of all active targets inside the browser context.
     */
    targets() {
        return this._browser
            .targets()
            .filter((target) => target.browserContext() === this);
    }
    /**
     * This searches for a target in this specific browser context.
     *
     * @example
     * An example of finding a target for a page opened via `window.open`:
     * ```js
     * await page.evaluate(() => window.open('https://www.example.com/'));
     * const newWindowTarget = await browserContext.waitForTarget(target => target.url() === 'https://www.example.com/');
     * ```
     *
     * @param predicate - A function to be run for every target
     * @param options - An object of options. Accepts a timout,
     * which is the maximum wait time in milliseconds.
     * Pass `0` to disable the timeout. Defaults to 30 seconds.
     * @returns Promise which resolves to the first target found
     * that matches the `predicate` function.
     */
    waitForTarget(predicate, options = {}) {
        return this._browser.waitForTarget((target) => target.browserContext() === this && predicate(target), options);
    }
    /**
     * An array of all pages inside the browser context.
     *
     * @returns Promise which resolves to an array of all open pages.
     * Non visible pages, such as `"background_page"`, will not be listed here.
     * You can find them using {@link Target.page | the target page}.
     */
    async pages() {
        const pages = await Promise.all(this.targets()
            .filter((target) => target.type() === 'page')
            .map((target) => target.page()));
        return pages.filter((page) => !!page);
    }
    /**
     * Returns whether BrowserContext is incognito.
     * The default browser context is the only non-incognito browser context.
     *
     * @remarks
     * The default browser context cannot be closed.
     */
    isIncognito() {
        return !!this._id;
    }
    /**
     * @example
     * ```js
     * const context = browser.defaultBrowserContext();
     * await context.overridePermissions('https://html5demos.com', ['geolocation']);
     * ```
     *
     * @param origin - The origin to grant permissions to, e.g. "https://example.com".
     * @param permissions - An array of permissions to grant.
     * All permissions that are not listed here will be automatically denied.
     */
    async overridePermissions(origin, permissions) {
        const protocolPermissions = permissions.map((permission) => {
            const protocolPermission = WEB_PERMISSION_TO_PROTOCOL_PERMISSION.get(permission);
            if (!protocolPermission)
                throw new Error('Unknown permission: ' + permission);
            return protocolPermission;
        });
        await this._connection.send('Browser.grantPermissions', {
            origin,
            browserContextId: this._id || undefined,
            permissions: protocolPermissions,
        });
    }
    /**
     * Clears all permission overrides for the browser context.
     *
     * @example
     * ```js
     * const context = browser.defaultBrowserContext();
     * context.overridePermissions('https://example.com', ['clipboard-read']);
     * // do stuff ..
     * context.clearPermissionOverrides();
     * ```
     */
    async clearPermissionOverrides() {
        await this._connection.send('Browser.resetPermissions', {
            browserContextId: this._id || undefined,
        });
    }
    /**
     * Creates a new page in the browser context.
     */
    newPage() {
        return this._browser._createPageInContext(this._id);
    }
    /**
     * The browser this browser context belongs to.
     */
    browser() {
        return this._browser;
    }
    /**
     * Closes the browser context. All the targets that belong to the browser context
     * will be closed.
     *
     * @remarks
     * Only incognito browser contexts can be closed.
     */
    async close() {
        (0, assert_js_1.assert)(this._id, 'Non-incognito profiles cannot be closed!');
        await this._browser._disposeContext(this._id);
    }
}
exports.BrowserContext = BrowserContext;

},{"./Connection.js":19,"./EventEmitter.js":28,"./Target.js":44,"./TaskQueue.js":45,"./assert.js":50,"./helper.js":52}],17:[function(require,module,exports){
"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToBrowser = void 0;
const Browser_js_1 = require("./Browser.js");
const assert_js_1 = require("./assert.js");
const helper_js_1 = require("../common/helper.js");
const Connection_js_1 = require("./Connection.js");
const fetch_js_1 = require("./fetch.js");
const environment_js_1 = require("../environment.js");
const getWebSocketTransportClass = async () => {
    return environment_js_1.isNode
        ? (await Promise.resolve().then(() => __importStar(require('../node/NodeWebSocketTransport.js')))).NodeWebSocketTransport
        : (await Promise.resolve().then(() => __importStar(require('./BrowserWebSocketTransport.js'))))
            .BrowserWebSocketTransport;
};
/**
 * Users should never call this directly; it's called when calling
 * `puppeteer.connect`.
 * @internal
 */
const connectToBrowser = async (options) => {
    const { browserWSEndpoint, browserURL, ignoreHTTPSErrors = false, defaultViewport = { width: 800, height: 600 }, transport, slowMo = 0, targetFilter, } = options;
    (0, assert_js_1.assert)(Number(!!browserWSEndpoint) + Number(!!browserURL) + Number(!!transport) ===
        1, 'Exactly one of browserWSEndpoint, browserURL or transport must be passed to puppeteer.connect');
    let connection = null;
    if (transport) {
        connection = new Connection_js_1.Connection('', transport, slowMo);
    }
    else if (browserWSEndpoint) {
        const WebSocketClass = await getWebSocketTransportClass();
        const connectionTransport = await WebSocketClass.create(browserWSEndpoint);
        connection = new Connection_js_1.Connection(browserWSEndpoint, connectionTransport, slowMo);
    }
    else if (browserURL) {
        const connectionURL = await getWSEndpoint(browserURL);
        const WebSocketClass = await getWebSocketTransportClass();
        const connectionTransport = await WebSocketClass.create(connectionURL);
        connection = new Connection_js_1.Connection(connectionURL, connectionTransport, slowMo);
    }
    const { browserContextIds } = await connection.send('Target.getBrowserContexts');
    return Browser_js_1.Browser.create(connection, browserContextIds, ignoreHTTPSErrors, defaultViewport, null, () => connection.send('Browser.close').catch(helper_js_1.debugError), targetFilter);
};
exports.connectToBrowser = connectToBrowser;
async function getWSEndpoint(browserURL) {
    const endpointURL = new URL('/json/version', browserURL);
    const fetch = await (0, fetch_js_1.getFetch)();
    try {
        const result = await fetch(endpointURL.toString(), {
            method: 'GET',
        });
        if (!result.ok) {
            throw new Error(`HTTP ${result.statusText}`);
        }
        const data = await result.json();
        return data.webSocketDebuggerUrl;
    }
    catch (error) {
        error.message =
            `Failed to fetch browser webSocket URL from ${endpointURL}: ` +
                error.message;
        throw error;
    }
}

},{"../common/helper.js":52,"../environment.js":53,"../node/NodeWebSocketTransport.js":55,"./Browser.js":16,"./BrowserWebSocketTransport.js":18,"./Connection.js":19,"./assert.js":50,"./fetch.js":51}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserWebSocketTransport = void 0;
class BrowserWebSocketTransport {
    constructor(ws) {
        this._ws = ws;
        this._ws.addEventListener('message', (event) => {
            if (this.onmessage)
                this.onmessage.call(null, event.data);
        });
        this._ws.addEventListener('close', () => {
            if (this.onclose)
                this.onclose.call(null);
        });
        // Silently ignore all errors - we don't know what to do with them.
        this._ws.addEventListener('error', () => { });
        this.onmessage = null;
        this.onclose = null;
    }
    static create(url) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url);
            ws.addEventListener('open', () => resolve(new BrowserWebSocketTransport(ws)));
            ws.addEventListener('error', reject);
        });
    }
    send(message) {
        this._ws.send(message);
    }
    close() {
        this._ws.close();
    }
}
exports.BrowserWebSocketTransport = BrowserWebSocketTransport;

},{}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDPSession = exports.CDPSessionEmittedEvents = exports.Connection = exports.ConnectionEmittedEvents = void 0;
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const assert_js_1 = require("./assert.js");
const Debug_js_1 = require("./Debug.js");
const debugProtocolSend = (0, Debug_js_1.debug)('puppeteer:protocol:SEND ►');
const debugProtocolReceive = (0, Debug_js_1.debug)('puppeteer:protocol:RECV ◀');
const EventEmitter_js_1 = require("./EventEmitter.js");
const Errors_js_1 = require("./Errors.js");
/**
 * Internal events that the Connection class emits.
 *
 * @internal
 */
exports.ConnectionEmittedEvents = {
    Disconnected: Symbol('Connection.Disconnected'),
};
/**
 * @public
 */
class Connection extends EventEmitter_js_1.EventEmitter {
    constructor(url, transport, delay = 0) {
        super();
        this._lastId = 0;
        this._sessions = new Map();
        this._closed = false;
        this._callbacks = new Map();
        this._url = url;
        this._delay = delay;
        this._transport = transport;
        this._transport.onmessage = this._onMessage.bind(this);
        this._transport.onclose = this._onClose.bind(this);
    }
    static fromSession(session) {
        return session._connection;
    }
    /**
     * @param sessionId - The session id
     * @returns The current CDP session if it exists
     */
    session(sessionId) {
        return this._sessions.get(sessionId) || null;
    }
    url() {
        return this._url;
    }
    send(method, ...paramArgs) {
        // There is only ever 1 param arg passed, but the Protocol defines it as an
        // array of 0 or 1 items See this comment:
        // https://github.com/ChromeDevTools/devtools-protocol/pull/113#issuecomment-412603285
        // which explains why the protocol defines the params this way for better
        // type-inference.
        // So now we check if there are any params or not and deal with them accordingly.
        const params = paramArgs.length ? paramArgs[0] : undefined;
        const id = this._rawSend({ method, params });
        return new Promise((resolve, reject) => {
            this._callbacks.set(id, {
                resolve,
                reject,
                error: new Errors_js_1.ProtocolError(),
                method,
            });
        });
    }
    _rawSend(message) {
        const id = ++this._lastId;
        const stringifiedMessage = JSON.stringify(Object.assign({}, message, { id }));
        debugProtocolSend(stringifiedMessage);
        this._transport.send(stringifiedMessage);
        return id;
    }
    async _onMessage(message) {
        if (this._delay)
            await new Promise((f) => setTimeout(f, this._delay));
        debugProtocolReceive(message);
        const object = JSON.parse(message);
        if (object.method === 'Target.attachedToTarget') {
            const sessionId = object.params.sessionId;
            const session = new CDPSession(this, object.params.targetInfo.type, sessionId);
            this._sessions.set(sessionId, session);
            this.emit('sessionattached', session);
            const parentSession = this._sessions.get(object.sessionId);
            if (parentSession) {
                parentSession.emit('sessionattached', session);
            }
        }
        else if (object.method === 'Target.detachedFromTarget') {
            const session = this._sessions.get(object.params.sessionId);
            if (session) {
                session._onClosed();
                this._sessions.delete(object.params.sessionId);
                this.emit('sessiondetached', session);
                const parentSession = this._sessions.get(object.sessionId);
                if (parentSession) {
                    parentSession.emit('sessiondetached', session);
                }
            }
        }
        if (object.sessionId) {
            const session = this._sessions.get(object.sessionId);
            if (session)
                session._onMessage(object);
        }
        else if (object.id) {
            const callback = this._callbacks.get(object.id);
            // Callbacks could be all rejected if someone has called `.dispose()`.
            if (callback) {
                this._callbacks.delete(object.id);
                if (object.error)
                    callback.reject(createProtocolError(callback.error, callback.method, object));
                else
                    callback.resolve(object.result);
            }
        }
        else {
            this.emit(object.method, object.params);
        }
    }
    _onClose() {
        if (this._closed)
            return;
        this._closed = true;
        this._transport.onmessage = null;
        this._transport.onclose = null;
        for (const callback of this._callbacks.values())
            callback.reject(rewriteError(callback.error, `Protocol error (${callback.method}): Target closed.`));
        this._callbacks.clear();
        for (const session of this._sessions.values())
            session._onClosed();
        this._sessions.clear();
        this.emit(exports.ConnectionEmittedEvents.Disconnected);
    }
    dispose() {
        this._onClose();
        this._transport.close();
    }
    /**
     * @param targetInfo - The target info
     * @returns The CDP session that is created
     */
    async createSession(targetInfo) {
        const { sessionId } = await this.send('Target.attachToTarget', {
            targetId: targetInfo.targetId,
            flatten: true,
        });
        return this._sessions.get(sessionId);
    }
}
exports.Connection = Connection;
/**
 * Internal events that the CDPSession class emits.
 *
 * @internal
 */
exports.CDPSessionEmittedEvents = {
    Disconnected: Symbol('CDPSession.Disconnected'),
};
/**
 * The `CDPSession` instances are used to talk raw Chrome Devtools Protocol.
 *
 * @remarks
 *
 * Protocol methods can be called with {@link CDPSession.send} method and protocol
 * events can be subscribed to with `CDPSession.on` method.
 *
 * Useful links: {@link https://chromedevtools.github.io/devtools-protocol/ | DevTools Protocol Viewer}
 * and {@link https://github.com/aslushnikov/getting-started-with-cdp/blob/HEAD/README.md | Getting Started with DevTools Protocol}.
 *
 * @example
 * ```js
 * const client = await page.target().createCDPSession();
 * await client.send('Animation.enable');
 * client.on('Animation.animationCreated', () => console.log('Animation created!'));
 * const response = await client.send('Animation.getPlaybackRate');
 * console.log('playback rate is ' + response.playbackRate);
 * await client.send('Animation.setPlaybackRate', {
 *   playbackRate: response.playbackRate / 2
 * });
 * ```
 *
 * @public
 */
class CDPSession extends EventEmitter_js_1.EventEmitter {
    /**
     * @internal
     */
    constructor(connection, targetType, sessionId) {
        super();
        this._callbacks = new Map();
        this._connection = connection;
        this._targetType = targetType;
        this._sessionId = sessionId;
    }
    connection() {
        return this._connection;
    }
    send(method, ...paramArgs) {
        if (!this._connection)
            return Promise.reject(new Error(`Protocol error (${method}): Session closed. Most likely the ${this._targetType} has been closed.`));
        // See the comment in Connection#send explaining why we do this.
        const params = paramArgs.length ? paramArgs[0] : undefined;
        const id = this._connection._rawSend({
            sessionId: this._sessionId,
            method,
            params,
        });
        return new Promise((resolve, reject) => {
            this._callbacks.set(id, {
                resolve,
                reject,
                error: new Errors_js_1.ProtocolError(),
                method,
            });
        });
    }
    /**
     * @internal
     */
    _onMessage(object) {
        if (object.id && this._callbacks.has(object.id)) {
            const callback = this._callbacks.get(object.id);
            this._callbacks.delete(object.id);
            if (object.error)
                callback.reject(createProtocolError(callback.error, callback.method, object));
            else
                callback.resolve(object.result);
        }
        else {
            (0, assert_js_1.assert)(!object.id);
            this.emit(object.method, object.params);
        }
    }
    /**
     * Detaches the cdpSession from the target. Once detached, the cdpSession object
     * won't emit any events and can't be used to send messages.
     */
    async detach() {
        if (!this._connection)
            throw new Error(`Session already detached. Most likely the ${this._targetType} has been closed.`);
        await this._connection.send('Target.detachFromTarget', {
            sessionId: this._sessionId,
        });
    }
    /**
     * @internal
     */
    _onClosed() {
        for (const callback of this._callbacks.values())
            callback.reject(rewriteError(callback.error, `Protocol error (${callback.method}): Target closed.`));
        this._callbacks.clear();
        this._connection = null;
        this.emit(exports.CDPSessionEmittedEvents.Disconnected);
    }
    /**
     * @internal
     */
    id() {
        return this._sessionId;
    }
}
exports.CDPSession = CDPSession;
/**
 * @param {!Error} error
 * @param {string} method
 * @param {{error: {message: string, data: any}}} object
 * @returns {!Error}
 */
function createProtocolError(error, method, object) {
    let message = `Protocol error (${method}): ${object.error.message}`;
    if ('data' in object.error)
        message += ` ${object.error.data}`;
    return rewriteError(error, message, object.error.message);
}
/**
 * @param {!Error} error
 * @param {string} message
 * @returns {!Error}
 */
function rewriteError(error, message, originalMessage) {
    error.message = message;
    error.originalMessage = originalMessage;
    return error;
}

},{"./Debug.js":23,"./Errors.js":27,"./EventEmitter.js":28,"./assert.js":50}],20:[function(require,module,exports){
"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleMessage = void 0;
/**
 * ConsoleMessage objects are dispatched by page via the 'console' event.
 * @public
 */
class ConsoleMessage {
    /**
     * @public
     */
    constructor(type, text, args, stackTraceLocations) {
        this._type = type;
        this._text = text;
        this._args = args;
        this._stackTraceLocations = stackTraceLocations;
    }
    /**
     * @returns The type of the console message.
     */
    type() {
        return this._type;
    }
    /**
     * @returns The text of the console message.
     */
    text() {
        return this._text;
    }
    /**
     * @returns An array of arguments passed to the console.
     */
    args() {
        return this._args;
    }
    /**
     * @returns The location of the console message.
     */
    location() {
        return this._stackTraceLocations.length ? this._stackTraceLocations[0] : {};
    }
    /**
     * @returns The array of locations on the stack of the console message.
     */
    stackTrace() {
        return this._stackTraceLocations;
    }
}
exports.ConsoleMessage = ConsoleMessage;

},{}],21:[function(require,module,exports){
"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSSCoverage = exports.JSCoverage = exports.Coverage = void 0;
const assert_js_1 = require("./assert.js");
const helper_js_1 = require("./helper.js");
const ExecutionContext_js_1 = require("./ExecutionContext.js");
/**
 * The Coverage class provides methods to gathers information about parts of
 * JavaScript and CSS that were used by the page.
 *
 * @remarks
 * To output coverage in a form consumable by {@link https://github.com/istanbuljs | Istanbul},
 * see {@link https://github.com/istanbuljs/puppeteer-to-istanbul | puppeteer-to-istanbul}.
 *
 * @example
 * An example of using JavaScript and CSS coverage to get percentage of initially
 * executed code:
 * ```js
 * // Enable both JavaScript and CSS coverage
 * await Promise.all([
 *   page.coverage.startJSCoverage(),
 *   page.coverage.startCSSCoverage()
 * ]);
 * // Navigate to page
 * await page.goto('https://example.com');
 * // Disable both JavaScript and CSS coverage
 * const [jsCoverage, cssCoverage] = await Promise.all([
 *   page.coverage.stopJSCoverage(),
 *   page.coverage.stopCSSCoverage(),
 * ]);
 * let totalBytes = 0;
 * let usedBytes = 0;
 * const coverage = [...jsCoverage, ...cssCoverage];
 * for (const entry of coverage) {
 *   totalBytes += entry.text.length;
 *   for (const range of entry.ranges)
 *     usedBytes += range.end - range.start - 1;
 * }
 * console.log(`Bytes used: ${usedBytes / totalBytes * 100}%`);
 * ```
 * @public
 */
class Coverage {
    constructor(client) {
        this._jsCoverage = new JSCoverage(client);
        this._cssCoverage = new CSSCoverage(client);
    }
    /**
     * @param options - Set of configurable options for coverage defaults to
     * `resetOnNavigation : true, reportAnonymousScripts : false`
     * @returns Promise that resolves when coverage is started.
     *
     * @remarks
     * Anonymous scripts are ones that don't have an associated url. These are
     * scripts that are dynamically created on the page using `eval` or
     * `new Function`. If `reportAnonymousScripts` is set to `true`, anonymous
     * scripts will have `__puppeteer_evaluation_script__` as their URL.
     */
    async startJSCoverage(options = {}) {
        return await this._jsCoverage.start(options);
    }
    /**
     * @returns Promise that resolves to the array of coverage reports for
     * all scripts.
     *
     * @remarks
     * JavaScript Coverage doesn't include anonymous scripts by default.
     * However, scripts with sourceURLs are reported.
     */
    async stopJSCoverage() {
        return await this._jsCoverage.stop();
    }
    /**
     * @param options - Set of configurable options for coverage, defaults to
     * `resetOnNavigation : true`
     * @returns Promise that resolves when coverage is started.
     */
    async startCSSCoverage(options = {}) {
        return await this._cssCoverage.start(options);
    }
    /**
     * @returns Promise that resolves to the array of coverage reports
     * for all stylesheets.
     * @remarks
     * CSS Coverage doesn't include dynamically injected style tags
     * without sourceURLs.
     */
    async stopCSSCoverage() {
        return await this._cssCoverage.stop();
    }
}
exports.Coverage = Coverage;
/**
 * @public
 */
class JSCoverage {
    constructor(client) {
        this._enabled = false;
        this._scriptURLs = new Map();
        this._scriptSources = new Map();
        this._eventListeners = [];
        this._resetOnNavigation = false;
        this._reportAnonymousScripts = false;
        this._includeRawScriptCoverage = false;
        this._client = client;
    }
    async start(options = {}) {
        (0, assert_js_1.assert)(!this._enabled, 'JSCoverage is already enabled');
        const { resetOnNavigation = true, reportAnonymousScripts = false, includeRawScriptCoverage = false, } = options;
        this._resetOnNavigation = resetOnNavigation;
        this._reportAnonymousScripts = reportAnonymousScripts;
        this._includeRawScriptCoverage = includeRawScriptCoverage;
        this._enabled = true;
        this._scriptURLs.clear();
        this._scriptSources.clear();
        this._eventListeners = [
            helper_js_1.helper.addEventListener(this._client, 'Debugger.scriptParsed', this._onScriptParsed.bind(this)),
            helper_js_1.helper.addEventListener(this._client, 'Runtime.executionContextsCleared', this._onExecutionContextsCleared.bind(this)),
        ];
        await Promise.all([
            this._client.send('Profiler.enable'),
            this._client.send('Profiler.startPreciseCoverage', {
                callCount: this._includeRawScriptCoverage,
                detailed: true,
            }),
            this._client.send('Debugger.enable'),
            this._client.send('Debugger.setSkipAllPauses', { skip: true }),
        ]);
    }
    _onExecutionContextsCleared() {
        if (!this._resetOnNavigation)
            return;
        this._scriptURLs.clear();
        this._scriptSources.clear();
    }
    async _onScriptParsed(event) {
        // Ignore puppeteer-injected scripts
        if (event.url === ExecutionContext_js_1.EVALUATION_SCRIPT_URL)
            return;
        // Ignore other anonymous scripts unless the reportAnonymousScripts option is true.
        if (!event.url && !this._reportAnonymousScripts)
            return;
        try {
            const response = await this._client.send('Debugger.getScriptSource', {
                scriptId: event.scriptId,
            });
            this._scriptURLs.set(event.scriptId, event.url);
            this._scriptSources.set(event.scriptId, response.scriptSource);
        }
        catch (error) {
            // This might happen if the page has already navigated away.
            (0, helper_js_1.debugError)(error);
        }
    }
    async stop() {
        (0, assert_js_1.assert)(this._enabled, 'JSCoverage is not enabled');
        this._enabled = false;
        const result = await Promise.all([
            this._client.send('Profiler.takePreciseCoverage'),
            this._client.send('Profiler.stopPreciseCoverage'),
            this._client.send('Profiler.disable'),
            this._client.send('Debugger.disable'),
        ]);
        helper_js_1.helper.removeEventListeners(this._eventListeners);
        const coverage = [];
        const profileResponse = result[0];
        for (const entry of profileResponse.result) {
            let url = this._scriptURLs.get(entry.scriptId);
            if (!url && this._reportAnonymousScripts)
                url = 'debugger://VM' + entry.scriptId;
            const text = this._scriptSources.get(entry.scriptId);
            if (text === undefined || url === undefined)
                continue;
            const flattenRanges = [];
            for (const func of entry.functions)
                flattenRanges.push(...func.ranges);
            const ranges = convertToDisjointRanges(flattenRanges);
            if (!this._includeRawScriptCoverage) {
                coverage.push({ url, ranges, text });
            }
            else {
                coverage.push({ url, ranges, text, rawScriptCoverage: entry });
            }
        }
        return coverage;
    }
}
exports.JSCoverage = JSCoverage;
/**
 * @public
 */
class CSSCoverage {
    constructor(client) {
        this._enabled = false;
        this._stylesheetURLs = new Map();
        this._stylesheetSources = new Map();
        this._eventListeners = [];
        this._resetOnNavigation = false;
        this._reportAnonymousScripts = false;
        this._client = client;
    }
    async start(options = {}) {
        (0, assert_js_1.assert)(!this._enabled, 'CSSCoverage is already enabled');
        const { resetOnNavigation = true } = options;
        this._resetOnNavigation = resetOnNavigation;
        this._enabled = true;
        this._stylesheetURLs.clear();
        this._stylesheetSources.clear();
        this._eventListeners = [
            helper_js_1.helper.addEventListener(this._client, 'CSS.styleSheetAdded', this._onStyleSheet.bind(this)),
            helper_js_1.helper.addEventListener(this._client, 'Runtime.executionContextsCleared', this._onExecutionContextsCleared.bind(this)),
        ];
        await Promise.all([
            this._client.send('DOM.enable'),
            this._client.send('CSS.enable'),
            this._client.send('CSS.startRuleUsageTracking'),
        ]);
    }
    _onExecutionContextsCleared() {
        if (!this._resetOnNavigation)
            return;
        this._stylesheetURLs.clear();
        this._stylesheetSources.clear();
    }
    async _onStyleSheet(event) {
        const header = event.header;
        // Ignore anonymous scripts
        if (!header.sourceURL)
            return;
        try {
            const response = await this._client.send('CSS.getStyleSheetText', {
                styleSheetId: header.styleSheetId,
            });
            this._stylesheetURLs.set(header.styleSheetId, header.sourceURL);
            this._stylesheetSources.set(header.styleSheetId, response.text);
        }
        catch (error) {
            // This might happen if the page has already navigated away.
            (0, helper_js_1.debugError)(error);
        }
    }
    async stop() {
        (0, assert_js_1.assert)(this._enabled, 'CSSCoverage is not enabled');
        this._enabled = false;
        const ruleTrackingResponse = await this._client.send('CSS.stopRuleUsageTracking');
        await Promise.all([
            this._client.send('CSS.disable'),
            this._client.send('DOM.disable'),
        ]);
        helper_js_1.helper.removeEventListeners(this._eventListeners);
        // aggregate by styleSheetId
        const styleSheetIdToCoverage = new Map();
        for (const entry of ruleTrackingResponse.ruleUsage) {
            let ranges = styleSheetIdToCoverage.get(entry.styleSheetId);
            if (!ranges) {
                ranges = [];
                styleSheetIdToCoverage.set(entry.styleSheetId, ranges);
            }
            ranges.push({
                startOffset: entry.startOffset,
                endOffset: entry.endOffset,
                count: entry.used ? 1 : 0,
            });
        }
        const coverage = [];
        for (const styleSheetId of this._stylesheetURLs.keys()) {
            const url = this._stylesheetURLs.get(styleSheetId);
            const text = this._stylesheetSources.get(styleSheetId);
            const ranges = convertToDisjointRanges(styleSheetIdToCoverage.get(styleSheetId) || []);
            coverage.push({ url, ranges, text });
        }
        return coverage;
    }
}
exports.CSSCoverage = CSSCoverage;
function convertToDisjointRanges(nestedRanges) {
    const points = [];
    for (const range of nestedRanges) {
        points.push({ offset: range.startOffset, type: 0, range });
        points.push({ offset: range.endOffset, type: 1, range });
    }
    // Sort points to form a valid parenthesis sequence.
    points.sort((a, b) => {
        // Sort with increasing offsets.
        if (a.offset !== b.offset)
            return a.offset - b.offset;
        // All "end" points should go before "start" points.
        if (a.type !== b.type)
            return b.type - a.type;
        const aLength = a.range.endOffset - a.range.startOffset;
        const bLength = b.range.endOffset - b.range.startOffset;
        // For two "start" points, the one with longer range goes first.
        if (a.type === 0)
            return bLength - aLength;
        // For two "end" points, the one with shorter range goes first.
        return aLength - bLength;
    });
    const hitCountStack = [];
    const results = [];
    let lastOffset = 0;
    // Run scanning line to intersect all ranges.
    for (const point of points) {
        if (hitCountStack.length &&
            lastOffset < point.offset &&
            hitCountStack[hitCountStack.length - 1] > 0) {
            const lastResult = results.length ? results[results.length - 1] : null;
            if (lastResult && lastResult.end === lastOffset)
                lastResult.end = point.offset;
            else
                results.push({ start: lastOffset, end: point.offset });
        }
        lastOffset = point.offset;
        if (point.type === 0)
            hitCountStack.push(point.range.count);
        else
            hitCountStack.pop();
    }
    // Filter out empty ranges.
    return results.filter((range) => range.end - range.start > 1);
}

},{"./ExecutionContext.js":29,"./assert.js":50,"./helper.js":52}],22:[function(require,module,exports){
"use strict";
/**
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaitTask = exports.DOMWorld = void 0;
const assert_js_1 = require("./assert.js");
const helper_js_1 = require("./helper.js");
const LifecycleWatcher_js_1 = require("./LifecycleWatcher.js");
const Errors_js_1 = require("./Errors.js");
const QueryHandler_js_1 = require("./QueryHandler.js");
const environment_js_1 = require("../environment.js");
/**
 * @internal
 */
class DOMWorld {
    constructor(client, frameManager, frame, timeoutSettings) {
        this._documentPromise = null;
        this._contextPromise = null;
        this._contextResolveCallback = null;
        this._detached = false;
        /**
         * @internal
         */
        this._waitTasks = new Set();
        /**
         * @internal
         * Contains mapping from functions that should be bound to Puppeteer functions.
         */
        this._boundFunctions = new Map();
        // Set of bindings that have been registered in the current context.
        this._ctxBindings = new Set();
        // If multiple waitFor are set up asynchronously, we need to wait for the
        // first one to set up the binding in the page before running the others.
        this._settingUpBinding = null;
        // Keep own reference to client because it might differ from the FrameManager's
        // client for OOP iframes.
        this._client = client;
        this._frameManager = frameManager;
        this._frame = frame;
        this._timeoutSettings = timeoutSettings;
        this._setContext(null);
        this._client.on('Runtime.bindingCalled', (event) => this._onBindingCalled(event));
    }
    frame() {
        return this._frame;
    }
    async _setContext(context) {
        if (context) {
            (0, assert_js_1.assert)(this._contextResolveCallback, 'Execution Context has already been set.');
            this._ctxBindings.clear();
            this._contextResolveCallback.call(null, context);
            this._contextResolveCallback = null;
            for (const waitTask of this._waitTasks)
                waitTask.rerun();
        }
        else {
            this._documentPromise = null;
            this._contextPromise = new Promise((fulfill) => {
                this._contextResolveCallback = fulfill;
            });
        }
    }
    _hasContext() {
        return !this._contextResolveCallback;
    }
    _detach() {
        this._detached = true;
        for (const waitTask of this._waitTasks)
            waitTask.terminate(new Error('waitForFunction failed: frame got detached.'));
    }
    executionContext() {
        if (this._detached)
            throw new Error(`Execution context is not available in detached frame "${this._frame.url()}" (are you trying to evaluate?)`);
        return this._contextPromise;
    }
    async evaluateHandle(pageFunction, ...args) {
        const context = await this.executionContext();
        return context.evaluateHandle(pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        const context = await this.executionContext();
        return context.evaluate(pageFunction, ...args);
    }
    async $(selector) {
        const document = await this._document();
        const value = await document.$(selector);
        return value;
    }
    async _document() {
        if (this._documentPromise)
            return this._documentPromise;
        this._documentPromise = this.executionContext().then(async (context) => {
            const document = await context.evaluateHandle('document');
            return document.asElement();
        });
        return this._documentPromise;
    }
    async $x(expression) {
        const document = await this._document();
        const value = await document.$x(expression);
        return value;
    }
    async $eval(selector, pageFunction, ...args) {
        const document = await this._document();
        return document.$eval(selector, pageFunction, ...args);
    }
    async $$eval(selector, pageFunction, ...args) {
        const document = await this._document();
        const value = await document.$$eval(selector, pageFunction, ...args);
        return value;
    }
    async $$(selector) {
        const document = await this._document();
        const value = await document.$$(selector);
        return value;
    }
    async content() {
        return await this.evaluate(() => {
            let retVal = '';
            if (document.doctype)
                retVal = new XMLSerializer().serializeToString(document.doctype);
            if (document.documentElement)
                retVal += document.documentElement.outerHTML;
            return retVal;
        });
    }
    async setContent(html, options = {}) {
        const { waitUntil = ['load'], timeout = this._timeoutSettings.navigationTimeout(), } = options;
        // We rely upon the fact that document.open() will reset frame lifecycle with "init"
        // lifecycle event. @see https://crrev.com/608658
        await this.evaluate((html) => {
            document.open();
            document.write(html);
            document.close();
        }, html);
        const watcher = new LifecycleWatcher_js_1.LifecycleWatcher(this._frameManager, this._frame, waitUntil, timeout);
        const error = await Promise.race([
            watcher.timeoutOrTerminationPromise(),
            watcher.lifecyclePromise(),
        ]);
        watcher.dispose();
        if (error)
            throw error;
    }
    /**
     * Adds a script tag into the current context.
     *
     * @remarks
     *
     * You can pass a URL, filepath or string of contents. Note that when running Puppeteer
     * in a browser environment you cannot pass a filepath and should use either
     * `url` or `content`.
     */
    async addScriptTag(options) {
        const { url = null, path = null, content = null, id = '', type = '', } = options;
        if (url !== null) {
            try {
                const context = await this.executionContext();
                return (await context.evaluateHandle(addScriptUrl, url, id, type)).asElement();
            }
            catch (error) {
                throw new Error(`Loading script from ${url} failed`);
            }
        }
        if (path !== null) {
            if (!environment_js_1.isNode) {
                throw new Error('Cannot pass a filepath to addScriptTag in the browser environment.');
            }
            const fs = await helper_js_1.helper.importFSModule();
            let contents = await fs.promises.readFile(path, 'utf8');
            contents += '//# sourceURL=' + path.replace(/\n/g, '');
            const context = await this.executionContext();
            return (await context.evaluateHandle(addScriptContent, contents, id, type)).asElement();
        }
        if (content !== null) {
            const context = await this.executionContext();
            return (await context.evaluateHandle(addScriptContent, content, id, type)).asElement();
        }
        throw new Error('Provide an object with a `url`, `path` or `content` property');
        async function addScriptUrl(url, id, type) {
            const script = document.createElement('script');
            script.src = url;
            if (id)
                script.id = id;
            if (type)
                script.type = type;
            const promise = new Promise((res, rej) => {
                script.onload = res;
                script.onerror = rej;
            });
            document.head.appendChild(script);
            await promise;
            return script;
        }
        function addScriptContent(content, id, type = 'text/javascript') {
            const script = document.createElement('script');
            script.type = type;
            script.text = content;
            if (id)
                script.id = id;
            let error = null;
            script.onerror = (e) => (error = e);
            document.head.appendChild(script);
            if (error)
                throw error;
            return script;
        }
    }
    /**
     * Adds a style tag into the current context.
     *
     * @remarks
     *
     * You can pass a URL, filepath or string of contents. Note that when running Puppeteer
     * in a browser environment you cannot pass a filepath and should use either
     * `url` or `content`.
     *
     */
    async addStyleTag(options) {
        const { url = null, path = null, content = null } = options;
        if (url !== null) {
            try {
                const context = await this.executionContext();
                return (await context.evaluateHandle(addStyleUrl, url)).asElement();
            }
            catch (error) {
                throw new Error(`Loading style from ${url} failed`);
            }
        }
        if (path !== null) {
            if (!environment_js_1.isNode) {
                throw new Error('Cannot pass a filepath to addStyleTag in the browser environment.');
            }
            const fs = await helper_js_1.helper.importFSModule();
            let contents = await fs.promises.readFile(path, 'utf8');
            contents += '/*# sourceURL=' + path.replace(/\n/g, '') + '*/';
            const context = await this.executionContext();
            return (await context.evaluateHandle(addStyleContent, contents)).asElement();
        }
        if (content !== null) {
            const context = await this.executionContext();
            return (await context.evaluateHandle(addStyleContent, content)).asElement();
        }
        throw new Error('Provide an object with a `url`, `path` or `content` property');
        async function addStyleUrl(url) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            const promise = new Promise((res, rej) => {
                link.onload = res;
                link.onerror = rej;
            });
            document.head.appendChild(link);
            await promise;
            return link;
        }
        async function addStyleContent(content) {
            const style = document.createElement('style');
            style.type = 'text/css';
            style.appendChild(document.createTextNode(content));
            const promise = new Promise((res, rej) => {
                style.onload = res;
                style.onerror = rej;
            });
            document.head.appendChild(style);
            await promise;
            return style;
        }
    }
    async click(selector, options) {
        const handle = await this.$(selector);
        (0, assert_js_1.assert)(handle, 'No node found for selector: ' + selector);
        await handle.click(options);
        await handle.dispose();
    }
    async focus(selector) {
        const handle = await this.$(selector);
        (0, assert_js_1.assert)(handle, 'No node found for selector: ' + selector);
        await handle.focus();
        await handle.dispose();
    }
    async hover(selector) {
        const handle = await this.$(selector);
        (0, assert_js_1.assert)(handle, 'No node found for selector: ' + selector);
        await handle.hover();
        await handle.dispose();
    }
    async select(selector, ...values) {
        const handle = await this.$(selector);
        (0, assert_js_1.assert)(handle, 'No node found for selector: ' + selector);
        const result = await handle.select(...values);
        await handle.dispose();
        return result;
    }
    async tap(selector) {
        const handle = await this.$(selector);
        await handle.tap();
        await handle.dispose();
    }
    async type(selector, text, options) {
        const handle = await this.$(selector);
        (0, assert_js_1.assert)(handle, 'No node found for selector: ' + selector);
        await handle.type(text, options);
        await handle.dispose();
    }
    async waitForSelector(selector, options) {
        const { updatedSelector, queryHandler } = (0, QueryHandler_js_1.getQueryHandlerAndSelector)(selector);
        return queryHandler.waitFor(this, updatedSelector, options);
    }
    /**
     * @internal
     */
    async addBindingToContext(context, name) {
        // Previous operation added the binding so we are done.
        if (this._ctxBindings.has(DOMWorld.bindingIdentifier(name, context._contextId))) {
            return;
        }
        // Wait for other operation to finish
        if (this._settingUpBinding) {
            await this._settingUpBinding;
            return this.addBindingToContext(context, name);
        }
        const bind = async (name) => {
            const expression = helper_js_1.helper.pageBindingInitString('internal', name);
            try {
                // TODO: In theory, it would be enough to call this just once
                await context._client.send('Runtime.addBinding', {
                    name,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore The protocol definition is not up to date.
                    executionContextName: context._contextName,
                });
                await context.evaluate(expression);
            }
            catch (error) {
                // We could have tried to evaluate in a context which was already
                // destroyed. This happens, for example, if the page is navigated while
                // we are trying to add the binding
                const ctxDestroyed = error.message.includes('Execution context was destroyed');
                const ctxNotFound = error.message.includes('Cannot find context with specified id');
                if (ctxDestroyed || ctxNotFound) {
                    return;
                }
                else {
                    (0, helper_js_1.debugError)(error);
                    return;
                }
            }
            this._ctxBindings.add(DOMWorld.bindingIdentifier(name, context._contextId));
        };
        this._settingUpBinding = bind(name);
        await this._settingUpBinding;
        this._settingUpBinding = null;
    }
    async _onBindingCalled(event) {
        let payload;
        if (!this._hasContext())
            return;
        const context = await this.executionContext();
        try {
            payload = JSON.parse(event.payload);
        }
        catch {
            // The binding was either called by something in the page or it was
            // called before our wrapper was initialized.
            return;
        }
        const { type, name, seq, args } = payload;
        if (type !== 'internal' ||
            !this._ctxBindings.has(DOMWorld.bindingIdentifier(name, context._contextId)))
            return;
        if (context._contextId !== event.executionContextId)
            return;
        try {
            const result = await this._boundFunctions.get(name)(...args);
            await context.evaluate(deliverResult, name, seq, result);
        }
        catch (error) {
            // The WaitTask may already have been resolved by timing out, or the
            // exection context may have been destroyed.
            // In both caes, the promises above are rejected with a protocol error.
            // We can safely ignores these, as the WaitTask is re-installed in
            // the next execution context if needed.
            if (error.message.includes('Protocol error'))
                return;
            (0, helper_js_1.debugError)(error);
        }
        function deliverResult(name, seq, result) {
            globalThis[name].callbacks.get(seq).resolve(result);
            globalThis[name].callbacks.delete(seq);
        }
    }
    /**
     * @internal
     */
    async waitForSelectorInPage(queryOne, selector, options, binding) {
        const { visible: waitForVisible = false, hidden: waitForHidden = false, timeout = this._timeoutSettings.timeout(), } = options;
        const polling = waitForVisible || waitForHidden ? 'raf' : 'mutation';
        const title = `selector \`${selector}\`${waitForHidden ? ' to be hidden' : ''}`;
        async function predicate(selector, waitForVisible, waitForHidden) {
            const node = predicateQueryHandler
                ? (await predicateQueryHandler(document, selector))
                : document.querySelector(selector);
            return checkWaitForOptions(node, waitForVisible, waitForHidden);
        }
        const waitTaskOptions = {
            domWorld: this,
            predicateBody: helper_js_1.helper.makePredicateString(predicate, queryOne),
            title,
            polling,
            timeout,
            args: [selector, waitForVisible, waitForHidden],
            binding,
        };
        const waitTask = new WaitTask(waitTaskOptions);
        const jsHandle = await waitTask.promise;
        const elementHandle = jsHandle.asElement();
        if (!elementHandle) {
            await jsHandle.dispose();
            return null;
        }
        return elementHandle;
    }
    async waitForXPath(xpath, options) {
        const { visible: waitForVisible = false, hidden: waitForHidden = false, timeout = this._timeoutSettings.timeout(), } = options;
        const polling = waitForVisible || waitForHidden ? 'raf' : 'mutation';
        const title = `XPath \`${xpath}\`${waitForHidden ? ' to be hidden' : ''}`;
        function predicate(xpath, waitForVisible, waitForHidden) {
            const node = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            return checkWaitForOptions(node, waitForVisible, waitForHidden);
        }
        const waitTaskOptions = {
            domWorld: this,
            predicateBody: helper_js_1.helper.makePredicateString(predicate),
            title,
            polling,
            timeout,
            args: [xpath, waitForVisible, waitForHidden],
        };
        const waitTask = new WaitTask(waitTaskOptions);
        const jsHandle = await waitTask.promise;
        const elementHandle = jsHandle.asElement();
        if (!elementHandle) {
            await jsHandle.dispose();
            return null;
        }
        return elementHandle;
    }
    waitForFunction(pageFunction, options = {}, ...args) {
        const { polling = 'raf', timeout = this._timeoutSettings.timeout() } = options;
        const waitTaskOptions = {
            domWorld: this,
            predicateBody: pageFunction,
            title: 'function',
            polling,
            timeout,
            args,
        };
        const waitTask = new WaitTask(waitTaskOptions);
        return waitTask.promise;
    }
    async title() {
        return this.evaluate(() => document.title);
    }
}
exports.DOMWorld = DOMWorld;
DOMWorld.bindingIdentifier = (name, contextId) => `${name}_${contextId}`;
/**
 * @internal
 */
class WaitTask {
    constructor(options) {
        this._runCount = 0;
        this._terminated = false;
        if (helper_js_1.helper.isString(options.polling))
            (0, assert_js_1.assert)(options.polling === 'raf' || options.polling === 'mutation', 'Unknown polling option: ' + options.polling);
        else if (helper_js_1.helper.isNumber(options.polling))
            (0, assert_js_1.assert)(options.polling > 0, 'Cannot poll with non-positive interval: ' + options.polling);
        else
            throw new Error('Unknown polling options: ' + options.polling);
        function getPredicateBody(predicateBody) {
            if (helper_js_1.helper.isString(predicateBody))
                return `return (${predicateBody});`;
            return `return (${predicateBody})(...args);`;
        }
        this._domWorld = options.domWorld;
        this._polling = options.polling;
        this._timeout = options.timeout;
        this._predicateBody = getPredicateBody(options.predicateBody);
        this._args = options.args;
        this._binding = options.binding;
        this._runCount = 0;
        this._domWorld._waitTasks.add(this);
        if (this._binding) {
            this._domWorld._boundFunctions.set(this._binding.name, this._binding.pptrFunction);
        }
        this.promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
        // Since page navigation requires us to re-install the pageScript, we should track
        // timeout on our end.
        if (options.timeout) {
            const timeoutError = new Errors_js_1.TimeoutError(`waiting for ${options.title} failed: timeout ${options.timeout}ms exceeded`);
            this._timeoutTimer = setTimeout(() => this.terminate(timeoutError), options.timeout);
        }
        this.rerun();
    }
    terminate(error) {
        this._terminated = true;
        this._reject(error);
        this._cleanup();
    }
    async rerun() {
        const runCount = ++this._runCount;
        let success = null;
        let error = null;
        const context = await this._domWorld.executionContext();
        if (this._terminated || runCount !== this._runCount)
            return;
        if (this._binding) {
            await this._domWorld.addBindingToContext(context, this._binding.name);
        }
        if (this._terminated || runCount !== this._runCount)
            return;
        try {
            success = await context.evaluateHandle(waitForPredicatePageFunction, this._predicateBody, this._polling, this._timeout, ...this._args);
        }
        catch (error_) {
            error = error_;
        }
        if (this._terminated || runCount !== this._runCount) {
            if (success)
                await success.dispose();
            return;
        }
        // Ignore timeouts in pageScript - we track timeouts ourselves.
        // If the frame's execution context has already changed, `frame.evaluate` will
        // throw an error - ignore this predicate run altogether.
        if (!error &&
            (await this._domWorld.evaluate((s) => !s, success).catch(() => true))) {
            await success.dispose();
            return;
        }
        if (error) {
            if (error.message.includes('TypeError: binding is not a function')) {
                return this.rerun();
            }
            // When frame is detached the task should have been terminated by the DOMWorld.
            // This can fail if we were adding this task while the frame was detached,
            // so we terminate here instead.
            if (error.message.includes('Execution context is not available in detached frame')) {
                this.terminate(new Error('waitForFunction failed: frame got detached.'));
                return;
            }
            // When the page is navigated, the promise is rejected.
            // We will try again in the new execution context.
            if (error.message.includes('Execution context was destroyed'))
                return;
            // We could have tried to evaluate in a context which was already
            // destroyed.
            if (error.message.includes('Cannot find context with specified id'))
                return;
            this._reject(error);
        }
        else {
            this._resolve(success);
        }
        this._cleanup();
    }
    _cleanup() {
        clearTimeout(this._timeoutTimer);
        this._domWorld._waitTasks.delete(this);
    }
}
exports.WaitTask = WaitTask;
async function waitForPredicatePageFunction(predicateBody, polling, timeout, ...args) {
    const predicate = new Function('...args', predicateBody);
    let timedOut = false;
    if (timeout)
        setTimeout(() => (timedOut = true), timeout);
    if (polling === 'raf')
        return await pollRaf();
    if (polling === 'mutation')
        return await pollMutation();
    if (typeof polling === 'number')
        return await pollInterval(polling);
    /**
     * @returns {!Promise<*>}
     */
    async function pollMutation() {
        const success = await predicate(...args);
        if (success)
            return Promise.resolve(success);
        let fulfill;
        const result = new Promise((x) => (fulfill = x));
        const observer = new MutationObserver(async () => {
            if (timedOut) {
                observer.disconnect();
                fulfill();
            }
            const success = await predicate(...args);
            if (success) {
                observer.disconnect();
                fulfill(success);
            }
        });
        observer.observe(document, {
            childList: true,
            subtree: true,
            attributes: true,
        });
        return result;
    }
    async function pollRaf() {
        let fulfill;
        const result = new Promise((x) => (fulfill = x));
        await onRaf();
        return result;
        async function onRaf() {
            if (timedOut) {
                fulfill();
                return;
            }
            const success = await predicate(...args);
            if (success)
                fulfill(success);
            else
                requestAnimationFrame(onRaf);
        }
    }
    async function pollInterval(pollInterval) {
        let fulfill;
        const result = new Promise((x) => (fulfill = x));
        await onTimeout();
        return result;
        async function onTimeout() {
            if (timedOut) {
                fulfill();
                return;
            }
            const success = await predicate(...args);
            if (success)
                fulfill(success);
            else
                setTimeout(onTimeout, pollInterval);
        }
    }
}

},{"../environment.js":53,"./Errors.js":27,"./LifecycleWatcher.js":36,"./QueryHandler.js":42,"./assert.js":50,"./helper.js":52}],23:[function(require,module,exports){
"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = void 0;
const environment_js_1 = require("../environment.js");
/**
 * A debug function that can be used in any environment.
 *
 * @remarks
 *
 * If used in Node, it falls back to the
 * {@link https://www.npmjs.com/package/debug | debug module}. In the browser it
 * uses `console.log`.
 *
 * @param prefix - this will be prefixed to each log.
 * @returns a function that can be called to log to that debug channel.
 *
 * In Node, use the `DEBUG` environment variable to control logging:
 *
 * ```
 * DEBUG=* // logs all channels
 * DEBUG=foo // logs the `foo` channel
 * DEBUG=foo* // logs any channels starting with `foo`
 * ```
 *
 * In the browser, set `window.__PUPPETEER_DEBUG` to a string:
 *
 * ```
 * window.__PUPPETEER_DEBUG='*'; // logs all channels
 * window.__PUPPETEER_DEBUG='foo'; // logs the `foo` channel
 * window.__PUPPETEER_DEBUG='foo*'; // logs any channels starting with `foo`
 * ```
 *
 * @example
 * ```
 * const log = debug('Page');
 *
 * log('new page created')
 * // logs "Page: new page created"
 * ```
 */
const debug = (prefix) => {
    if (environment_js_1.isNode) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require('debug')(prefix);
    }
    return (...logArgs) => {
        const debugLevel = globalThis.__PUPPETEER_DEBUG;
        if (!debugLevel)
            return;
        const everythingShouldBeLogged = debugLevel === '*';
        const prefixMatchesDebugLevel = everythingShouldBeLogged ||
            /**
             * If the debug level is `foo*`, that means we match any prefix that
             * starts with `foo`. If the level is `foo`, we match only the prefix
             * `foo`.
             */
            (debugLevel.endsWith('*')
                ? prefix.startsWith(debugLevel)
                : prefix === debugLevel);
        if (!prefixMatchesDebugLevel)
            return;
        // eslint-disable-next-line no-console
        console.log(`${prefix}:`, ...logArgs);
    };
};
exports.debug = debug;

},{"../environment.js":53,"debug":58}],24:[function(require,module,exports){
"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.devicesMap = void 0;
const devices = [
    {
        name: 'Blackberry PlayBook',
        userAgent: 'Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML like Gecko) Version/7.2.1.0 Safari/536.2+',
        viewport: {
            width: 600,
            height: 1024,
            deviceScaleFactor: 1,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Blackberry PlayBook landscape',
        userAgent: 'Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML like Gecko) Version/7.2.1.0 Safari/536.2+',
        viewport: {
            width: 1024,
            height: 600,
            deviceScaleFactor: 1,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'BlackBerry Z30',
        userAgent: 'Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+',
        viewport: {
            width: 360,
            height: 640,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'BlackBerry Z30 landscape',
        userAgent: 'Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+',
        viewport: {
            width: 640,
            height: 360,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Galaxy Note 3',
        userAgent: 'Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-N900T Build/JSS15J) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        viewport: {
            width: 360,
            height: 640,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Galaxy Note 3 landscape',
        userAgent: 'Mozilla/5.0 (Linux; U; Android 4.3; en-us; SM-N900T Build/JSS15J) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        viewport: {
            width: 640,
            height: 360,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Galaxy Note II',
        userAgent: 'Mozilla/5.0 (Linux; U; Android 4.1; en-us; GT-N7100 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        viewport: {
            width: 360,
            height: 640,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Galaxy Note II landscape',
        userAgent: 'Mozilla/5.0 (Linux; U; Android 4.1; en-us; GT-N7100 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        viewport: {
            width: 640,
            height: 360,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Galaxy S III',
        userAgent: 'Mozilla/5.0 (Linux; U; Android 4.0; en-us; GT-I9300 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        viewport: {
            width: 360,
            height: 640,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Galaxy S III landscape',
        userAgent: 'Mozilla/5.0 (Linux; U; Android 4.0; en-us; GT-I9300 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        viewport: {
            width: 640,
            height: 360,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Galaxy S5',
        userAgent: 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 360,
            height: 640,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Galaxy S5 landscape',
        userAgent: 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 640,
            height: 360,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Galaxy S8',
        userAgent: 'Mozilla/5.0 (Linux; Android 7.0; SM-G950U Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36',
        viewport: {
            width: 360,
            height: 740,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Galaxy S8 landscape',
        userAgent: 'Mozilla/5.0 (Linux; Android 7.0; SM-G950U Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36',
        viewport: {
            width: 740,
            height: 360,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Galaxy S9+',
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; SM-G965U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.111 Mobile Safari/537.36',
        viewport: {
            width: 320,
            height: 658,
            deviceScaleFactor: 4.5,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Galaxy S9+ landscape',
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; SM-G965U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.111 Mobile Safari/537.36',
        viewport: {
            width: 658,
            height: 320,
            deviceScaleFactor: 4.5,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Galaxy Tab S4',
        userAgent: 'Mozilla/5.0 (Linux; Android 8.1.0; SM-T837A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.80 Safari/537.36',
        viewport: {
            width: 712,
            height: 1138,
            deviceScaleFactor: 2.25,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Galaxy Tab S4 landscape',
        userAgent: 'Mozilla/5.0 (Linux; Android 8.1.0; SM-T837A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.80 Safari/537.36',
        viewport: {
            width: 1138,
            height: 712,
            deviceScaleFactor: 2.25,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPad',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
        viewport: {
            width: 768,
            height: 1024,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPad landscape',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
        viewport: {
            width: 1024,
            height: 768,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPad Mini',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
        viewport: {
            width: 768,
            height: 1024,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPad Mini landscape',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
        viewport: {
            width: 1024,
            height: 768,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPad Pro',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
        viewport: {
            width: 1024,
            height: 1366,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPad Pro landscape',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
        viewport: {
            width: 1366,
            height: 1024,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPhone 4',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 7_1_2 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Version/7.0 Mobile/11D257 Safari/9537.53',
        viewport: {
            width: 320,
            height: 480,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPhone 4 landscape',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 7_1_2 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Version/7.0 Mobile/11D257 Safari/9537.53',
        viewport: {
            width: 480,
            height: 320,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPhone 5',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1',
        viewport: {
            width: 320,
            height: 568,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPhone 5 landscape',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1',
        viewport: {
            width: 568,
            height: 320,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPhone 6',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPhone 6 landscape',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 667,
            height: 375,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPhone 6 Plus',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 414,
            height: 736,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPhone 6 Plus landscape',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 736,
            height: 414,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPhone 7',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPhone 7 landscape',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 667,
            height: 375,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPhone 7 Plus',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 414,
            height: 736,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPhone 7 Plus landscape',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 736,
            height: 414,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPhone 8',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPhone 8 landscape',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 667,
            height: 375,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPhone 8 Plus',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 414,
            height: 736,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPhone 8 Plus landscape',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 736,
            height: 414,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPhone SE',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1',
        viewport: {
            width: 320,
            height: 568,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPhone SE landscape',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1',
        viewport: {
            width: 568,
            height: 320,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPhone X',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 375,
            height: 812,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPhone X landscape',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        viewport: {
            width: 812,
            height: 375,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPhone XR',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
        viewport: {
            width: 414,
            height: 896,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPhone XR landscape',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
        viewport: {
            width: 896,
            height: 414,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPhone 11',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1',
        viewport: {
            width: 414,
            height: 828,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPhone 11 landscape',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1',
        viewport: {
            width: 828,
            height: 414,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPhone 11 Pro',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1',
        viewport: {
            width: 375,
            height: 812,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPhone 11 Pro landscape',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1',
        viewport: {
            width: 812,
            height: 375,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'iPhone 11 Pro Max',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1',
        viewport: {
            width: 414,
            height: 896,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'iPhone 11 Pro Max landscape',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1',
        viewport: {
            width: 896,
            height: 414,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'JioPhone 2',
        userAgent: 'Mozilla/5.0 (Mobile; LYF/F300B/LYF-F300B-001-01-15-130718-i;Android; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5',
        viewport: {
            width: 240,
            height: 320,
            deviceScaleFactor: 1,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'JioPhone 2 landscape',
        userAgent: 'Mozilla/5.0 (Mobile; LYF/F300B/LYF-F300B-001-01-15-130718-i;Android; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5',
        viewport: {
            width: 320,
            height: 240,
            deviceScaleFactor: 1,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Kindle Fire HDX',
        userAgent: 'Mozilla/5.0 (Linux; U; en-us; KFAPWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true',
        viewport: {
            width: 800,
            height: 1280,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Kindle Fire HDX landscape',
        userAgent: 'Mozilla/5.0 (Linux; U; en-us; KFAPWI Build/JDQ39) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true',
        viewport: {
            width: 1280,
            height: 800,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'LG Optimus L70',
        userAgent: 'Mozilla/5.0 (Linux; U; Android 4.4.2; en-us; LGMS323 Build/KOT49I.MS32310c) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 384,
            height: 640,
            deviceScaleFactor: 1.25,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'LG Optimus L70 landscape',
        userAgent: 'Mozilla/5.0 (Linux; U; Android 4.4.2; en-us; LGMS323 Build/KOT49I.MS32310c) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 640,
            height: 384,
            deviceScaleFactor: 1.25,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Microsoft Lumia 550',
        userAgent: 'Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 550) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/14.14263',
        viewport: {
            width: 640,
            height: 360,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Microsoft Lumia 950',
        userAgent: 'Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/14.14263',
        viewport: {
            width: 360,
            height: 640,
            deviceScaleFactor: 4,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Microsoft Lumia 950 landscape',
        userAgent: 'Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/14.14263',
        viewport: {
            width: 640,
            height: 360,
            deviceScaleFactor: 4,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Nexus 10',
        userAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 10 Build/MOB31T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Safari/537.36',
        viewport: {
            width: 800,
            height: 1280,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Nexus 10 landscape',
        userAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 10 Build/MOB31T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Safari/537.36',
        viewport: {
            width: 1280,
            height: 800,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Nexus 4',
        userAgent: 'Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 384,
            height: 640,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Nexus 4 landscape',
        userAgent: 'Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 640,
            height: 384,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Nexus 5',
        userAgent: 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 360,
            height: 640,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Nexus 5 landscape',
        userAgent: 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 640,
            height: 360,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Nexus 5X',
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5X Build/OPR4.170623.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 412,
            height: 732,
            deviceScaleFactor: 2.625,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Nexus 5X landscape',
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5X Build/OPR4.170623.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 732,
            height: 412,
            deviceScaleFactor: 2.625,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Nexus 6',
        userAgent: 'Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6 Build/N6F26U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 412,
            height: 732,
            deviceScaleFactor: 3.5,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Nexus 6 landscape',
        userAgent: 'Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6 Build/N6F26U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 732,
            height: 412,
            deviceScaleFactor: 3.5,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Nexus 6P',
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; Nexus 6P Build/OPP3.170518.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 412,
            height: 732,
            deviceScaleFactor: 3.5,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Nexus 6P landscape',
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; Nexus 6P Build/OPP3.170518.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 732,
            height: 412,
            deviceScaleFactor: 3.5,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Nexus 7',
        userAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Safari/537.36',
        viewport: {
            width: 600,
            height: 960,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Nexus 7 landscape',
        userAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Safari/537.36',
        viewport: {
            width: 960,
            height: 600,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Nokia Lumia 520',
        userAgent: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 520)',
        viewport: {
            width: 320,
            height: 533,
            deviceScaleFactor: 1.5,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Nokia Lumia 520 landscape',
        userAgent: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 520)',
        viewport: {
            width: 533,
            height: 320,
            deviceScaleFactor: 1.5,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Nokia N9',
        userAgent: 'Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13',
        viewport: {
            width: 480,
            height: 854,
            deviceScaleFactor: 1,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Nokia N9 landscape',
        userAgent: 'Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13',
        viewport: {
            width: 854,
            height: 480,
            deviceScaleFactor: 1,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Pixel 2',
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 411,
            height: 731,
            deviceScaleFactor: 2.625,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Pixel 2 landscape',
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 731,
            height: 411,
            deviceScaleFactor: 2.625,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Pixel 2 XL',
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 411,
            height: 823,
            deviceScaleFactor: 3.5,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Pixel 2 XL landscape',
        userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3765.0 Mobile Safari/537.36',
        viewport: {
            width: 823,
            height: 411,
            deviceScaleFactor: 3.5,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Pixel 3',
        userAgent: 'Mozilla/5.0 (Linux; Android 9; Pixel 3 Build/PQ1A.181105.017.A1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.158 Mobile Safari/537.36',
        viewport: {
            width: 393,
            height: 786,
            deviceScaleFactor: 2.75,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Pixel 3 landscape',
        userAgent: 'Mozilla/5.0 (Linux; Android 9; Pixel 3 Build/PQ1A.181105.017.A1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.158 Mobile Safari/537.36',
        viewport: {
            width: 786,
            height: 393,
            deviceScaleFactor: 2.75,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
    {
        name: 'Pixel 4',
        userAgent: 'Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36',
        viewport: {
            width: 353,
            height: 745,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
        },
    },
    {
        name: 'Pixel 4 landscape',
        userAgent: 'Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36',
        viewport: {
            width: 745,
            height: 353,
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            isLandscape: true,
        },
    },
];
/**
 * @internal
 */
exports.devicesMap = {};
for (const device of devices)
    exports.devicesMap[device.name] = device;

},{}],25:[function(require,module,exports){
"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dialog = void 0;
const assert_js_1 = require("./assert.js");
/**
 * Dialog instances are dispatched by the {@link Page} via the `dialog` event.
 *
 * @remarks
 *
 * @example
 * ```js
 * const puppeteer = require('puppeteer');
 *
 * (async () => {
 *   const browser = await puppeteer.launch();
 *   const page = await browser.newPage();
 *   page.on('dialog', async dialog => {
 *     console.log(dialog.message());
 *     await dialog.dismiss();
 *     await browser.close();
 *   });
 *   page.evaluate(() => alert('1'));
 * })();
 * ```
 * @public
 */
class Dialog {
    /**
     * @internal
     */
    constructor(client, type, message, defaultValue = '') {
        this._handled = false;
        this._client = client;
        this._type = type;
        this._message = message;
        this._defaultValue = defaultValue;
    }
    /**
     * @returns The type of the dialog.
     */
    type() {
        return this._type;
    }
    /**
     * @returns The message displayed in the dialog.
     */
    message() {
        return this._message;
    }
    /**
     * @returns The default value of the prompt, or an empty string if the dialog
     * is not a `prompt`.
     */
    defaultValue() {
        return this._defaultValue;
    }
    /**
     * @param promptText - optional text that will be entered in the dialog
     * prompt. Has no effect if the dialog's type is not `prompt`.
     *
     * @returns A promise that resolves when the dialog has been accepted.
     */
    async accept(promptText) {
        (0, assert_js_1.assert)(!this._handled, 'Cannot accept dialog which is already handled!');
        this._handled = true;
        await this._client.send('Page.handleJavaScriptDialog', {
            accept: true,
            promptText: promptText,
        });
    }
    /**
     * @returns A promise which will resolve once the dialog has been dismissed
     */
    async dismiss() {
        (0, assert_js_1.assert)(!this._handled, 'Cannot dismiss dialog which is already handled!');
        this._handled = true;
        await this._client.send('Page.handleJavaScriptDialog', {
            accept: false,
        });
    }
}
exports.Dialog = Dialog;

},{"./assert.js":50}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmulationManager = void 0;
class EmulationManager {
    constructor(client) {
        this._emulatingMobile = false;
        this._hasTouch = false;
        this._client = client;
    }
    async emulateViewport(viewport) {
        const mobile = viewport.isMobile || false;
        const width = viewport.width;
        const height = viewport.height;
        const deviceScaleFactor = viewport.deviceScaleFactor || 1;
        const screenOrientation = viewport.isLandscape
            ? { angle: 90, type: 'landscapePrimary' }
            : { angle: 0, type: 'portraitPrimary' };
        const hasTouch = viewport.hasTouch || false;
        await Promise.all([
            this._client.send('Emulation.setDeviceMetricsOverride', {
                mobile,
                width,
                height,
                deviceScaleFactor,
                screenOrientation,
            }),
            this._client.send('Emulation.setTouchEmulationEnabled', {
                enabled: hasTouch,
            }),
        ]);
        const reloadNeeded = this._emulatingMobile !== mobile || this._hasTouch !== hasTouch;
        this._emulatingMobile = mobile;
        this._hasTouch = hasTouch;
        return reloadNeeded;
    }
}
exports.EmulationManager = EmulationManager;

},{}],27:[function(require,module,exports){
"use strict";
/**
 * Copyright 2018 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.puppeteerErrors = exports.ProtocolError = exports.TimeoutError = exports.CustomError = void 0;
/**
 * @public
 */
class CustomError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.CustomError = CustomError;
/**
 * TimeoutError is emitted whenever certain operations are terminated due to timeout.
 *
 * @remarks
 *
 * Example operations are {@link Page.waitForSelector | page.waitForSelector}
 * or {@link PuppeteerNode.launch | puppeteer.launch}.
 *
 * @public
 */
class TimeoutError extends CustomError {
}
exports.TimeoutError = TimeoutError;
/**
 * ProtocolError is emitted whenever there is an error from the protocol.
 *
 * @public
 */
class ProtocolError extends CustomError {
}
exports.ProtocolError = ProtocolError;
/**
 * @public
 */
exports.puppeteerErrors = {
    TimeoutError,
};

},{}],28:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = void 0;
const index_js_1 = __importDefault(require("../../vendor/mitt/src/index.js"));
/**
 * The EventEmitter class that many Puppeteer classes extend.
 *
 * @remarks
 *
 * This allows you to listen to events that Puppeteer classes fire and act
 * accordingly. Therefore you'll mostly use {@link EventEmitter.on | on} and
 * {@link EventEmitter.off | off} to bind
 * and unbind to event listeners.
 *
 * @public
 */
class EventEmitter {
    /**
     * @internal
     */
    constructor() {
        this.eventsMap = new Map();
        this.emitter = (0, index_js_1.default)(this.eventsMap);
    }
    /**
     * Bind an event listener to fire when an event occurs.
     * @param event - the event type you'd like to listen to. Can be a string or symbol.
     * @param handler  - the function to be called when the event occurs.
     * @returns `this` to enable you to chain method calls.
     */
    on(event, handler) {
        this.emitter.on(event, handler);
        return this;
    }
    /**
     * Remove an event listener from firing.
     * @param event - the event type you'd like to stop listening to.
     * @param handler  - the function that should be removed.
     * @returns `this` to enable you to chain method calls.
     */
    off(event, handler) {
        this.emitter.off(event, handler);
        return this;
    }
    /**
     * Remove an event listener.
     * @deprecated please use {@link EventEmitter.off} instead.
     */
    removeListener(event, handler) {
        this.off(event, handler);
        return this;
    }
    /**
     * Add an event listener.
     * @deprecated please use {@link EventEmitter.on} instead.
     */
    addListener(event, handler) {
        this.on(event, handler);
        return this;
    }
    /**
     * Emit an event and call any associated listeners.
     *
     * @param event - the event you'd like to emit
     * @param eventData - any data you'd like to emit with the event
     * @returns `true` if there are any listeners, `false` if there are not.
     */
    emit(event, eventData) {
        this.emitter.emit(event, eventData);
        return this.eventListenersCount(event) > 0;
    }
    /**
     * Like `on` but the listener will only be fired once and then it will be removed.
     * @param event - the event you'd like to listen to
     * @param handler - the handler function to run when the event occurs
     * @returns `this` to enable you to chain method calls.
     */
    once(event, handler) {
        const onceHandler = (eventData) => {
            handler(eventData);
            this.off(event, onceHandler);
        };
        return this.on(event, onceHandler);
    }
    /**
     * Gets the number of listeners for a given event.
     *
     * @param event - the event to get the listener count for
     * @returns the number of listeners bound to the given event
     */
    listenerCount(event) {
        return this.eventListenersCount(event);
    }
    /**
     * Removes all listeners. If given an event argument, it will remove only
     * listeners for that event.
     * @param event - the event to remove listeners for.
     * @returns `this` to enable you to chain method calls.
     */
    removeAllListeners(event) {
        if (event) {
            this.eventsMap.delete(event);
        }
        else {
            this.eventsMap.clear();
        }
        return this;
    }
    eventListenersCount(event) {
        return this.eventsMap.has(event) ? this.eventsMap.get(event).length : 0;
    }
}
exports.EventEmitter = EventEmitter;

},{"../../vendor/mitt/src/index.js":57}],29:[function(require,module,exports){
"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionContext = exports.EVALUATION_SCRIPT_URL = void 0;
const assert_js_1 = require("./assert.js");
const helper_js_1 = require("./helper.js");
const JSHandle_js_1 = require("./JSHandle.js");
/**
 * @public
 */
exports.EVALUATION_SCRIPT_URL = '__puppeteer_evaluation_script__';
const SOURCE_URL_REGEX = /^[\040\t]*\/\/[@#] sourceURL=\s*(\S*?)\s*$/m;
/**
 * This class represents a context for JavaScript execution. A [Page] might have
 * many execution contexts:
 * - each
 *   {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe |
 *   frame } has "default" execution context that is always created after frame is
 *   attached to DOM. This context is returned by the
 *   {@link Frame.executionContext} method.
 * - {@link https://developer.chrome.com/extensions | Extension}'s content scripts
 *   create additional execution contexts.
 *
 * Besides pages, execution contexts can be found in
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API |
 * workers }.
 *
 * @public
 */
class ExecutionContext {
    /**
     * @internal
     */
    constructor(client, contextPayload, world) {
        this._client = client;
        this._world = world;
        this._contextId = contextPayload.id;
        this._contextName = contextPayload.name;
    }
    /**
     * @remarks
     *
     * Not every execution context is associated with a frame. For
     * example, workers and extensions have execution contexts that are not
     * associated with frames.
     *
     * @returns The frame associated with this execution context.
     */
    frame() {
        return this._world ? this._world.frame() : null;
    }
    /**
     * @remarks
     * If the function passed to the `executionContext.evaluate` returns a
     * Promise, then `executionContext.evaluate` would wait for the promise to
     * resolve and return its value. If the function passed to the
     * `executionContext.evaluate` returns a non-serializable value, then
     * `executionContext.evaluate` resolves to `undefined`. DevTools Protocol also
     * supports transferring some additional values that are not serializable by
     * `JSON`: `-0`, `NaN`, `Infinity`, `-Infinity`, and bigint literals.
     *
     *
     * @example
     * ```js
     * const executionContext = await page.mainFrame().executionContext();
     * const result = await executionContext.evaluate(() => Promise.resolve(8 * 7))* ;
     * console.log(result); // prints "56"
     * ```
     *
     * @example
     * A string can also be passed in instead of a function.
     *
     * ```js
     * console.log(await executionContext.evaluate('1 + 2')); // prints "3"
     * ```
     *
     * @example
     * {@link JSHandle} instances can be passed as arguments to the
     * `executionContext.* evaluate`:
     * ```js
     * const oneHandle = await executionContext.evaluateHandle(() => 1);
     * const twoHandle = await executionContext.evaluateHandle(() => 2);
     * const result = await executionContext.evaluate(
     *    (a, b) => a + b, oneHandle, * twoHandle
     * );
     * await oneHandle.dispose();
     * await twoHandle.dispose();
     * console.log(result); // prints '3'.
     * ```
     * @param pageFunction - a function to be evaluated in the `executionContext`
     * @param args - argument to pass to the page function
     *
     * @returns A promise that resolves to the return value of the given function.
     */
    async evaluate(pageFunction, ...args) {
        return await this._evaluateInternal(true, pageFunction, ...args);
    }
    /**
     * @remarks
     * The only difference between `executionContext.evaluate` and
     * `executionContext.evaluateHandle` is that `executionContext.evaluateHandle`
     * returns an in-page object (a {@link JSHandle}).
     * If the function passed to the `executionContext.evaluateHandle` returns a
     * Promise, then `executionContext.evaluateHandle` would wait for the
     * promise to resolve and return its value.
     *
     * @example
     * ```js
     * const context = await page.mainFrame().executionContext();
     * const aHandle = await context.evaluateHandle(() => Promise.resolve(self));
     * aHandle; // Handle for the global object.
     * ```
     *
     * @example
     * A string can also be passed in instead of a function.
     *
     * ```js
     * // Handle for the '3' * object.
     * const aHandle = await context.evaluateHandle('1 + 2');
     * ```
     *
     * @example
     * JSHandle instances can be passed as arguments
     * to the `executionContext.* evaluateHandle`:
     *
     * ```js
     * const aHandle = await context.evaluateHandle(() => document.body);
     * const resultHandle = await context.evaluateHandle(body => body.innerHTML, * aHandle);
     * console.log(await resultHandle.jsonValue()); // prints body's innerHTML
     * await aHandle.dispose();
     * await resultHandle.dispose();
     * ```
     *
     * @param pageFunction - a function to be evaluated in the `executionContext`
     * @param args - argument to pass to the page function
     *
     * @returns A promise that resolves to the return value of the given function
     * as an in-page object (a {@link JSHandle}).
     */
    async evaluateHandle(pageFunction, ...args) {
        return this._evaluateInternal(false, pageFunction, ...args);
    }
    async _evaluateInternal(returnByValue, pageFunction, ...args) {
        const suffix = `//# sourceURL=${exports.EVALUATION_SCRIPT_URL}`;
        if (helper_js_1.helper.isString(pageFunction)) {
            const contextId = this._contextId;
            const expression = pageFunction;
            const expressionWithSourceUrl = SOURCE_URL_REGEX.test(expression)
                ? expression
                : expression + '\n' + suffix;
            const { exceptionDetails, result: remoteObject } = await this._client
                .send('Runtime.evaluate', {
                expression: expressionWithSourceUrl,
                contextId,
                returnByValue,
                awaitPromise: true,
                userGesture: true,
            })
                .catch(rewriteError);
            if (exceptionDetails)
                throw new Error('Evaluation failed: ' + helper_js_1.helper.getExceptionMessage(exceptionDetails));
            return returnByValue
                ? helper_js_1.helper.valueFromRemoteObject(remoteObject)
                : (0, JSHandle_js_1.createJSHandle)(this, remoteObject);
        }
        if (typeof pageFunction !== 'function')
            throw new Error(`Expected to get |string| or |function| as the first argument, but got "${pageFunction}" instead.`);
        let functionText = pageFunction.toString();
        try {
            new Function('(' + functionText + ')');
        }
        catch (error) {
            // This means we might have a function shorthand. Try another
            // time prefixing 'function '.
            if (functionText.startsWith('async '))
                functionText =
                    'async function ' + functionText.substring('async '.length);
            else
                functionText = 'function ' + functionText;
            try {
                new Function('(' + functionText + ')');
            }
            catch (error) {
                // We tried hard to serialize, but there's a weird beast here.
                throw new Error('Passed function is not well-serializable!');
            }
        }
        let callFunctionOnPromise;
        try {
            callFunctionOnPromise = this._client.send('Runtime.callFunctionOn', {
                functionDeclaration: functionText + '\n' + suffix + '\n',
                executionContextId: this._contextId,
                arguments: args.map(convertArgument.bind(this)),
                returnByValue,
                awaitPromise: true,
                userGesture: true,
            });
        }
        catch (error) {
            if (error instanceof TypeError &&
                error.message.startsWith('Converting circular structure to JSON'))
                error.message += ' Are you passing a nested JSHandle?';
            throw error;
        }
        const { exceptionDetails, result: remoteObject } = await callFunctionOnPromise.catch(rewriteError);
        if (exceptionDetails)
            throw new Error('Evaluation failed: ' + helper_js_1.helper.getExceptionMessage(exceptionDetails));
        return returnByValue
            ? helper_js_1.helper.valueFromRemoteObject(remoteObject)
            : (0, JSHandle_js_1.createJSHandle)(this, remoteObject);
        /**
         * @param {*} arg
         * @returns {*}
         * @this {ExecutionContext}
         */
        function convertArgument(arg) {
            if (typeof arg === 'bigint')
                // eslint-disable-line valid-typeof
                return { unserializableValue: `${arg.toString()}n` };
            if (Object.is(arg, -0))
                return { unserializableValue: '-0' };
            if (Object.is(arg, Infinity))
                return { unserializableValue: 'Infinity' };
            if (Object.is(arg, -Infinity))
                return { unserializableValue: '-Infinity' };
            if (Object.is(arg, NaN))
                return { unserializableValue: 'NaN' };
            const objectHandle = arg && arg instanceof JSHandle_js_1.JSHandle ? arg : null;
            if (objectHandle) {
                if (objectHandle._context !== this)
                    throw new Error('JSHandles can be evaluated only in the context they were created!');
                if (objectHandle._disposed)
                    throw new Error('JSHandle is disposed!');
                if (objectHandle._remoteObject.unserializableValue)
                    return {
                        unserializableValue: objectHandle._remoteObject.unserializableValue,
                    };
                if (!objectHandle._remoteObject.objectId)
                    return { value: objectHandle._remoteObject.value };
                return { objectId: objectHandle._remoteObject.objectId };
            }
            return { value: arg };
        }
        function rewriteError(error) {
            if (error.message.includes('Object reference chain is too long'))
                return { result: { type: 'undefined' } };
            if (error.message.includes("Object couldn't be returned by value"))
                return { result: { type: 'undefined' } };
            if (error.message.endsWith('Cannot find context with specified id') ||
                error.message.endsWith('Inspected target navigated or closed'))
                throw new Error('Execution context was destroyed, most likely because of a navigation.');
            throw error;
        }
    }
    /**
     * This method iterates the JavaScript heap and finds all the objects with the
     * given prototype.
     * @remarks
     * @example
     * ```js
     * // Create a Map object
     * await page.evaluate(() => window.map = new Map());
     * // Get a handle to the Map object prototype
     * const mapPrototype = await page.evaluateHandle(() => Map.prototype);
     * // Query all map instances into an array
     * const mapInstances = await page.queryObjects(mapPrototype);
     * // Count amount of map objects in heap
     * const count = await page.evaluate(maps => maps.length, mapInstances);
     * await mapInstances.dispose();
     * await mapPrototype.dispose();
     * ```
     *
     * @param prototypeHandle - a handle to the object prototype
     *
     * @returns A handle to an array of objects with the given prototype.
     */
    async queryObjects(prototypeHandle) {
        (0, assert_js_1.assert)(!prototypeHandle._disposed, 'Prototype JSHandle is disposed!');
        (0, assert_js_1.assert)(prototypeHandle._remoteObject.objectId, 'Prototype JSHandle must not be referencing primitive value');
        const response = await this._client.send('Runtime.queryObjects', {
            prototypeObjectId: prototypeHandle._remoteObject.objectId,
        });
        return (0, JSHandle_js_1.createJSHandle)(this, response.objects);
    }
    /**
     * @internal
     */
    async _adoptBackendNodeId(backendNodeId) {
        const { object } = await this._client.send('DOM.resolveNode', {
            backendNodeId: backendNodeId,
            executionContextId: this._contextId,
        });
        return (0, JSHandle_js_1.createJSHandle)(this, object);
    }
    /**
     * @internal
     */
    async _adoptElementHandle(elementHandle) {
        (0, assert_js_1.assert)(elementHandle.executionContext() !== this, 'Cannot adopt handle that already belongs to this execution context');
        (0, assert_js_1.assert)(this._world, 'Cannot adopt handle without DOMWorld');
        const nodeInfo = await this._client.send('DOM.describeNode', {
            objectId: elementHandle._remoteObject.objectId,
        });
        return this._adoptBackendNodeId(nodeInfo.node.backendNodeId);
    }
}
exports.ExecutionContext = ExecutionContext;

},{"./JSHandle.js":35,"./assert.js":50,"./helper.js":52}],30:[function(require,module,exports){
"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileChooser = void 0;
const assert_js_1 = require("./assert.js");
/**
 * File choosers let you react to the page requesting for a file.
 * @remarks
 * `FileChooser` objects are returned via the `page.waitForFileChooser` method.
 * @example
 * An example of using `FileChooser`:
 * ```js
 * const [fileChooser] = await Promise.all([
 *   page.waitForFileChooser(),
 *   page.click('#upload-file-button'), // some button that triggers file selection
 * ]);
 * await fileChooser.accept(['/tmp/myfile.pdf']);
 * ```
 * **NOTE** In browsers, only one file chooser can be opened at a time.
 * All file choosers must be accepted or canceled. Not doing so will prevent
 * subsequent file choosers from appearing.
 * @public
 */
class FileChooser {
    /**
     * @internal
     */
    constructor(element, event) {
        this._handled = false;
        this._element = element;
        this._multiple = event.mode !== 'selectSingle';
    }
    /**
     * Whether file chooser allow for {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#attr-multiple | multiple} file selection.
     */
    isMultiple() {
        return this._multiple;
    }
    /**
     * Accept the file chooser request with given paths.
     * @param filePaths - If some of the  `filePaths` are relative paths,
     * then they are resolved relative to the {@link https://nodejs.org/api/process.html#process_process_cwd | current working directory}.
     */
    async accept(filePaths) {
        (0, assert_js_1.assert)(!this._handled, 'Cannot accept FileChooser which is already handled!');
        this._handled = true;
        await this._element.uploadFile(...filePaths);
    }
    /**
     * Closes the file chooser without selecting any files.
     */
    cancel() {
        (0, assert_js_1.assert)(!this._handled, 'Cannot cancel FileChooser which is already handled!');
        this._handled = true;
    }
}
exports.FileChooser = FileChooser;

},{"./assert.js":50}],31:[function(require,module,exports){
"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Frame = exports.FrameManager = exports.FrameManagerEmittedEvents = void 0;
const EventEmitter_js_1 = require("./EventEmitter.js");
const assert_js_1 = require("./assert.js");
const helper_js_1 = require("./helper.js");
const ExecutionContext_js_1 = require("./ExecutionContext.js");
const LifecycleWatcher_js_1 = require("./LifecycleWatcher.js");
const DOMWorld_js_1 = require("./DOMWorld.js");
const NetworkManager_js_1 = require("./NetworkManager.js");
const Connection_js_1 = require("./Connection.js");
const UTILITY_WORLD_NAME = '__puppeteer_utility_world__';
const xPathPattern = /^\(\/\/[^\)]+\)|^\/\//;
/**
 * We use symbols to prevent external parties listening to these events.
 * They are internal to Puppeteer.
 *
 * @internal
 */
exports.FrameManagerEmittedEvents = {
    FrameAttached: Symbol('FrameManager.FrameAttached'),
    FrameNavigated: Symbol('FrameManager.FrameNavigated'),
    FrameDetached: Symbol('FrameManager.FrameDetached'),
    LifecycleEvent: Symbol('FrameManager.LifecycleEvent'),
    FrameNavigatedWithinDocument: Symbol('FrameManager.FrameNavigatedWithinDocument'),
    ExecutionContextCreated: Symbol('FrameManager.ExecutionContextCreated'),
    ExecutionContextDestroyed: Symbol('FrameManager.ExecutionContextDestroyed'),
};
/**
 * @internal
 */
class FrameManager extends EventEmitter_js_1.EventEmitter {
    constructor(client, page, ignoreHTTPSErrors, timeoutSettings) {
        super();
        this._frames = new Map();
        this._contextIdToContext = new Map();
        this._isolatedWorlds = new Set();
        this._client = client;
        this._page = page;
        this._networkManager = new NetworkManager_js_1.NetworkManager(client, ignoreHTTPSErrors, this);
        this._timeoutSettings = timeoutSettings;
        this.setupEventListeners(this._client);
    }
    setupEventListeners(session) {
        session.on('Page.frameAttached', (event) => {
            this._onFrameAttached(session, event.frameId, event.parentFrameId);
        });
        session.on('Page.frameNavigated', (event) => {
            this._onFrameNavigated(event.frame);
        });
        session.on('Page.navigatedWithinDocument', (event) => {
            this._onFrameNavigatedWithinDocument(event.frameId, event.url);
        });
        session.on('Page.frameDetached', (event) => {
            this._onFrameDetached(event.frameId, event.reason);
        });
        session.on('Page.frameStoppedLoading', (event) => {
            this._onFrameStoppedLoading(event.frameId);
        });
        session.on('Runtime.executionContextCreated', (event) => {
            this._onExecutionContextCreated(event.context, session);
        });
        session.on('Runtime.executionContextDestroyed', (event) => {
            this._onExecutionContextDestroyed(event.executionContextId, session);
        });
        session.on('Runtime.executionContextsCleared', () => {
            this._onExecutionContextsCleared(session);
        });
        session.on('Page.lifecycleEvent', (event) => {
            this._onLifecycleEvent(event);
        });
        session.on('Target.attachedToTarget', async (event) => {
            this._onAttachedToTarget(event);
        });
        session.on('Target.detachedFromTarget', async (event) => {
            this._onDetachedFromTarget(event);
        });
    }
    async initialize(client = this._client) {
        try {
            const result = await Promise.all([
                client.send('Page.enable'),
                client.send('Page.getFrameTree'),
            ]);
            const { frameTree } = result[1];
            this._handleFrameTree(client, frameTree);
            await Promise.all([
                client.send('Page.setLifecycleEventsEnabled', { enabled: true }),
                client
                    .send('Runtime.enable')
                    .then(() => this._ensureIsolatedWorld(client, UTILITY_WORLD_NAME)),
                // TODO: Network manager is not aware of OOP iframes yet.
                client === this._client
                    ? this._networkManager.initialize()
                    : Promise.resolve(),
            ]);
        }
        catch (error) {
            // The target might have been closed before the initialization finished.
            if (error.message.includes('Target closed') ||
                error.message.includes('Session closed')) {
                return;
            }
            throw error;
        }
    }
    networkManager() {
        return this._networkManager;
    }
    async navigateFrame(frame, url, options = {}) {
        assertNoLegacyNavigationOptions(options);
        const { referer = this._networkManager.extraHTTPHeaders()['referer'], waitUntil = ['load'], timeout = this._timeoutSettings.navigationTimeout(), } = options;
        const watcher = new LifecycleWatcher_js_1.LifecycleWatcher(this, frame, waitUntil, timeout);
        let ensureNewDocumentNavigation = false;
        let error = await Promise.race([
            navigate(this._client, url, referer, frame._id),
            watcher.timeoutOrTerminationPromise(),
        ]);
        if (!error) {
            error = await Promise.race([
                watcher.timeoutOrTerminationPromise(),
                ensureNewDocumentNavigation
                    ? watcher.newDocumentNavigationPromise()
                    : watcher.sameDocumentNavigationPromise(),
            ]);
        }
        watcher.dispose();
        if (error)
            throw error;
        return await watcher.navigationResponse();
        async function navigate(client, url, referrer, frameId) {
            try {
                const response = await client.send('Page.navigate', {
                    url,
                    referrer,
                    frameId,
                });
                ensureNewDocumentNavigation = !!response.loaderId;
                return response.errorText
                    ? new Error(`${response.errorText} at ${url}`)
                    : null;
            }
            catch (error) {
                return error;
            }
        }
    }
    async waitForFrameNavigation(frame, options = {}) {
        assertNoLegacyNavigationOptions(options);
        const { waitUntil = ['load'], timeout = this._timeoutSettings.navigationTimeout(), } = options;
        const watcher = new LifecycleWatcher_js_1.LifecycleWatcher(this, frame, waitUntil, timeout);
        const error = await Promise.race([
            watcher.timeoutOrTerminationPromise(),
            watcher.sameDocumentNavigationPromise(),
            watcher.newDocumentNavigationPromise(),
        ]);
        watcher.dispose();
        if (error)
            throw error;
        return await watcher.navigationResponse();
    }
    async _onAttachedToTarget(event) {
        if (event.targetInfo.type !== 'iframe') {
            return;
        }
        const frame = this._frames.get(event.targetInfo.targetId);
        const session = Connection_js_1.Connection.fromSession(this._client).session(event.sessionId);
        frame._updateClient(session);
        this.setupEventListeners(session);
        await this.initialize(session);
    }
    async _onDetachedFromTarget(event) {
        const frame = this._frames.get(event.targetId);
        if (frame && frame.isOOPFrame()) {
            // When an OOP iframe is removed from the page, it
            // will only get a Target.detachedFromTarget event.
            this._removeFramesRecursively(frame);
        }
    }
    _onLifecycleEvent(event) {
        const frame = this._frames.get(event.frameId);
        if (!frame)
            return;
        frame._onLifecycleEvent(event.loaderId, event.name);
        this.emit(exports.FrameManagerEmittedEvents.LifecycleEvent, frame);
    }
    _onFrameStoppedLoading(frameId) {
        const frame = this._frames.get(frameId);
        if (!frame)
            return;
        frame._onLoadingStopped();
        this.emit(exports.FrameManagerEmittedEvents.LifecycleEvent, frame);
    }
    _handleFrameTree(session, frameTree) {
        if (frameTree.frame.parentId) {
            this._onFrameAttached(session, frameTree.frame.id, frameTree.frame.parentId);
        }
        this._onFrameNavigated(frameTree.frame);
        if (!frameTree.childFrames)
            return;
        for (const child of frameTree.childFrames) {
            this._handleFrameTree(session, child);
        }
    }
    page() {
        return this._page;
    }
    mainFrame() {
        return this._mainFrame;
    }
    frames() {
        return Array.from(this._frames.values());
    }
    frame(frameId) {
        return this._frames.get(frameId) || null;
    }
    _onFrameAttached(session, frameId, parentFrameId) {
        if (this._frames.has(frameId)) {
            const frame = this._frames.get(frameId);
            if (session && frame.isOOPFrame()) {
                // If an OOP iframes becomes a normal iframe again
                // it is first attached to the parent page before
                // the target is removed.
                frame._updateClient(session);
            }
            return;
        }
        (0, assert_js_1.assert)(parentFrameId);
        const parentFrame = this._frames.get(parentFrameId);
        const frame = new Frame(this, parentFrame, frameId, session);
        this._frames.set(frame._id, frame);
        this.emit(exports.FrameManagerEmittedEvents.FrameAttached, frame);
    }
    _onFrameNavigated(framePayload) {
        const isMainFrame = !framePayload.parentId;
        let frame = isMainFrame
            ? this._mainFrame
            : this._frames.get(framePayload.id);
        (0, assert_js_1.assert)(isMainFrame || frame, 'We either navigate top level or have old version of the navigated frame');
        // Detach all child frames first.
        if (frame) {
            for (const child of frame.childFrames())
                this._removeFramesRecursively(child);
        }
        // Update or create main frame.
        if (isMainFrame) {
            if (frame) {
                // Update frame id to retain frame identity on cross-process navigation.
                this._frames.delete(frame._id);
                frame._id = framePayload.id;
            }
            else {
                // Initial main frame navigation.
                frame = new Frame(this, null, framePayload.id, this._client);
            }
            this._frames.set(framePayload.id, frame);
            this._mainFrame = frame;
        }
        // Update frame payload.
        frame._navigated(framePayload);
        this.emit(exports.FrameManagerEmittedEvents.FrameNavigated, frame);
    }
    async _ensureIsolatedWorld(session, name) {
        const key = `${session.id()}:${name}`;
        if (this._isolatedWorlds.has(key))
            return;
        this._isolatedWorlds.add(key);
        await session.send('Page.addScriptToEvaluateOnNewDocument', {
            source: `//# sourceURL=${ExecutionContext_js_1.EVALUATION_SCRIPT_URL}`,
            worldName: name,
        });
        // Frames might be removed before we send this.
        await Promise.all(this.frames()
            .filter((frame) => frame._client === session)
            .map((frame) => session.send('Page.createIsolatedWorld', {
            frameId: frame._id,
            worldName: name,
            grantUniveralAccess: true,
        })));
    }
    _onFrameNavigatedWithinDocument(frameId, url) {
        const frame = this._frames.get(frameId);
        if (!frame)
            return;
        frame._navigatedWithinDocument(url);
        this.emit(exports.FrameManagerEmittedEvents.FrameNavigatedWithinDocument, frame);
        this.emit(exports.FrameManagerEmittedEvents.FrameNavigated, frame);
    }
    _onFrameDetached(frameId, reason) {
        const frame = this._frames.get(frameId);
        if (reason === 'remove') {
            // Only remove the frame if the reason for the detached event is
            // an actual removement of the frame.
            // For frames that become OOP iframes, the reason would be 'swap'.
            if (frame)
                this._removeFramesRecursively(frame);
        }
    }
    _onExecutionContextCreated(contextPayload, session) {
        const auxData = contextPayload.auxData;
        const frameId = auxData ? auxData.frameId : null;
        const frame = this._frames.get(frameId) || null;
        let world = null;
        if (frame) {
            // Only care about execution contexts created for the current session.
            if (frame._client !== session)
                return;
            if (contextPayload.auxData && !!contextPayload.auxData['isDefault']) {
                world = frame._mainWorld;
            }
            else if (contextPayload.name === UTILITY_WORLD_NAME &&
                !frame._secondaryWorld._hasContext()) {
                // In case of multiple sessions to the same target, there's a race between
                // connections so we might end up creating multiple isolated worlds.
                // We can use either.
                world = frame._secondaryWorld;
            }
        }
        const context = new ExecutionContext_js_1.ExecutionContext((frame === null || frame === void 0 ? void 0 : frame._client) || this._client, contextPayload, world);
        if (world)
            world._setContext(context);
        const key = `${session.id()}:${contextPayload.id}`;
        this._contextIdToContext.set(key, context);
    }
    _onExecutionContextDestroyed(executionContextId, session) {
        const key = `${session.id()}:${executionContextId}`;
        const context = this._contextIdToContext.get(key);
        if (!context)
            return;
        this._contextIdToContext.delete(key);
        if (context._world)
            context._world._setContext(null);
    }
    _onExecutionContextsCleared(session) {
        for (const [key, context] of this._contextIdToContext.entries()) {
            // Make sure to only clear execution contexts that belong
            // to the current session.
            if (context._client !== session)
                continue;
            if (context._world)
                context._world._setContext(null);
            this._contextIdToContext.delete(key);
        }
    }
    executionContextById(contextId, session = this._client) {
        const key = `${session.id()}:${contextId}`;
        const context = this._contextIdToContext.get(key);
        (0, assert_js_1.assert)(context, 'INTERNAL ERROR: missing context with id = ' + contextId);
        return context;
    }
    _removeFramesRecursively(frame) {
        for (const child of frame.childFrames())
            this._removeFramesRecursively(child);
        frame._detach();
        this._frames.delete(frame._id);
        this.emit(exports.FrameManagerEmittedEvents.FrameDetached, frame);
    }
}
exports.FrameManager = FrameManager;
/**
 * At every point of time, page exposes its current frame tree via the
 * {@link Page.mainFrame | page.mainFrame} and
 * {@link Frame.childFrames | frame.childFrames} methods.
 *
 * @remarks
 *
 * `Frame` object lifecycles are controlled by three events that are all
 * dispatched on the page object:
 *
 * - {@link PageEmittedEvents.FrameAttached}
 *
 * - {@link PageEmittedEvents.FrameNavigated}
 *
 * - {@link PageEmittedEvents.FrameDetached}
 *
 * @Example
 * An example of dumping frame tree:
 *
 * ```js
 * const puppeteer = require('puppeteer');
 *
 * (async () => {
 *   const browser = await puppeteer.launch();
 *   const page = await browser.newPage();
 *   await page.goto('https://www.google.com/chrome/browser/canary.html');
 *   dumpFrameTree(page.mainFrame(), '');
 *   await browser.close();
 *
 *   function dumpFrameTree(frame, indent) {
 *     console.log(indent + frame.url());
 *     for (const child of frame.childFrames()) {
 *     dumpFrameTree(child, indent + '  ');
 *     }
 *   }
 * })();
 * ```
 *
 * @Example
 * An example of getting text from an iframe element:
 *
 * ```js
 * const frame = page.frames().find(frame => frame.name() === 'myframe');
 * const text = await frame.$eval('.selector', element => element.textContent);
 * console.log(text);
 * ```
 *
 * @public
 */
class Frame {
    /**
     * @internal
     */
    constructor(frameManager, parentFrame, frameId, client) {
        this._url = '';
        this._detached = false;
        /**
         * @internal
         */
        this._loaderId = '';
        /**
         * @internal
         */
        this._lifecycleEvents = new Set();
        this._frameManager = frameManager;
        this._parentFrame = parentFrame;
        this._url = '';
        this._id = frameId;
        this._detached = false;
        this._loaderId = '';
        this._childFrames = new Set();
        if (this._parentFrame)
            this._parentFrame._childFrames.add(this);
        this._updateClient(client);
    }
    /**
     * @internal
     */
    _updateClient(client) {
        this._client = client;
        this._mainWorld = new DOMWorld_js_1.DOMWorld(this._client, this._frameManager, this, this._frameManager._timeoutSettings);
        this._secondaryWorld = new DOMWorld_js_1.DOMWorld(this._client, this._frameManager, this, this._frameManager._timeoutSettings);
    }
    isOOPFrame() {
        return this._client !== this._frameManager._client;
    }
    /**
     * @remarks
     *
     * `frame.goto` will throw an error if:
     * - there's an SSL error (e.g. in case of self-signed certificates).
     *
     * - target URL is invalid.
     *
     * - the `timeout` is exceeded during navigation.
     *
     * - the remote server does not respond or is unreachable.
     *
     * - the main resource failed to load.
     *
     * `frame.goto` will not throw an error when any valid HTTP status code is
     * returned by the remote server, including 404 "Not Found" and 500 "Internal
     * Server Error".  The status code for such responses can be retrieved by
     * calling {@link HTTPResponse.status}.
     *
     * NOTE: `frame.goto` either throws an error or returns a main resource
     * response. The only exceptions are navigation to `about:blank` or
     * navigation to the same URL with a different hash, which would succeed and
     * return `null`.
     *
     * NOTE: Headless mode doesn't support navigation to a PDF document. See
     * the {@link https://bugs.chromium.org/p/chromium/issues/detail?id=761295 | upstream
     * issue}.
     *
     * @param url - the URL to navigate the frame to. This should include the
     * scheme, e.g. `https://`.
     * @param options - navigation options. `waitUntil` is useful to define when
     * the navigation should be considered successful - see the docs for
     * {@link PuppeteerLifeCycleEvent} for more details.
     *
     * @returns A promise which resolves to the main resource response. In case of
     * multiple redirects, the navigation will resolve with the response of the
     * last redirect.
     */
    async goto(url, options = {}) {
        return await this._frameManager.navigateFrame(this, url, options);
    }
    /**
     * @remarks
     *
     * This resolves when the frame navigates to a new URL. It is useful for when
     * you run code which will indirectly cause the frame to navigate. Consider
     * this example:
     *
     * ```js
     * const [response] = await Promise.all([
     *   // The navigation promise resolves after navigation has finished
     *   frame.waitForNavigation(),
     *   // Clicking the link will indirectly cause a navigation
     *   frame.click('a.my-link'),
     * ]);
     * ```
     *
     * Usage of the {@link https://developer.mozilla.org/en-US/docs/Web/API/History_API | History API} to change the URL is considered a navigation.
     *
     * @param options - options to configure when the navigation is consided finished.
     * @returns a promise that resolves when the frame navigates to a new URL.
     */
    async waitForNavigation(options = {}) {
        return await this._frameManager.waitForFrameNavigation(this, options);
    }
    /**
     * @returns a promise that resolves to the frame's default execution context.
     */
    executionContext() {
        return this._mainWorld.executionContext();
    }
    /**
     * @remarks
     *
     * The only difference between {@link Frame.evaluate} and
     * `frame.evaluateHandle` is that `evaluateHandle` will return the value
     * wrapped in an in-page object.
     *
     * This method behaves identically to {@link Page.evaluateHandle} except it's
     * run within the context of the `frame`, rather than the entire page.
     *
     * @param pageFunction - a function that is run within the frame
     * @param args - arguments to be passed to the pageFunction
     */
    async evaluateHandle(pageFunction, ...args) {
        return this._mainWorld.evaluateHandle(pageFunction, ...args);
    }
    /**
     * @remarks
     *
     * This method behaves identically to {@link Page.evaluate} except it's run
     * within the context of the `frame`, rather than the entire page.
     *
     * @param pageFunction - a function that is run within the frame
     * @param args - arguments to be passed to the pageFunction
     */
    async evaluate(pageFunction, ...args) {
        return this._mainWorld.evaluate(pageFunction, ...args);
    }
    /**
     * This method queries the frame for the given selector.
     *
     * @param selector - a selector to query for.
     * @returns A promise which resolves to an `ElementHandle` pointing at the
     * element, or `null` if it was not found.
     */
    async $(selector) {
        return this._mainWorld.$(selector);
    }
    /**
     * This method evaluates the given XPath expression and returns the results.
     *
     * @param expression - the XPath expression to evaluate.
     */
    async $x(expression) {
        return this._mainWorld.$x(expression);
    }
    /**
     * @remarks
     *
     * This method runs `document.querySelector` within
     * the frame and passes it as the first argument to `pageFunction`.
     *
     * If `pageFunction` returns a Promise, then `frame.$eval` would wait for
     * the promise to resolve and return its value.
     *
     * @example
     *
     * ```js
     * const searchValue = await frame.$eval('#search', el => el.value);
     * ```
     *
     * @param selector - the selector to query for
     * @param pageFunction - the function to be evaluated in the frame's context
     * @param args - additional arguments to pass to `pageFuncton`
     */
    async $eval(selector, pageFunction, ...args) {
        return this._mainWorld.$eval(selector, pageFunction, ...args);
    }
    /**
     * @remarks
     *
     * This method runs `Array.from(document.querySelectorAll(selector))` within
     * the frame and passes it as the first argument to `pageFunction`.
     *
     * If `pageFunction` returns a Promise, then `frame.$$eval` would wait for
     * the promise to resolve and return its value.
     *
     * @example
     *
     * ```js
     * const divsCounts = await frame.$$eval('div', divs => divs.length);
     * ```
     *
     * @param selector - the selector to query for
     * @param pageFunction - the function to be evaluated in the frame's context
     * @param args - additional arguments to pass to `pageFuncton`
     */
    async $$eval(selector, pageFunction, ...args) {
        return this._mainWorld.$$eval(selector, pageFunction, ...args);
    }
    /**
     * This runs `document.querySelectorAll` in the frame and returns the result.
     *
     * @param selector - a selector to search for
     * @returns An array of element handles pointing to the found frame elements.
     */
    async $$(selector) {
        return this._mainWorld.$$(selector);
    }
    /**
     * @returns the full HTML contents of the frame, including the doctype.
     */
    async content() {
        return this._secondaryWorld.content();
    }
    /**
     * Set the content of the frame.
     *
     * @param html - HTML markup to assign to the page.
     * @param options - options to configure how long before timing out and at
     * what point to consider the content setting successful.
     */
    async setContent(html, options = {}) {
        return this._secondaryWorld.setContent(html, options);
    }
    /**
     * @remarks
     *
     * If the name is empty, it returns the `id` attribute instead.
     *
     * Note: This value is calculated once when the frame is created, and will not
     * update if the attribute is changed later.
     *
     * @returns the frame's `name` attribute as specified in the tag.
     */
    name() {
        return this._name || '';
    }
    /**
     * @returns the frame's URL.
     */
    url() {
        return this._url;
    }
    /**
     * @returns the parent `Frame`, if any. Detached and main frames return `null`.
     */
    parentFrame() {
        return this._parentFrame;
    }
    /**
     * @returns an array of child frames.
     */
    childFrames() {
        return Array.from(this._childFrames);
    }
    /**
     * @returns `true` if the frame has been detached, or `false` otherwise.
     */
    isDetached() {
        return this._detached;
    }
    /**
     * Adds a `<script>` tag into the page with the desired url or content.
     *
     * @param options - configure the script to add to the page.
     *
     * @returns a promise that resolves to the added tag when the script's
     * `onload` event fires or when the script content was injected into the
     * frame.
     */
    async addScriptTag(options) {
        return this._mainWorld.addScriptTag(options);
    }
    /**
     * Adds a `<link rel="stylesheet">` tag into the page with the desired url or
     * a `<style type="text/css">` tag with the content.
     *
     * @param options - configure the CSS to add to the page.
     *
     * @returns a promise that resolves to the added tag when the stylesheets's
     * `onload` event fires or when the CSS content was injected into the
     * frame.
     */
    async addStyleTag(options) {
        return this._mainWorld.addStyleTag(options);
    }
    /**
     *
     * This method clicks the first element found that matches `selector`.
     *
     * @remarks
     *
     * This method scrolls the element into view if needed, and then uses
     * {@link Page.mouse} to click in the center of the element. If there's no
     * element matching `selector`, the method throws an error.
     *
     * Bear in mind that if `click()` triggers a navigation event and there's a
     * separate `page.waitForNavigation()` promise to be resolved, you may end up
     * with a race condition that yields unexpected results. The correct pattern
     * for click and wait for navigation is the following:
     *
     * ```javascript
     * const [response] = await Promise.all([
     *   page.waitForNavigation(waitOptions),
     *   frame.click(selector, clickOptions),
     * ]);
     * ```
     * @param selector - the selector to search for to click. If there are
     * multiple elements, the first will be clicked.
     */
    async click(selector, options = {}) {
        return this._secondaryWorld.click(selector, options);
    }
    /**
     * This method fetches an element with `selector` and focuses it.
     *
     * @remarks
     * If there's no element matching `selector`, the method throws an error.
     *
     * @param selector - the selector for the element to focus. If there are
     * multiple elements, the first will be focused.
     */
    async focus(selector) {
        return this._secondaryWorld.focus(selector);
    }
    /**
     * This method fetches an element with `selector`, scrolls it into view if
     * needed, and then uses {@link Page.mouse} to hover over the center of the
     * element.
     *
     * @remarks
     * If there's no element matching `selector`, the method throws an
     *
     * @param selector - the selector for the element to hover. If there are
     * multiple elements, the first will be hovered.
     */
    async hover(selector) {
        return this._secondaryWorld.hover(selector);
    }
    /**
     * Triggers a `change` and `input` event once all the provided options have
     * been selected.
     *
     * @remarks
     *
     * If there's no `<select>` element matching `selector`, the
     * method throws an error.
     *
     * @example
     * ```js
     * frame.select('select#colors', 'blue'); // single selection
     * frame.select('select#colors', 'red', 'green', 'blue'); // multiple selections
     * ```
     *
     * @param selector - a selector to query the frame for
     * @param values - an array of values to select. If the `<select>` has the
     * `multiple` attribute, all values are considered, otherwise only the first
     * one is taken into account.
     * @returns the list of values that were successfully selected.
     */
    select(selector, ...values) {
        return this._secondaryWorld.select(selector, ...values);
    }
    /**
     * This method fetches an element with `selector`, scrolls it into view if
     * needed, and then uses {@link Page.touchscreen} to tap in the center of the
     * element.
     *
     * @remarks
     *
     * If there's no element matching `selector`, the method throws an error.
     *
     * @param selector - the selector to tap.
     * @returns a promise that resolves when the element has been tapped.
     */
    async tap(selector) {
        return this._secondaryWorld.tap(selector);
    }
    /**
     * Sends a `keydown`, `keypress`/`input`, and `keyup` event for each character
     * in the text.
     *
     * @remarks
     * To press a special key, like `Control` or `ArrowDown`, use
     * {@link Keyboard.press}.
     *
     * @example
     * ```js
     * await frame.type('#mytextarea', 'Hello'); // Types instantly
     * await frame.type('#mytextarea', 'World', {delay: 100}); // Types slower, like a user
     * ```
     *
     * @param selector - the selector for the element to type into. If there are
     * multiple the first will be used.
     * @param text - text to type into the element
     * @param options - takes one option, `delay`, which sets the time to wait
     * between key presses in milliseconds. Defaults to `0`.
     *
     * @returns a promise that resolves when the typing is complete.
     */
    async type(selector, text, options) {
        return this._mainWorld.type(selector, text, options);
    }
    /**
     * @remarks
     *
     * This method behaves differently depending on the first parameter. If it's a
     * `string`, it will be treated as a `selector` or `xpath` (if the string
     * starts with `//`). This method then is a shortcut for
     * {@link Frame.waitForSelector} or {@link Frame.waitForXPath}.
     *
     * If the first argument is a function this method is a shortcut for
     * {@link Frame.waitForFunction}.
     *
     * If the first argument is a `number`, it's treated as a timeout in
     * milliseconds and the method returns a promise which resolves after the
     * timeout.
     *
     * @param selectorOrFunctionOrTimeout - a selector, predicate or timeout to
     * wait for.
     * @param options - optional waiting parameters.
     * @param args - arguments to pass to `pageFunction`.
     *
     * @deprecated Don't use this method directly. Instead use the more explicit
     * methods available: {@link Frame.waitForSelector},
     * {@link Frame.waitForXPath}, {@link Frame.waitForFunction} or
     * {@link Frame.waitForTimeout}.
     */
    waitFor(selectorOrFunctionOrTimeout, options = {}, ...args) {
        console.warn('waitFor is deprecated and will be removed in a future release. See https://github.com/puppeteer/puppeteer/issues/6214 for details and how to migrate your code.');
        if (helper_js_1.helper.isString(selectorOrFunctionOrTimeout)) {
            const string = selectorOrFunctionOrTimeout;
            if (xPathPattern.test(string))
                return this.waitForXPath(string, options);
            return this.waitForSelector(string, options);
        }
        if (helper_js_1.helper.isNumber(selectorOrFunctionOrTimeout))
            return new Promise((fulfill) => setTimeout(fulfill, selectorOrFunctionOrTimeout));
        if (typeof selectorOrFunctionOrTimeout === 'function')
            return this.waitForFunction(selectorOrFunctionOrTimeout, options, ...args);
        return Promise.reject(new Error('Unsupported target type: ' + typeof selectorOrFunctionOrTimeout));
    }
    /**
     * Causes your script to wait for the given number of milliseconds.
     *
     * @remarks
     * It's generally recommended to not wait for a number of seconds, but instead
     * use {@link Frame.waitForSelector}, {@link Frame.waitForXPath} or
     * {@link Frame.waitForFunction} to wait for exactly the conditions you want.
     *
     * @example
     *
     * Wait for 1 second:
     *
     * ```
     * await frame.waitForTimeout(1000);
     * ```
     *
     * @param milliseconds - the number of milliseconds to wait.
     */
    waitForTimeout(milliseconds) {
        return new Promise((resolve) => {
            setTimeout(resolve, milliseconds);
        });
    }
    /**
     * @remarks
     *
     *
     * Wait for the `selector` to appear in page. If at the moment of calling the
     * method the `selector` already exists, the method will return immediately.
     * If the selector doesn't appear after the `timeout` milliseconds of waiting,
     * the function will throw.
     *
     * This method works across navigations.
     *
     * @example
     * ```js
     * const puppeteer = require('puppeteer');
     *
     * (async () => {
     *   const browser = await puppeteer.launch();
     *   const page = await browser.newPage();
     *   let currentURL;
     *   page.mainFrame()
     *   .waitForSelector('img')
     *   .then(() => console.log('First URL with image: ' + currentURL));
     *
     *   for (currentURL of ['https://example.com', 'https://google.com', 'https://bbc.com']) {
     *     await page.goto(currentURL);
     *   }
     *   await browser.close();
     * })();
     * ```
     * @param selector - the selector to wait for.
     * @param options - options to define if the element should be visible and how
     * long to wait before timing out.
     * @returns a promise which resolves when an element matching the selector
     * string is added to the DOM.
     */
    async waitForSelector(selector, options = {}) {
        const handle = await this._secondaryWorld.waitForSelector(selector, options);
        if (!handle)
            return null;
        const mainExecutionContext = await this._mainWorld.executionContext();
        const result = await mainExecutionContext._adoptElementHandle(handle);
        await handle.dispose();
        return result;
    }
    /**
     * @remarks
     * Wait for the `xpath` to appear in page. If at the moment of calling the
     * method the `xpath` already exists, the method will return immediately. If
     * the xpath doesn't appear after the `timeout` milliseconds of waiting, the
     * function will throw.
     *
     * For a code example, see the example for {@link Frame.waitForSelector}. That
     * function behaves identically other than taking a CSS selector rather than
     * an XPath.
     *
     * @param xpath - the XPath expression to wait for.
     * @param options  - options to configure the visiblity of the element and how
     * long to wait before timing out.
     */
    async waitForXPath(xpath, options = {}) {
        const handle = await this._secondaryWorld.waitForXPath(xpath, options);
        if (!handle)
            return null;
        const mainExecutionContext = await this._mainWorld.executionContext();
        const result = await mainExecutionContext._adoptElementHandle(handle);
        await handle.dispose();
        return result;
    }
    /**
     * @remarks
     *
     * @example
     *
     * The `waitForFunction` can be used to observe viewport size change:
     * ```js
     * const puppeteer = require('puppeteer');
     *
     * (async () => {
     * .  const browser = await puppeteer.launch();
     * .  const page = await browser.newPage();
     * .  const watchDog = page.mainFrame().waitForFunction('window.innerWidth < 100');
     * .  page.setViewport({width: 50, height: 50});
     * .  await watchDog;
     * .  await browser.close();
     * })();
     * ```
     *
     * To pass arguments from Node.js to the predicate of `page.waitForFunction` function:
     *
     * ```js
     * const selector = '.foo';
     * await frame.waitForFunction(
     *   selector => !!document.querySelector(selector),
     *   {}, // empty options object
     *   selector
     *);
     * ```
     *
     * @param pageFunction - the function to evaluate in the frame context.
     * @param options - options to configure the polling method and timeout.
     * @param args - arguments to pass to the `pageFunction`.
     * @returns the promise which resolve when the `pageFunction` returns a truthy value.
     */
    waitForFunction(pageFunction, options = {}, ...args) {
        return this._mainWorld.waitForFunction(pageFunction, options, ...args);
    }
    /**
     * @returns the frame's title.
     */
    async title() {
        return this._secondaryWorld.title();
    }
    /**
     * @internal
     */
    _navigated(framePayload) {
        this._name = framePayload.name;
        this._url = `${framePayload.url}${framePayload.urlFragment || ''}`;
    }
    /**
     * @internal
     */
    _navigatedWithinDocument(url) {
        this._url = url;
    }
    /**
     * @internal
     */
    _onLifecycleEvent(loaderId, name) {
        if (name === 'init') {
            this._loaderId = loaderId;
            this._lifecycleEvents.clear();
        }
        this._lifecycleEvents.add(name);
    }
    /**
     * @internal
     */
    _onLoadingStopped() {
        this._lifecycleEvents.add('DOMContentLoaded');
        this._lifecycleEvents.add('load');
    }
    /**
     * @internal
     */
    _detach() {
        this._detached = true;
        this._mainWorld._detach();
        this._secondaryWorld._detach();
        if (this._parentFrame)
            this._parentFrame._childFrames.delete(this);
        this._parentFrame = null;
    }
}
exports.Frame = Frame;
function assertNoLegacyNavigationOptions(options) {
    (0, assert_js_1.assert)(options['networkIdleTimeout'] === undefined, 'ERROR: networkIdleTimeout option is no longer supported.');
    (0, assert_js_1.assert)(options['networkIdleInflight'] === undefined, 'ERROR: networkIdleInflight option is no longer supported.');
    (0, assert_js_1.assert)(options.waitUntil !== 'networkidle', 'ERROR: "networkidle" option is no longer supported. Use "networkidle2" instead');
}

},{"./Connection.js":19,"./DOMWorld.js":22,"./EventEmitter.js":28,"./ExecutionContext.js":29,"./LifecycleWatcher.js":36,"./NetworkManager.js":38,"./assert.js":50,"./helper.js":52}],32:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPRequest = void 0;
const assert_js_1 = require("./assert.js");
const helper_js_1 = require("./helper.js");
/**
 *
 * Represents an HTTP request sent by a page.
 * @remarks
 *
 * Whenever the page sends a request, such as for a network resource, the
 * following events are emitted by Puppeteer's `page`:
 *
 * - `request`:  emitted when the request is issued by the page.
 * - `requestfinished` - emitted when the response body is downloaded and the
 *   request is complete.
 *
 * If request fails at some point, then instead of `requestfinished` event the
 * `requestfailed` event is emitted.
 *
 * All of these events provide an instance of `HTTPRequest` representing the
 * request that occurred:
 *
 * ```
 * page.on('request', request => ...)
 * ```
 *
 * NOTE: HTTP Error responses, such as 404 or 503, are still successful
 * responses from HTTP standpoint, so request will complete with
 * `requestfinished` event.
 *
 * If request gets a 'redirect' response, the request is successfully finished
 * with the `requestfinished` event, and a new request is issued to a
 * redirected url.
 *
 * @public
 */
class HTTPRequest {
    /**
     * @internal
     */
    constructor(client, frame, interceptionId, allowInterception, event, redirectChain) {
        /**
         * @internal
         */
        this._failureText = null;
        /**
         * @internal
         */
        this._response = null;
        /**
         * @internal
         */
        this._fromMemoryCache = false;
        this._interceptionHandled = false;
        this._headers = {};
        this._client = client;
        this._requestId = event.requestId;
        this._isNavigationRequest =
            event.requestId === event.loaderId && event.type === 'Document';
        this._interceptionId = interceptionId;
        this._allowInterception = allowInterception;
        this._url = event.request.url;
        this._resourceType = event.type.toLowerCase();
        this._method = event.request.method;
        this._postData = event.request.postData;
        this._frame = frame;
        this._redirectChain = redirectChain;
        this._continueRequestOverrides = {};
        this._currentStrategy = 'none';
        this._currentPriority = undefined;
        this._interceptActions = [];
        this._initiator = event.initiator;
        for (const key of Object.keys(event.request.headers))
            this._headers[key.toLowerCase()] = event.request.headers[key];
    }
    /**
     * @returns the URL of the request
     */
    url() {
        return this._url;
    }
    /**
     * @returns the `ContinueRequestOverrides` that will be used
     * if the interception is allowed to continue (ie, `abort()` and
     * `respond()` aren't called).
     */
    continueRequestOverrides() {
        (0, assert_js_1.assert)(this._allowInterception, 'Request Interception is not enabled!');
        return this._continueRequestOverrides;
    }
    /**
     * @returns The `ResponseForRequest` that gets used if the
     * interception is allowed to respond (ie, `abort()` is not called).
     */
    responseForRequest() {
        (0, assert_js_1.assert)(this._allowInterception, 'Request Interception is not enabled!');
        return this._responseForRequest;
    }
    /**
     * @returns the most recent reason for aborting the request
     */
    abortErrorReason() {
        (0, assert_js_1.assert)(this._allowInterception, 'Request Interception is not enabled!');
        return this._abortErrorReason;
    }
    /**
     * @returns An array of the current intercept resolution strategy and priority
     * `[strategy,priority]`. Strategy is one of: `abort`, `respond`, `continue`,
     *  `disabled`, `none`, or `already-handled`.
     */
    interceptResolution() {
        if (!this._allowInterception)
            return ['disabled'];
        if (this._interceptionHandled)
            return ['alreay-handled'];
        return [this._currentStrategy, this._currentPriority];
    }
    /**
     * Adds an async request handler to the processing queue.
     * Deferred handlers are not guaranteed to execute in any particular order,
     * but they are guarnateed to resolve before the request interception
     * is finalized.
     */
    enqueueInterceptAction(pendingHandler) {
        this._interceptActions.push(pendingHandler);
    }
    /**
     * Awaits pending interception handlers and then decides how to fulfill
     * the request interception.
     */
    async finalizeInterceptions() {
        await this._interceptActions.reduce((promiseChain, interceptAction) => promiseChain.then(interceptAction), Promise.resolve());
        const [resolution] = this.interceptResolution();
        switch (resolution) {
            case 'abort':
                return this._abort(this._abortErrorReason);
            case 'respond':
                return this._respond(this._responseForRequest);
            case 'continue':
                return this._continue(this._continueRequestOverrides);
        }
    }
    /**
     * Contains the request's resource type as it was perceived by the rendering
     * engine.
     */
    resourceType() {
        return this._resourceType;
    }
    /**
     * @returns the method used (`GET`, `POST`, etc.)
     */
    method() {
        return this._method;
    }
    /**
     * @returns the request's post body, if any.
     */
    postData() {
        return this._postData;
    }
    /**
     * @returns an object with HTTP headers associated with the request. All
     * header names are lower-case.
     */
    headers() {
        return this._headers;
    }
    /**
     * @returns A matching `HTTPResponse` object, or null if the response has not
     * been received yet.
     */
    response() {
        return this._response;
    }
    /**
     * @returns the frame that initiated the request, or null if navigating to
     * error pages.
     */
    frame() {
        return this._frame;
    }
    /**
     * @returns true if the request is the driver of the current frame's navigation.
     */
    isNavigationRequest() {
        return this._isNavigationRequest;
    }
    /**
     * @returns the initiator of the request.
     */
    initiator() {
        return this._initiator;
    }
    /**
     * A `redirectChain` is a chain of requests initiated to fetch a resource.
     * @remarks
     *
     * `redirectChain` is shared between all the requests of the same chain.
     *
     * For example, if the website `http://example.com` has a single redirect to
     * `https://example.com`, then the chain will contain one request:
     *
     * ```js
     * const response = await page.goto('http://example.com');
     * const chain = response.request().redirectChain();
     * console.log(chain.length); // 1
     * console.log(chain[0].url()); // 'http://example.com'
     * ```
     *
     * If the website `https://google.com` has no redirects, then the chain will be empty:
     *
     * ```js
     * const response = await page.goto('https://google.com');
     * const chain = response.request().redirectChain();
     * console.log(chain.length); // 0
     * ```
     *
     * @returns the chain of requests - if a server responds with at least a
     * single redirect, this chain will contain all requests that were redirected.
     */
    redirectChain() {
        return this._redirectChain.slice();
    }
    /**
     * Access information about the request's failure.
     *
     * @remarks
     *
     * @example
     *
     * Example of logging all failed requests:
     *
     * ```js
     * page.on('requestfailed', request => {
     *   console.log(request.url() + ' ' + request.failure().errorText);
     * });
     * ```
     *
     * @returns `null` unless the request failed. If the request fails this can
     * return an object with `errorText` containing a human-readable error
     * message, e.g. `net::ERR_FAILED`. It is not guaranteeded that there will be
     * failure text if the request fails.
     */
    failure() {
        if (!this._failureText)
            return null;
        return {
            errorText: this._failureText,
        };
    }
    /**
     * Continues request with optional request overrides.
     *
     * @remarks
     *
     * To use this, request
     * interception should be enabled with {@link Page.setRequestInterception}.
     *
     * Exception is immediately thrown if the request interception is not enabled.
     *
     * @example
     * ```js
     * await page.setRequestInterception(true);
     * page.on('request', request => {
     *   // Override headers
     *   const headers = Object.assign({}, request.headers(), {
     *     foo: 'bar', // set "foo" header
     *     origin: undefined, // remove "origin" header
     *   });
     *   request.continue({headers});
     * });
     * ```
     *
     * @param overrides - optional overrides to apply to the request.
     * @param priority - If provided, intercept is resolved using
     * cooperative handling rules. Otherwise, intercept is resolved
     * immediately.
     */
    async continue(overrides = {}, priority) {
        // Request interception is not supported for data: urls.
        if (this._url.startsWith('data:'))
            return;
        (0, assert_js_1.assert)(this._allowInterception, 'Request Interception is not enabled!');
        (0, assert_js_1.assert)(!this._interceptionHandled, 'Request is already handled!');
        if (priority === undefined) {
            return this._continue(overrides);
        }
        this._continueRequestOverrides = overrides;
        if (priority > this._currentPriority ||
            this._currentPriority === undefined) {
            this._currentStrategy = 'continue';
            this._currentPriority = priority;
            return;
        }
        if (priority === this._currentPriority) {
            if (this._currentStrategy === 'abort' ||
                this._currentStrategy === 'respond') {
                return;
            }
            this._currentStrategy = 'continue';
        }
        return;
    }
    async _continue(overrides = {}) {
        const { url, method, postData, headers } = overrides;
        this._interceptionHandled = true;
        const postDataBinaryBase64 = postData
            ? Buffer.from(postData).toString('base64')
            : undefined;
        await this._client
            .send('Fetch.continueRequest', {
            requestId: this._interceptionId,
            url,
            method,
            postData: postDataBinaryBase64,
            headers: headers ? headersArray(headers) : undefined,
        })
            .catch((error) => {
            this._interceptionHandled = false;
            return handleError(error);
        });
    }
    /**
     * Fulfills a request with the given response.
     *
     * @remarks
     *
     * To use this, request
     * interception should be enabled with {@link Page.setRequestInterception}.
     *
     * Exception is immediately thrown if the request interception is not enabled.
     *
     * @example
     * An example of fulfilling all requests with 404 responses:
     * ```js
     * await page.setRequestInterception(true);
     * page.on('request', request => {
     *   request.respond({
     *     status: 404,
     *     contentType: 'text/plain',
     *     body: 'Not Found!'
     *   });
     * });
     * ```
     *
     * NOTE: Mocking responses for dataURL requests is not supported.
     * Calling `request.respond` for a dataURL request is a noop.
     *
     * @param response - the response to fulfill the request with.
     * @param priority - If provided, intercept is resolved using
     * cooperative handling rules. Otherwise, intercept is resolved
     * immediately.
     */
    async respond(response, priority) {
        // Mocking responses for dataURL requests is not currently supported.
        if (this._url.startsWith('data:'))
            return;
        (0, assert_js_1.assert)(this._allowInterception, 'Request Interception is not enabled!');
        (0, assert_js_1.assert)(!this._interceptionHandled, 'Request is already handled!');
        if (priority === undefined) {
            return this._respond(response);
        }
        this._responseForRequest = response;
        if (priority > this._currentPriority ||
            this._currentPriority === undefined) {
            this._currentStrategy = 'respond';
            this._currentPriority = priority;
            return;
        }
        if (priority === this._currentPriority) {
            if (this._currentStrategy === 'abort') {
                return;
            }
            this._currentStrategy = 'respond';
        }
    }
    async _respond(response) {
        this._interceptionHandled = true;
        const responseBody = response.body && helper_js_1.helper.isString(response.body)
            ? Buffer.from(response.body)
            : response.body || null;
        const responseHeaders = {};
        if (response.headers) {
            for (const header of Object.keys(response.headers))
                responseHeaders[header.toLowerCase()] = String(response.headers[header]);
        }
        if (response.contentType)
            responseHeaders['content-type'] = response.contentType;
        if (responseBody && !('content-length' in responseHeaders))
            responseHeaders['content-length'] = String(Buffer.byteLength(responseBody));
        await this._client
            .send('Fetch.fulfillRequest', {
            requestId: this._interceptionId,
            responseCode: response.status || 200,
            responsePhrase: STATUS_TEXTS[response.status || 200],
            responseHeaders: headersArray(responseHeaders),
            body: responseBody ? responseBody.toString('base64') : undefined,
        })
            .catch((error) => {
            this._interceptionHandled = false;
            return handleError(error);
        });
    }
    /**
     * Aborts a request.
     *
     * @remarks
     * To use this, request interception should be enabled with
     * {@link Page.setRequestInterception}. If it is not enabled, this method will
     * throw an exception immediately.
     *
     * @param errorCode - optional error code to provide.
     * @param priority - If provided, intercept is resolved using
     * cooperative handling rules. Otherwise, intercept is resolved
     * immediately.
     */
    async abort(errorCode = 'failed', priority) {
        // Request interception is not supported for data: urls.
        if (this._url.startsWith('data:'))
            return;
        const errorReason = errorReasons[errorCode];
        (0, assert_js_1.assert)(errorReason, 'Unknown error code: ' + errorCode);
        (0, assert_js_1.assert)(this._allowInterception, 'Request Interception is not enabled!');
        (0, assert_js_1.assert)(!this._interceptionHandled, 'Request is already handled!');
        if (priority === undefined) {
            return this._abort(errorReason);
        }
        this._abortErrorReason = errorReason;
        if (priority >= this._currentPriority ||
            this._currentPriority === undefined) {
            this._currentStrategy = 'abort';
            this._currentPriority = priority;
            return;
        }
    }
    async _abort(errorReason) {
        this._interceptionHandled = true;
        await this._client
            .send('Fetch.failRequest', {
            requestId: this._interceptionId,
            errorReason,
        })
            .catch(handleError);
    }
}
exports.HTTPRequest = HTTPRequest;
const errorReasons = {
    aborted: 'Aborted',
    accessdenied: 'AccessDenied',
    addressunreachable: 'AddressUnreachable',
    blockedbyclient: 'BlockedByClient',
    blockedbyresponse: 'BlockedByResponse',
    connectionaborted: 'ConnectionAborted',
    connectionclosed: 'ConnectionClosed',
    connectionfailed: 'ConnectionFailed',
    connectionrefused: 'ConnectionRefused',
    connectionreset: 'ConnectionReset',
    internetdisconnected: 'InternetDisconnected',
    namenotresolved: 'NameNotResolved',
    timedout: 'TimedOut',
    failed: 'Failed',
};
function headersArray(headers) {
    const result = [];
    for (const name in headers) {
        if (!Object.is(headers[name], undefined))
            result.push({ name, value: headers[name] + '' });
    }
    return result;
}
async function handleError(error) {
    if (['Invalid header'].includes(error.originalMessage)) {
        throw error;
    }
    // In certain cases, protocol will return error if the request was
    // already canceled or the page was closed. We should tolerate these
    // errors.
    (0, helper_js_1.debugError)(error);
}
// List taken from
// https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
// with extra 306 and 418 codes.
const STATUS_TEXTS = {
    '100': 'Continue',
    '101': 'Switching Protocols',
    '102': 'Processing',
    '103': 'Early Hints',
    '200': 'OK',
    '201': 'Created',
    '202': 'Accepted',
    '203': 'Non-Authoritative Information',
    '204': 'No Content',
    '205': 'Reset Content',
    '206': 'Partial Content',
    '207': 'Multi-Status',
    '208': 'Already Reported',
    '226': 'IM Used',
    '300': 'Multiple Choices',
    '301': 'Moved Permanently',
    '302': 'Found',
    '303': 'See Other',
    '304': 'Not Modified',
    '305': 'Use Proxy',
    '306': 'Switch Proxy',
    '307': 'Temporary Redirect',
    '308': 'Permanent Redirect',
    '400': 'Bad Request',
    '401': 'Unauthorized',
    '402': 'Payment Required',
    '403': 'Forbidden',
    '404': 'Not Found',
    '405': 'Method Not Allowed',
    '406': 'Not Acceptable',
    '407': 'Proxy Authentication Required',
    '408': 'Request Timeout',
    '409': 'Conflict',
    '410': 'Gone',
    '411': 'Length Required',
    '412': 'Precondition Failed',
    '413': 'Payload Too Large',
    '414': 'URI Too Long',
    '415': 'Unsupported Media Type',
    '416': 'Range Not Satisfiable',
    '417': 'Expectation Failed',
    '418': "I'm a teapot",
    '421': 'Misdirected Request',
    '422': 'Unprocessable Entity',
    '423': 'Locked',
    '424': 'Failed Dependency',
    '425': 'Too Early',
    '426': 'Upgrade Required',
    '428': 'Precondition Required',
    '429': 'Too Many Requests',
    '431': 'Request Header Fields Too Large',
    '451': 'Unavailable For Legal Reasons',
    '500': 'Internal Server Error',
    '501': 'Not Implemented',
    '502': 'Bad Gateway',
    '503': 'Service Unavailable',
    '504': 'Gateway Timeout',
    '505': 'HTTP Version Not Supported',
    '506': 'Variant Also Negotiates',
    '507': 'Insufficient Storage',
    '508': 'Loop Detected',
    '510': 'Not Extended',
    '511': 'Network Authentication Required',
};

}).call(this)}).call(this,require("buffer").Buffer)
},{"./assert.js":50,"./helper.js":52,"buffer":6}],33:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPResponse = void 0;
const SecurityDetails_js_1 = require("./SecurityDetails.js");
const Errors_js_1 = require("./Errors.js");
/**
 * The HTTPResponse class represents responses which are received by the
 * {@link Page} class.
 *
 * @public
 */
class HTTPResponse {
    /**
     * @internal
     */
    constructor(client, request, responsePayload, extraInfo) {
        this._contentPromise = null;
        this._headers = {};
        this._client = client;
        this._request = request;
        this._bodyLoadedPromise = new Promise((fulfill) => {
            this._bodyLoadedPromiseFulfill = fulfill;
        });
        this._remoteAddress = {
            ip: responsePayload.remoteIPAddress,
            port: responsePayload.remotePort,
        };
        this._statusText =
            this._parseStatusTextFromExtrInfo(extraInfo) ||
                responsePayload.statusText;
        this._url = request.url();
        this._fromDiskCache = !!responsePayload.fromDiskCache;
        this._fromServiceWorker = !!responsePayload.fromServiceWorker;
        this._status = extraInfo ? extraInfo.statusCode : responsePayload.status;
        const headers = extraInfo ? extraInfo.headers : responsePayload.headers;
        for (const key of Object.keys(headers))
            this._headers[key.toLowerCase()] = headers[key];
        this._securityDetails = responsePayload.securityDetails
            ? new SecurityDetails_js_1.SecurityDetails(responsePayload.securityDetails)
            : null;
    }
    /**
     * @internal
     */
    _parseStatusTextFromExtrInfo(extraInfo) {
        if (!extraInfo || !extraInfo.headersText)
            return;
        const firstLine = extraInfo.headersText.split('\r', 1)[0];
        if (!firstLine)
            return;
        const match = firstLine.match(/[^ ]* [^ ]* (.*)/);
        if (!match)
            return;
        const statusText = match[1];
        if (!statusText)
            return;
        return statusText;
    }
    /**
     * @internal
     */
    _resolveBody(err) {
        return this._bodyLoadedPromiseFulfill(err);
    }
    /**
     * @returns The IP address and port number used to connect to the remote
     * server.
     */
    remoteAddress() {
        return this._remoteAddress;
    }
    /**
     * @returns The URL of the response.
     */
    url() {
        return this._url;
    }
    /**
     * @returns True if the response was successful (status in the range 200-299).
     */
    ok() {
        // TODO: document === 0 case?
        return this._status === 0 || (this._status >= 200 && this._status <= 299);
    }
    /**
     * @returns The status code of the response (e.g., 200 for a success).
     */
    status() {
        return this._status;
    }
    /**
     * @returns  The status text of the response (e.g. usually an "OK" for a
     * success).
     */
    statusText() {
        return this._statusText;
    }
    /**
     * @returns An object with HTTP headers associated with the response. All
     * header names are lower-case.
     */
    headers() {
        return this._headers;
    }
    /**
     * @returns {@link SecurityDetails} if the response was received over the
     * secure connection, or `null` otherwise.
     */
    securityDetails() {
        return this._securityDetails;
    }
    /**
     * @returns Promise which resolves to a buffer with response body.
     */
    buffer() {
        if (!this._contentPromise) {
            this._contentPromise = this._bodyLoadedPromise.then(async (error) => {
                if (error)
                    throw error;
                try {
                    const response = await this._client.send('Network.getResponseBody', {
                        requestId: this._request._requestId,
                    });
                    return Buffer.from(response.body, response.base64Encoded ? 'base64' : 'utf8');
                }
                catch (error) {
                    if (error instanceof Errors_js_1.ProtocolError &&
                        error.originalMessage === 'No resource with given identifier found') {
                        throw new Errors_js_1.ProtocolError('Could not load body for this request. This might happen if the request is a preflight request.');
                    }
                    throw error;
                }
            });
        }
        return this._contentPromise;
    }
    /**
     * @returns Promise which resolves to a text representation of response body.
     */
    async text() {
        const content = await this.buffer();
        return content.toString('utf8');
    }
    /**
     *
     * @returns Promise which resolves to a JSON representation of response body.
     *
     * @remarks
     *
     * This method will throw if the response body is not parsable via
     * `JSON.parse`.
     */
    async json() {
        const content = await this.text();
        return JSON.parse(content);
    }
    /**
     * @returns A matching {@link HTTPRequest} object.
     */
    request() {
        return this._request;
    }
    /**
     * @returns True if the response was served from either the browser's disk
     * cache or memory cache.
     */
    fromCache() {
        return this._fromDiskCache || this._request._fromMemoryCache;
    }
    /**
     * @returns True if the response was served by a service worker.
     */
    fromServiceWorker() {
        return this._fromServiceWorker;
    }
    /**
     * @returns A {@link Frame} that initiated this response, or `null` if
     * navigating to error pages.
     */
    frame() {
        return this._request.frame();
    }
}
exports.HTTPResponse = HTTPResponse;

}).call(this)}).call(this,require("buffer").Buffer)
},{"./Errors.js":27,"./SecurityDetails.js":43,"buffer":6}],34:[function(require,module,exports){
"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Touchscreen = exports.Mouse = exports.Keyboard = void 0;
const assert_js_1 = require("./assert.js");
const USKeyboardLayout_js_1 = require("./USKeyboardLayout.js");
/**
 * Keyboard provides an api for managing a virtual keyboard.
 * The high level api is {@link Keyboard."type"},
 * which takes raw characters and generates proper keydown, keypress/input,
 * and keyup events on your page.
 *
 * @remarks
 * For finer control, you can use {@link Keyboard.down},
 * {@link Keyboard.up}, and {@link Keyboard.sendCharacter}
 * to manually fire events as if they were generated from a real keyboard.
 *
 * On MacOS, keyboard shortcuts like `⌘ A` -\> Select All do not work.
 * See {@link https://github.com/puppeteer/puppeteer/issues/1313 | #1313}.
 *
 * @example
 * An example of holding down `Shift` in order to select and delete some text:
 * ```js
 * await page.keyboard.type('Hello World!');
 * await page.keyboard.press('ArrowLeft');
 *
 * await page.keyboard.down('Shift');
 * for (let i = 0; i < ' World'.length; i++)
 *   await page.keyboard.press('ArrowLeft');
 * await page.keyboard.up('Shift');
 *
 * await page.keyboard.press('Backspace');
 * // Result text will end up saying 'Hello!'
 * ```
 *
 * @example
 * An example of pressing `A`
 * ```js
 * await page.keyboard.down('Shift');
 * await page.keyboard.press('KeyA');
 * await page.keyboard.up('Shift');
 * ```
 *
 * @public
 */
class Keyboard {
    /** @internal */
    constructor(client) {
        /** @internal */
        this._modifiers = 0;
        this._pressedKeys = new Set();
        this._client = client;
    }
    /**
     * Dispatches a `keydown` event.
     *
     * @remarks
     * If `key` is a single character and no modifier keys besides `Shift`
     * are being held down, a `keypress`/`input` event will also generated.
     * The `text` option can be specified to force an input event to be generated.
     * If `key` is a modifier key, `Shift`, `Meta`, `Control`, or `Alt`,
     * subsequent key presses will be sent with that modifier active.
     * To release the modifier key, use {@link Keyboard.up}.
     *
     * After the key is pressed once, subsequent calls to
     * {@link Keyboard.down} will have
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat | repeat}
     * set to true. To release the key, use {@link Keyboard.up}.
     *
     * Modifier keys DO influence {@link Keyboard.down}.
     * Holding down `Shift` will type the text in upper case.
     *
     * @param key - Name of key to press, such as `ArrowLeft`.
     * See {@link KeyInput} for a list of all key names.
     *
     * @param options - An object of options. Accepts text which, if specified,
     * generates an input event with this text.
     */
    async down(key, options = { text: undefined }) {
        const description = this._keyDescriptionForString(key);
        const autoRepeat = this._pressedKeys.has(description.code);
        this._pressedKeys.add(description.code);
        this._modifiers |= this._modifierBit(description.key);
        const text = options.text === undefined ? description.text : options.text;
        await this._client.send('Input.dispatchKeyEvent', {
            type: text ? 'keyDown' : 'rawKeyDown',
            modifiers: this._modifiers,
            windowsVirtualKeyCode: description.keyCode,
            code: description.code,
            key: description.key,
            text: text,
            unmodifiedText: text,
            autoRepeat,
            location: description.location,
            isKeypad: description.location === 3,
        });
    }
    _modifierBit(key) {
        if (key === 'Alt')
            return 1;
        if (key === 'Control')
            return 2;
        if (key === 'Meta')
            return 4;
        if (key === 'Shift')
            return 8;
        return 0;
    }
    _keyDescriptionForString(keyString) {
        const shift = this._modifiers & 8;
        const description = {
            key: '',
            keyCode: 0,
            code: '',
            text: '',
            location: 0,
        };
        const definition = USKeyboardLayout_js_1.keyDefinitions[keyString];
        (0, assert_js_1.assert)(definition, `Unknown key: "${keyString}"`);
        if (definition.key)
            description.key = definition.key;
        if (shift && definition.shiftKey)
            description.key = definition.shiftKey;
        if (definition.keyCode)
            description.keyCode = definition.keyCode;
        if (shift && definition.shiftKeyCode)
            description.keyCode = definition.shiftKeyCode;
        if (definition.code)
            description.code = definition.code;
        if (definition.location)
            description.location = definition.location;
        if (description.key.length === 1)
            description.text = description.key;
        if (definition.text)
            description.text = definition.text;
        if (shift && definition.shiftText)
            description.text = definition.shiftText;
        // if any modifiers besides shift are pressed, no text should be sent
        if (this._modifiers & ~8)
            description.text = '';
        return description;
    }
    /**
     * Dispatches a `keyup` event.
     *
     * @param key - Name of key to release, such as `ArrowLeft`.
     * See {@link KeyInput | KeyInput}
     * for a list of all key names.
     */
    async up(key) {
        const description = this._keyDescriptionForString(key);
        this._modifiers &= ~this._modifierBit(description.key);
        this._pressedKeys.delete(description.code);
        await this._client.send('Input.dispatchKeyEvent', {
            type: 'keyUp',
            modifiers: this._modifiers,
            key: description.key,
            windowsVirtualKeyCode: description.keyCode,
            code: description.code,
            location: description.location,
        });
    }
    /**
     * Dispatches a `keypress` and `input` event.
     * This does not send a `keydown` or `keyup` event.
     *
     * @remarks
     * Modifier keys DO NOT effect {@link Keyboard.sendCharacter | Keyboard.sendCharacter}.
     * Holding down `Shift` will not type the text in upper case.
     *
     * @example
     * ```js
     * page.keyboard.sendCharacter('嗨');
     * ```
     *
     * @param char - Character to send into the page.
     */
    async sendCharacter(char) {
        await this._client.send('Input.insertText', { text: char });
    }
    charIsKey(char) {
        return !!USKeyboardLayout_js_1.keyDefinitions[char];
    }
    /**
     * Sends a `keydown`, `keypress`/`input`,
     * and `keyup` event for each character in the text.
     *
     * @remarks
     * To press a special key, like `Control` or `ArrowDown`,
     * use {@link Keyboard.press}.
     *
     * Modifier keys DO NOT effect `keyboard.type`.
     * Holding down `Shift` will not type the text in upper case.
     *
     * @example
     * ```js
     * await page.keyboard.type('Hello'); // Types instantly
     * await page.keyboard.type('World', {delay: 100}); // Types slower, like a user
     * ```
     *
     * @param text - A text to type into a focused element.
     * @param options - An object of options. Accepts delay which,
     * if specified, is the time to wait between `keydown` and `keyup` in milliseconds.
     * Defaults to 0.
     */
    async type(text, options = {}) {
        const delay = options.delay || null;
        for (const char of text) {
            if (this.charIsKey(char)) {
                await this.press(char, { delay });
            }
            else {
                if (delay)
                    await new Promise((f) => setTimeout(f, delay));
                await this.sendCharacter(char);
            }
        }
    }
    /**
     * Shortcut for {@link Keyboard.down}
     * and {@link Keyboard.up}.
     *
     * @remarks
     * If `key` is a single character and no modifier keys besides `Shift`
     * are being held down, a `keypress`/`input` event will also generated.
     * The `text` option can be specified to force an input event to be generated.
     *
     * Modifier keys DO effect {@link Keyboard.press}.
     * Holding down `Shift` will type the text in upper case.
     *
     * @param key - Name of key to press, such as `ArrowLeft`.
     * See {@link KeyInput} for a list of all key names.
     *
     * @param options - An object of options. Accepts text which, if specified,
     * generates an input event with this text. Accepts delay which,
     * if specified, is the time to wait between `keydown` and `keyup` in milliseconds.
     * Defaults to 0.
     */
    async press(key, options = {}) {
        const { delay = null } = options;
        await this.down(key, options);
        if (delay)
            await new Promise((f) => setTimeout(f, options.delay));
        await this.up(key);
    }
}
exports.Keyboard = Keyboard;
/**
 * The Mouse class operates in main-frame CSS pixels
 * relative to the top-left corner of the viewport.
 * @remarks
 * Every `page` object has its own Mouse, accessible with [`page.mouse`](#pagemouse).
 *
 * @example
 * ```js
 * // Using ‘page.mouse’ to trace a 100x100 square.
 * await page.mouse.move(0, 0);
 * await page.mouse.down();
 * await page.mouse.move(0, 100);
 * await page.mouse.move(100, 100);
 * await page.mouse.move(100, 0);
 * await page.mouse.move(0, 0);
 * await page.mouse.up();
 * ```
 *
 * **Note**: The mouse events trigger synthetic `MouseEvent`s.
 * This means that it does not fully replicate the functionality of what a normal user
 * would be able to do with their mouse.
 *
 * For example, dragging and selecting text is not possible using `page.mouse`.
 * Instead, you can use the {@link https://developer.mozilla.org/en-US/docs/Web/API/DocumentOrShadowRoot/getSelection | `DocumentOrShadowRoot.getSelection()`} functionality implemented in the platform.
 *
 * @example
 * For example, if you want to select all content between nodes:
 * ```js
 * await page.evaluate((from, to) => {
 *   const selection = from.getRootNode().getSelection();
 *   const range = document.createRange();
 *   range.setStartBefore(from);
 *   range.setEndAfter(to);
 *   selection.removeAllRanges();
 *   selection.addRange(range);
 * }, fromJSHandle, toJSHandle);
 * ```
 * If you then would want to copy-paste your selection, you can use the clipboard api:
 * ```js
 * // The clipboard api does not allow you to copy, unless the tab is focused.
 * await page.bringToFront();
 * await page.evaluate(() => {
 *   // Copy the selected content to the clipboard
 *   document.execCommand('copy');
 *   // Obtain the content of the clipboard as a string
 *   return navigator.clipboard.readText();
 * });
 * ```
 * **Note**: If you want access to the clipboard API,
 * you have to give it permission to do so:
 * ```js
 * await browser.defaultBrowserContext().overridePermissions(
 *   '<your origin>', ['clipboard-read', 'clipboard-write']
 * );
 * ```
 * @public
 */
class Mouse {
    /**
     * @internal
     */
    constructor(client, keyboard) {
        this._x = 0;
        this._y = 0;
        this._button = 'none';
        this._client = client;
        this._keyboard = keyboard;
    }
    /**
     * Dispatches a `mousemove` event.
     * @param x - Horizontal position of the mouse.
     * @param y - Vertical position of the mouse.
     * @param options - Optional object. If specified, the `steps` property
     * sends intermediate `mousemove` events when set to `1` (default).
     */
    async move(x, y, options = {}) {
        const { steps = 1 } = options;
        const fromX = this._x, fromY = this._y;
        this._x = x;
        this._y = y;
        for (let i = 1; i <= steps; i++) {
            await this._client.send('Input.dispatchMouseEvent', {
                type: 'mouseMoved',
                button: this._button,
                x: fromX + (this._x - fromX) * (i / steps),
                y: fromY + (this._y - fromY) * (i / steps),
                modifiers: this._keyboard._modifiers,
            });
        }
    }
    /**
     * Shortcut for `mouse.move`, `mouse.down` and `mouse.up`.
     * @param x - Horizontal position of the mouse.
     * @param y - Vertical position of the mouse.
     * @param options - Optional `MouseOptions`.
     */
    async click(x, y, options = {}) {
        const { delay = null } = options;
        if (delay !== null) {
            await this.move(x, y);
            await this.down(options);
            await new Promise((f) => setTimeout(f, delay));
            await this.up(options);
        }
        else {
            await this.move(x, y);
            await this.down(options);
            await this.up(options);
        }
    }
    /**
     * Dispatches a `mousedown` event.
     * @param options - Optional `MouseOptions`.
     */
    async down(options = {}) {
        const { button = 'left', clickCount = 1 } = options;
        this._button = button;
        await this._client.send('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            button,
            x: this._x,
            y: this._y,
            modifiers: this._keyboard._modifiers,
            clickCount,
        });
    }
    /**
     * Dispatches a `mouseup` event.
     * @param options - Optional `MouseOptions`.
     */
    async up(options = {}) {
        const { button = 'left', clickCount = 1 } = options;
        this._button = 'none';
        await this._client.send('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            button,
            x: this._x,
            y: this._y,
            modifiers: this._keyboard._modifiers,
            clickCount,
        });
    }
    /**
     * Dispatches a `mousewheel` event.
     * @param options - Optional: `MouseWheelOptions`.
     *
     * @example
     * An example of zooming into an element:
     * ```js
     * await page.goto('https://mdn.mozillademos.org/en-US/docs/Web/API/Element/wheel_event$samples/Scaling_an_element_via_the_wheel?revision=1587366');
     *
     * const elem = await page.$('div');
     * const boundingBox = await elem.boundingBox();
     * await page.mouse.move(
     *   boundingBox.x + boundingBox.width / 2,
     *   boundingBox.y + boundingBox.height / 2
     * );
     *
     * await page.mouse.wheel({ deltaY: -100 })
     * ```
     */
    async wheel(options = {}) {
        const { deltaX = 0, deltaY = 0 } = options;
        await this._client.send('Input.dispatchMouseEvent', {
            type: 'mouseWheel',
            x: this._x,
            y: this._y,
            deltaX,
            deltaY,
            modifiers: this._keyboard._modifiers,
            pointerType: 'mouse',
        });
    }
    /**
     * Dispatches a `drag` event.
     * @param start - starting point for drag
     * @param target - point to drag to
     */
    async drag(start, target) {
        const promise = new Promise((resolve) => {
            this._client.once('Input.dragIntercepted', (event) => resolve(event.data));
        });
        await this.move(start.x, start.y);
        await this.down();
        await this.move(target.x, target.y);
        return promise;
    }
    /**
     * Dispatches a `dragenter` event.
     * @param target - point for emitting `dragenter` event
     * @param data - drag data containing items and operations mask
     */
    async dragEnter(target, data) {
        await this._client.send('Input.dispatchDragEvent', {
            type: 'dragEnter',
            x: target.x,
            y: target.y,
            modifiers: this._keyboard._modifiers,
            data,
        });
    }
    /**
     * Dispatches a `dragover` event.
     * @param target - point for emitting `dragover` event
     * @param data - drag data containing items and operations mask
     */
    async dragOver(target, data) {
        await this._client.send('Input.dispatchDragEvent', {
            type: 'dragOver',
            x: target.x,
            y: target.y,
            modifiers: this._keyboard._modifiers,
            data,
        });
    }
    /**
     * Performs a dragenter, dragover, and drop in sequence.
     * @param target - point to drop on
     * @param data - drag data containing items and operations mask
     */
    async drop(target, data) {
        await this._client.send('Input.dispatchDragEvent', {
            type: 'drop',
            x: target.x,
            y: target.y,
            modifiers: this._keyboard._modifiers,
            data,
        });
    }
    /**
     * Performs a drag, dragenter, dragover, and drop in sequence.
     * @param target - point to drag from
     * @param target - point to drop on
     * @param options - An object of options. Accepts delay which,
     * if specified, is the time to wait between `dragover` and `drop` in milliseconds.
     * Defaults to 0.
     */
    async dragAndDrop(start, target, options = {}) {
        const { delay = null } = options;
        const data = await this.drag(start, target);
        await this.dragEnter(target, data);
        await this.dragOver(target, data);
        if (delay) {
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
        await this.drop(target, data);
        await this.up();
    }
}
exports.Mouse = Mouse;
/**
 * The Touchscreen class exposes touchscreen events.
 * @public
 */
class Touchscreen {
    /**
     * @internal
     */
    constructor(client, keyboard) {
        this._client = client;
        this._keyboard = keyboard;
    }
    /**
     * Dispatches a `touchstart` and `touchend` event.
     * @param x - Horizontal position of the tap.
     * @param y - Vertical position of the tap.
     */
    async tap(x, y) {
        const touchPoints = [{ x: Math.round(x), y: Math.round(y) }];
        await this._client.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints,
            modifiers: this._keyboard._modifiers,
        });
        await this._client.send('Input.dispatchTouchEvent', {
            type: 'touchEnd',
            touchPoints: [],
            modifiers: this._keyboard._modifiers,
        });
    }
}
exports.Touchscreen = Touchscreen;

},{"./USKeyboardLayout.js":48,"./assert.js":50}],35:[function(require,module,exports){
"use strict";
/**
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElementHandle = exports.JSHandle = exports.createJSHandle = void 0;
const assert_js_1 = require("./assert.js");
const helper_js_1 = require("./helper.js");
const QueryHandler_js_1 = require("./QueryHandler.js");
const environment_js_1 = require("../environment.js");
/**
 * @internal
 */
function createJSHandle(context, remoteObject) {
    const frame = context.frame();
    if (remoteObject.subtype === 'node' && frame) {
        const frameManager = frame._frameManager;
        return new ElementHandle(context, context._client, remoteObject, frameManager.page(), frameManager);
    }
    return new JSHandle(context, context._client, remoteObject);
}
exports.createJSHandle = createJSHandle;
/**
 * Represents an in-page JavaScript object. JSHandles can be created with the
 * {@link Page.evaluateHandle | page.evaluateHandle} method.
 *
 * @example
 * ```js
 * const windowHandle = await page.evaluateHandle(() => window);
 * ```
 *
 * JSHandle prevents the referenced JavaScript object from being garbage-collected
 * unless the handle is {@link JSHandle.dispose | disposed}. JSHandles are auto-
 * disposed when their origin frame gets navigated or the parent context gets destroyed.
 *
 * JSHandle instances can be used as arguments for {@link Page.$eval},
 * {@link Page.evaluate}, and {@link Page.evaluateHandle}.
 *
 * @public
 */
class JSHandle {
    /**
     * @internal
     */
    constructor(context, client, remoteObject) {
        /**
         * @internal
         */
        this._disposed = false;
        this._context = context;
        this._client = client;
        this._remoteObject = remoteObject;
    }
    /** Returns the execution context the handle belongs to.
     */
    executionContext() {
        return this._context;
    }
    /**
     * This method passes this handle as the first argument to `pageFunction`.
     * If `pageFunction` returns a Promise, then `handle.evaluate` would wait
     * for the promise to resolve and return its value.
     *
     * @example
     * ```js
     * const tweetHandle = await page.$('.tweet .retweets');
     * expect(await tweetHandle.evaluate(node => node.innerText)).toBe('10');
     * ```
     */
    async evaluate(pageFunction, ...args) {
        return await this.executionContext().evaluate(pageFunction, this, ...args);
    }
    /**
     * This method passes this handle as the first argument to `pageFunction`.
     *
     * @remarks
     *
     * The only difference between `jsHandle.evaluate` and
     * `jsHandle.evaluateHandle` is that `jsHandle.evaluateHandle`
     * returns an in-page object (JSHandle).
     *
     * If the function passed to `jsHandle.evaluateHandle` returns a Promise,
     * then `evaluateHandle.evaluateHandle` waits for the promise to resolve and
     * returns its value.
     *
     * See {@link Page.evaluateHandle} for more details.
     */
    async evaluateHandle(pageFunction, ...args) {
        return await this.executionContext().evaluateHandle(pageFunction, this, ...args);
    }
    /** Fetches a single property from the referenced object.
     */
    async getProperty(propertyName) {
        const objectHandle = await this.evaluateHandle((object, propertyName) => {
            const result = { __proto__: null };
            result[propertyName] = object[propertyName];
            return result;
        }, propertyName);
        const properties = await objectHandle.getProperties();
        const result = properties.get(propertyName);
        (0, assert_js_1.assert)(result instanceof JSHandle);
        await objectHandle.dispose();
        return result;
    }
    /**
     * The method returns a map with property names as keys and JSHandle
     * instances for the property values.
     *
     * @example
     * ```js
     * const listHandle = await page.evaluateHandle(() => document.body.children);
     * const properties = await listHandle.getProperties();
     * const children = [];
     * for (const property of properties.values()) {
     *   const element = property.asElement();
     *   if (element)
     *     children.push(element);
     * }
     * children; // holds elementHandles to all children of document.body
     * ```
     */
    async getProperties() {
        const response = await this._client.send('Runtime.getProperties', {
            objectId: this._remoteObject.objectId,
            ownProperties: true,
        });
        const result = new Map();
        for (const property of response.result) {
            if (!property.enumerable)
                continue;
            result.set(property.name, createJSHandle(this._context, property.value));
        }
        return result;
    }
    /**
     * @returns Returns a JSON representation of the object.If the object has a
     * `toJSON` function, it will not be called.
     * @remarks
     *
     * The JSON is generated by running {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify | JSON.stringify}
     * on the object in page and consequent {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse | JSON.parse} in puppeteer.
     * **NOTE** The method throws if the referenced object is not stringifiable.
     */
    async jsonValue() {
        if (this._remoteObject.objectId) {
            const response = await this._client.send('Runtime.callFunctionOn', {
                functionDeclaration: 'function() { return this; }',
                objectId: this._remoteObject.objectId,
                returnByValue: true,
                awaitPromise: true,
            });
            return helper_js_1.helper.valueFromRemoteObject(response.result);
        }
        return helper_js_1.helper.valueFromRemoteObject(this._remoteObject);
    }
    /**
     * @returns Either `null` or the object handle itself, if the object
     * handle is an instance of {@link ElementHandle}.
     */
    asElement() {
        /*  This always returns null, but subclasses can override this and return an
            ElementHandle.
        */
        return null;
    }
    /**
     * Stops referencing the element handle, and resolves when the object handle is
     * successfully disposed of.
     */
    async dispose() {
        if (this._disposed)
            return;
        this._disposed = true;
        await helper_js_1.helper.releaseObject(this._client, this._remoteObject);
    }
    /**
     * Returns a string representation of the JSHandle.
     *
     * @remarks Useful during debugging.
     */
    toString() {
        if (this._remoteObject.objectId) {
            const type = this._remoteObject.subtype || this._remoteObject.type;
            return 'JSHandle@' + type;
        }
        return 'JSHandle:' + helper_js_1.helper.valueFromRemoteObject(this._remoteObject);
    }
}
exports.JSHandle = JSHandle;
/**
 * ElementHandle represents an in-page DOM element.
 *
 * @remarks
 *
 * ElementHandles can be created with the {@link Page.$} method.
 *
 * ```js
 * const puppeteer = require('puppeteer');
 *
 * (async () => {
 *  const browser = await puppeteer.launch();
 *  const page = await browser.newPage();
 *  await page.goto('https://example.com');
 *  const hrefElement = await page.$('a');
 *  await hrefElement.click();
 *  // ...
 * })();
 * ```
 *
 * ElementHandle prevents the DOM element from being garbage-collected unless the
 * handle is {@link JSHandle.dispose | disposed}. ElementHandles are auto-disposed
 * when their origin frame gets navigated.
 *
 * ElementHandle instances can be used as arguments in {@link Page.$eval} and
 * {@link Page.evaluate} methods.
 *
 * If you're using TypeScript, ElementHandle takes a generic argument that
 * denotes the type of element the handle is holding within. For example, if you
 * have a handle to a `<select>` element, you can type it as
 * `ElementHandle<HTMLSelectElement>` and you get some nicer type checks.
 *
 * @public
 */
class ElementHandle extends JSHandle {
    /**
     * @internal
     */
    constructor(context, client, remoteObject, page, frameManager) {
        super(context, client, remoteObject);
        this._client = client;
        this._remoteObject = remoteObject;
        this._page = page;
        this._frameManager = frameManager;
    }
    asElement() {
        return this;
    }
    /**
     * Resolves to the content frame for element handles referencing
     * iframe nodes, or null otherwise
     */
    async contentFrame() {
        const nodeInfo = await this._client.send('DOM.describeNode', {
            objectId: this._remoteObject.objectId,
        });
        if (typeof nodeInfo.node.frameId !== 'string')
            return null;
        return this._frameManager.frame(nodeInfo.node.frameId);
    }
    async _scrollIntoViewIfNeeded() {
        const error = await this.evaluate(async (element, pageJavascriptEnabled) => {
            if (!element.isConnected)
                return 'Node is detached from document';
            if (element.nodeType !== Node.ELEMENT_NODE)
                return 'Node is not of type HTMLElement';
            // force-scroll if page's javascript is disabled.
            if (!pageJavascriptEnabled) {
                element.scrollIntoView({
                    block: 'center',
                    inline: 'center',
                    // @ts-expect-error Chrome still supports behavior: instant but
                    // it's not in the spec so TS shouts We don't want to make this
                    // breaking change in Puppeteer yet so we'll ignore the line.
                    behavior: 'instant',
                });
                return false;
            }
            const visibleRatio = await new Promise((resolve) => {
                const observer = new IntersectionObserver((entries) => {
                    resolve(entries[0].intersectionRatio);
                    observer.disconnect();
                });
                observer.observe(element);
            });
            if (visibleRatio !== 1.0) {
                element.scrollIntoView({
                    block: 'center',
                    inline: 'center',
                    // @ts-expect-error Chrome still supports behavior: instant but
                    // it's not in the spec so TS shouts We don't want to make this
                    // breaking change in Puppeteer yet so we'll ignore the line.
                    behavior: 'instant',
                });
            }
            return false;
        }, this._page.isJavaScriptEnabled());
        if (error)
            throw new Error(error);
    }
    /**
     * Returns the middle point within an element unless a specific offset is provided.
     */
    async clickablePoint(offset) {
        const [result, layoutMetrics] = await Promise.all([
            this._client
                .send('DOM.getContentQuads', {
                objectId: this._remoteObject.objectId,
            })
                .catch(helper_js_1.debugError),
            this._client.send('Page.getLayoutMetrics'),
        ]);
        if (!result || !result.quads.length)
            throw new Error('Node is either not clickable or not an HTMLElement');
        // Filter out quads that have too small area to click into.
        // Fallback to `layoutViewport` in case of using Firefox.
        const { clientWidth, clientHeight } = layoutMetrics.cssLayoutViewport || layoutMetrics.layoutViewport;
        const quads = result.quads
            .map((quad) => this._fromProtocolQuad(quad))
            .map((quad) => this._intersectQuadWithViewport(quad, clientWidth, clientHeight))
            .filter((quad) => computeQuadArea(quad) > 1);
        if (!quads.length)
            throw new Error('Node is either not clickable or not an HTMLElement');
        const quad = quads[0];
        if (offset) {
            // Return the point of the first quad identified by offset.
            let minX = Number.MAX_SAFE_INTEGER;
            let minY = Number.MAX_SAFE_INTEGER;
            for (const point of quad) {
                if (point.x < minX) {
                    minX = point.x;
                }
                if (point.y < minY) {
                    minY = point.y;
                }
            }
            if (minX !== Number.MAX_SAFE_INTEGER &&
                minY !== Number.MAX_SAFE_INTEGER) {
                return {
                    x: minX + offset.x,
                    y: minY + offset.y,
                };
            }
        }
        // Return the middle point of the first quad.
        let x = 0;
        let y = 0;
        for (const point of quad) {
            x += point.x;
            y += point.y;
        }
        return {
            x: x / 4,
            y: y / 4,
        };
    }
    _getBoxModel() {
        const params = {
            objectId: this._remoteObject.objectId,
        };
        return this._client
            .send('DOM.getBoxModel', params)
            .catch((error) => (0, helper_js_1.debugError)(error));
    }
    _fromProtocolQuad(quad) {
        return [
            { x: quad[0], y: quad[1] },
            { x: quad[2], y: quad[3] },
            { x: quad[4], y: quad[5] },
            { x: quad[6], y: quad[7] },
        ];
    }
    _intersectQuadWithViewport(quad, width, height) {
        return quad.map((point) => ({
            x: Math.min(Math.max(point.x, 0), width),
            y: Math.min(Math.max(point.y, 0), height),
        }));
    }
    /**
     * This method scrolls element into view if needed, and then
     * uses {@link Page.mouse} to hover over the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    async hover() {
        await this._scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint();
        await this._page.mouse.move(x, y);
    }
    /**
     * This method scrolls element into view if needed, and then
     * uses {@link Page.mouse} to click in the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    async click(options = {}) {
        await this._scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint(options.offset);
        await this._page.mouse.click(x, y, options);
    }
    /**
     * This method creates and captures a dragevent from the element.
     */
    async drag(target) {
        (0, assert_js_1.assert)(this._page.isDragInterceptionEnabled(), 'Drag Interception is not enabled!');
        await this._scrollIntoViewIfNeeded();
        const start = await this.clickablePoint();
        return await this._page.mouse.drag(start, target);
    }
    /**
     * This method creates a `dragenter` event on the element.
     */
    async dragEnter(data = { items: [], dragOperationsMask: 1 }) {
        await this._scrollIntoViewIfNeeded();
        const target = await this.clickablePoint();
        await this._page.mouse.dragEnter(target, data);
    }
    /**
     * This method creates a `dragover` event on the element.
     */
    async dragOver(data = { items: [], dragOperationsMask: 1 }) {
        await this._scrollIntoViewIfNeeded();
        const target = await this.clickablePoint();
        await this._page.mouse.dragOver(target, data);
    }
    /**
     * This method triggers a drop on the element.
     */
    async drop(data = { items: [], dragOperationsMask: 1 }) {
        await this._scrollIntoViewIfNeeded();
        const destination = await this.clickablePoint();
        await this._page.mouse.drop(destination, data);
    }
    /**
     * This method triggers a dragenter, dragover, and drop on the element.
     */
    async dragAndDrop(target, options) {
        await this._scrollIntoViewIfNeeded();
        const startPoint = await this.clickablePoint();
        const targetPoint = await target.clickablePoint();
        await this._page.mouse.dragAndDrop(startPoint, targetPoint, options);
    }
    /**
     * Triggers a `change` and `input` event once all the provided options have been
     * selected. If there's no `<select>` element matching `selector`, the method
     * throws an error.
     *
     * @example
     * ```js
     * handle.select('blue'); // single selection
     * handle.select('red', 'green', 'blue'); // multiple selections
     * ```
     * @param values - Values of options to select. If the `<select>` has the
     *    `multiple` attribute, all values are considered, otherwise only the first
     *    one is taken into account.
     */
    async select(...values) {
        for (const value of values)
            (0, assert_js_1.assert)(helper_js_1.helper.isString(value), 'Values must be strings. Found value "' +
                value +
                '" of type "' +
                typeof value +
                '"');
        return this.evaluate((element, values) => {
            if (!(element instanceof HTMLSelectElement))
                throw new Error('Element is not a <select> element.');
            const options = Array.from(element.options);
            element.value = undefined;
            for (const option of options) {
                option.selected = values.includes(option.value);
                if (option.selected && !element.multiple)
                    break;
            }
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return options
                .filter((option) => option.selected)
                .map((option) => option.value);
        }, values);
    }
    /**
     * This method expects `elementHandle` to point to an
     * {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input | input element}.
     * @param filePaths - Sets the value of the file input to these paths.
     *    If some of the  `filePaths` are relative paths, then they are resolved
     *    relative to the {@link https://nodejs.org/api/process.html#process_process_cwd | current working directory}
     */
    async uploadFile(...filePaths) {
        const isMultiple = await this.evaluate((element) => {
            if (!(element instanceof HTMLInputElement)) {
                throw new Error('uploadFile can only be called on an input element.');
            }
            return element.multiple;
        });
        (0, assert_js_1.assert)(filePaths.length <= 1 || isMultiple, 'Multiple file uploads only work with <input type=file multiple>');
        if (!environment_js_1.isNode) {
            throw new Error(`JSHandle#uploadFile can only be used in Node environments.`);
        }
        /*
         This import is only needed for `uploadFile`, so keep it scoped here to
         avoid paying the cost unnecessarily.
        */
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const fs = await helper_js_1.helper.importFSModule();
        // Locate all files and confirm that they exist.
        const files = await Promise.all(filePaths.map(async (filePath) => {
            const resolvedPath = path.resolve(filePath);
            try {
                await fs.promises.access(resolvedPath, fs.constants.R_OK);
            }
            catch (error) {
                if (error.code === 'ENOENT')
                    throw new Error(`${filePath} does not exist or is not readable`);
            }
            return resolvedPath;
        }));
        const { objectId } = this._remoteObject;
        const { node } = await this._client.send('DOM.describeNode', { objectId });
        const { backendNodeId } = node;
        /*  The zero-length array is a special case, it seems that
            DOM.setFileInputFiles does not actually update the files in that case,
            so the solution is to eval the element value to a new FileList directly.
        */
        if (files.length === 0) {
            await this.evaluate((element) => {
                element.files = new DataTransfer().files;
                // Dispatch events for this case because it should behave akin to a user action.
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }
        else {
            await this._client.send('DOM.setFileInputFiles', {
                objectId,
                files,
                backendNodeId,
            });
        }
    }
    /**
     * This method scrolls element into view if needed, and then uses
     * {@link Touchscreen.tap} to tap in the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    async tap() {
        await this._scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint();
        await this._page.touchscreen.tap(x, y);
    }
    /**
     * Calls {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus | focus} on the element.
     */
    async focus() {
        await this.evaluate((element) => element.focus());
    }
    /**
     * Focuses the element, and then sends a `keydown`, `keypress`/`input`, and
     * `keyup` event for each character in the text.
     *
     * To press a special key, like `Control` or `ArrowDown`,
     * use {@link ElementHandle.press}.
     *
     * @example
     * ```js
     * await elementHandle.type('Hello'); // Types instantly
     * await elementHandle.type('World', {delay: 100}); // Types slower, like a user
     * ```
     *
     * @example
     * An example of typing into a text field and then submitting the form:
     *
     * ```js
     * const elementHandle = await page.$('input');
     * await elementHandle.type('some text');
     * await elementHandle.press('Enter');
     * ```
     */
    async type(text, options) {
        await this.focus();
        await this._page.keyboard.type(text, options);
    }
    /**
     * Focuses the element, and then uses {@link Keyboard.down} and {@link Keyboard.up}.
     *
     * @remarks
     * If `key` is a single character and no modifier keys besides `Shift`
     * are being held down, a `keypress`/`input` event will also be generated.
     * The `text` option can be specified to force an input event to be generated.
     *
     * **NOTE** Modifier keys DO affect `elementHandle.press`. Holding down `Shift`
     * will type the text in upper case.
     *
     * @param key - Name of key to press, such as `ArrowLeft`.
     *    See {@link KeyInput} for a list of all key names.
     */
    async press(key, options) {
        await this.focus();
        await this._page.keyboard.press(key, options);
    }
    /**
     * This method returns the bounding box of the element (relative to the main frame),
     * or `null` if the element is not visible.
     */
    async boundingBox() {
        const result = await this._getBoxModel();
        if (!result)
            return null;
        const quad = result.model.border;
        const x = Math.min(quad[0], quad[2], quad[4], quad[6]);
        const y = Math.min(quad[1], quad[3], quad[5], quad[7]);
        const width = Math.max(quad[0], quad[2], quad[4], quad[6]) - x;
        const height = Math.max(quad[1], quad[3], quad[5], quad[7]) - y;
        return { x, y, width, height };
    }
    /**
     * This method returns boxes of the element, or `null` if the element is not visible.
     *
     * @remarks
     *
     * Boxes are represented as an array of points;
     * Each Point is an object `{x, y}`. Box points are sorted clock-wise.
     */
    async boxModel() {
        const result = await this._getBoxModel();
        if (!result)
            return null;
        const { content, padding, border, margin, width, height } = result.model;
        return {
            content: this._fromProtocolQuad(content),
            padding: this._fromProtocolQuad(padding),
            border: this._fromProtocolQuad(border),
            margin: this._fromProtocolQuad(margin),
            width,
            height,
        };
    }
    /**
     * This method scrolls element into view if needed, and then uses
     * {@link Page.screenshot} to take a screenshot of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    async screenshot(options = {}) {
        let needsViewportReset = false;
        let boundingBox = await this.boundingBox();
        (0, assert_js_1.assert)(boundingBox, 'Node is either not visible or not an HTMLElement');
        const viewport = this._page.viewport();
        if (viewport &&
            (boundingBox.width > viewport.width ||
                boundingBox.height > viewport.height)) {
            const newViewport = {
                width: Math.max(viewport.width, Math.ceil(boundingBox.width)),
                height: Math.max(viewport.height, Math.ceil(boundingBox.height)),
            };
            await this._page.setViewport(Object.assign({}, viewport, newViewport));
            needsViewportReset = true;
        }
        await this._scrollIntoViewIfNeeded();
        boundingBox = await this.boundingBox();
        (0, assert_js_1.assert)(boundingBox, 'Node is either not visible or not an HTMLElement');
        (0, assert_js_1.assert)(boundingBox.width !== 0, 'Node has 0 width.');
        (0, assert_js_1.assert)(boundingBox.height !== 0, 'Node has 0 height.');
        const layoutMetrics = await this._client.send('Page.getLayoutMetrics');
        // Fallback to `layoutViewport` in case of using Firefox.
        const { pageX, pageY } = layoutMetrics.cssLayoutViewport || layoutMetrics.layoutViewport;
        const clip = Object.assign({}, boundingBox);
        clip.x += pageX;
        clip.y += pageY;
        const imageData = await this._page.screenshot(Object.assign({}, {
            clip,
        }, options));
        if (needsViewportReset)
            await this._page.setViewport(viewport);
        return imageData;
    }
    /**
     * Runs `element.querySelector` within the page. If no element matches the selector,
     * the return value resolves to `null`.
     */
    async $(selector) {
        const { updatedSelector, queryHandler } = (0, QueryHandler_js_1.getQueryHandlerAndSelector)(selector);
        return queryHandler.queryOne(this, updatedSelector);
    }
    /**
     * Runs `element.querySelectorAll` within the page. If no elements match the selector,
     * the return value resolves to `[]`.
     */
    async $$(selector) {
        const { updatedSelector, queryHandler } = (0, QueryHandler_js_1.getQueryHandlerAndSelector)(selector);
        return queryHandler.queryAll(this, updatedSelector);
    }
    /**
     * This method runs `document.querySelector` within the element and passes it as
     * the first argument to `pageFunction`. If there's no element matching `selector`,
     * the method throws an error.
     *
     * If `pageFunction` returns a Promise, then `frame.$eval` would wait for the promise
     * to resolve and return its value.
     *
     * @example
     * ```js
     * const tweetHandle = await page.$('.tweet');
     * expect(await tweetHandle.$eval('.like', node => node.innerText)).toBe('100');
     * expect(await tweetHandle.$eval('.retweets', node => node.innerText)).toBe('10');
     * ```
     */
    async $eval(selector, pageFunction, ...args) {
        const elementHandle = await this.$(selector);
        if (!elementHandle)
            throw new Error(`Error: failed to find element matching selector "${selector}"`);
        const result = await elementHandle.evaluate(pageFunction, ...args);
        await elementHandle.dispose();
        /**
         * This `as` is a little unfortunate but helps TS understand the behavior of
         * `elementHandle.evaluate`. If evaluate returns an element it will return an
         * ElementHandle instance, rather than the plain object. All the
         * WrapElementHandle type does is wrap ReturnType into
         * ElementHandle<ReturnType> if it is an ElementHandle, or leave it alone as
         * ReturnType if it isn't.
         */
        return result;
    }
    /**
     * This method runs `document.querySelectorAll` within the element and passes it as
     * the first argument to `pageFunction`. If there's no element matching `selector`,
     * the method throws an error.
     *
     * If `pageFunction` returns a Promise, then `frame.$$eval` would wait for the
     * promise to resolve and return its value.
     *
     * @example
     * ```html
     * <div class="feed">
     *   <div class="tweet">Hello!</div>
     *   <div class="tweet">Hi!</div>
     * </div>
     * ```
     *
     * @example
     * ```js
     * const feedHandle = await page.$('.feed');
     * expect(await feedHandle.$$eval('.tweet', nodes => nodes.map(n => n.innerText)))
     *  .toEqual(['Hello!', 'Hi!']);
     * ```
     */
    async $$eval(selector, pageFunction, ...args) {
        const { updatedSelector, queryHandler } = (0, QueryHandler_js_1.getQueryHandlerAndSelector)(selector);
        const arrayHandle = await queryHandler.queryAllArray(this, updatedSelector);
        const result = await arrayHandle.evaluate(pageFunction, ...args);
        await arrayHandle.dispose();
        /* This `as` exists for the same reason as the `as` in $eval above.
         * See the comment there for a full explanation.
         */
        return result;
    }
    /**
     * The method evaluates the XPath expression relative to the elementHandle.
     * If there are no such elements, the method will resolve to an empty array.
     * @param expression - Expression to {@link https://developer.mozilla.org/en-US/docs/Web/API/Document/evaluate | evaluate}
     */
    async $x(expression) {
        const arrayHandle = await this.evaluateHandle((element, expression) => {
            const document = element.ownerDocument || element;
            const iterator = document.evaluate(expression, element, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE);
            const array = [];
            let item;
            while ((item = iterator.iterateNext()))
                array.push(item);
            return array;
        }, expression);
        const properties = await arrayHandle.getProperties();
        await arrayHandle.dispose();
        const result = [];
        for (const property of properties.values()) {
            const elementHandle = property.asElement();
            if (elementHandle)
                result.push(elementHandle);
        }
        return result;
    }
    /**
     * Resolves to true if the element is visible in the current viewport.
     */
    async isIntersectingViewport(options) {
        const { threshold = 0 } = options || {};
        return await this.evaluate(async (element, threshold) => {
            const visibleRatio = await new Promise((resolve) => {
                const observer = new IntersectionObserver((entries) => {
                    resolve(entries[0].intersectionRatio);
                    observer.disconnect();
                });
                observer.observe(element);
            });
            return threshold === 1 ? visibleRatio === 1 : visibleRatio > threshold;
        }, threshold);
    }
}
exports.ElementHandle = ElementHandle;
function computeQuadArea(quad) {
    /* Compute sum of all directed areas of adjacent triangles
      https://en.wikipedia.org/wiki/Polygon#Simple_polygons
    */
    let area = 0;
    for (let i = 0; i < quad.length; ++i) {
        const p1 = quad[i];
        const p2 = quad[(i + 1) % quad.length];
        area += (p1.x * p2.y - p2.x * p1.y) / 2;
    }
    return Math.abs(area);
}

},{"../environment.js":53,"./QueryHandler.js":42,"./assert.js":50,"./helper.js":52,"path":12}],36:[function(require,module,exports){
"use strict";
/**
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LifecycleWatcher = void 0;
const assert_js_1 = require("./assert.js");
const helper_js_1 = require("./helper.js");
const Errors_js_1 = require("./Errors.js");
const FrameManager_js_1 = require("./FrameManager.js");
const NetworkManager_js_1 = require("./NetworkManager.js");
const Connection_js_1 = require("./Connection.js");
const puppeteerToProtocolLifecycle = new Map([
    ['load', 'load'],
    ['domcontentloaded', 'DOMContentLoaded'],
    ['networkidle0', 'networkIdle'],
    ['networkidle2', 'networkAlmostIdle'],
]);
/**
 * @internal
 */
class LifecycleWatcher {
    constructor(frameManager, frame, waitUntil, timeout) {
        if (Array.isArray(waitUntil))
            waitUntil = waitUntil.slice();
        else if (typeof waitUntil === 'string')
            waitUntil = [waitUntil];
        this._expectedLifecycle = waitUntil.map((value) => {
            const protocolEvent = puppeteerToProtocolLifecycle.get(value);
            (0, assert_js_1.assert)(protocolEvent, 'Unknown value for options.waitUntil: ' + value);
            return protocolEvent;
        });
        this._frameManager = frameManager;
        this._frame = frame;
        this._initialLoaderId = frame._loaderId;
        this._timeout = timeout;
        this._navigationRequest = null;
        this._eventListeners = [
            helper_js_1.helper.addEventListener(frameManager._client, Connection_js_1.CDPSessionEmittedEvents.Disconnected, () => this._terminate(new Error('Navigation failed because browser has disconnected!'))),
            helper_js_1.helper.addEventListener(this._frameManager, FrameManager_js_1.FrameManagerEmittedEvents.LifecycleEvent, this._checkLifecycleComplete.bind(this)),
            helper_js_1.helper.addEventListener(this._frameManager, FrameManager_js_1.FrameManagerEmittedEvents.FrameNavigatedWithinDocument, this._navigatedWithinDocument.bind(this)),
            helper_js_1.helper.addEventListener(this._frameManager, FrameManager_js_1.FrameManagerEmittedEvents.FrameDetached, this._onFrameDetached.bind(this)),
            helper_js_1.helper.addEventListener(this._frameManager.networkManager(), NetworkManager_js_1.NetworkManagerEmittedEvents.Request, this._onRequest.bind(this)),
        ];
        this._sameDocumentNavigationPromise = new Promise((fulfill) => {
            this._sameDocumentNavigationCompleteCallback = fulfill;
        });
        this._lifecyclePromise = new Promise((fulfill) => {
            this._lifecycleCallback = fulfill;
        });
        this._newDocumentNavigationPromise = new Promise((fulfill) => {
            this._newDocumentNavigationCompleteCallback = fulfill;
        });
        this._timeoutPromise = this._createTimeoutPromise();
        this._terminationPromise = new Promise((fulfill) => {
            this._terminationCallback = fulfill;
        });
        this._checkLifecycleComplete();
    }
    _onRequest(request) {
        if (request.frame() !== this._frame || !request.isNavigationRequest())
            return;
        this._navigationRequest = request;
    }
    _onFrameDetached(frame) {
        if (this._frame === frame) {
            this._terminationCallback.call(null, new Error('Navigating frame was detached'));
            return;
        }
        this._checkLifecycleComplete();
    }
    async navigationResponse() {
        // We may need to wait for ExtraInfo events before the request is complete.
        return this._navigationRequest ? this._navigationRequest.response() : null;
    }
    _terminate(error) {
        this._terminationCallback.call(null, error);
    }
    sameDocumentNavigationPromise() {
        return this._sameDocumentNavigationPromise;
    }
    newDocumentNavigationPromise() {
        return this._newDocumentNavigationPromise;
    }
    lifecyclePromise() {
        return this._lifecyclePromise;
    }
    timeoutOrTerminationPromise() {
        return Promise.race([this._timeoutPromise, this._terminationPromise]);
    }
    _createTimeoutPromise() {
        if (!this._timeout)
            return new Promise(() => { });
        const errorMessage = 'Navigation timeout of ' + this._timeout + ' ms exceeded';
        return new Promise((fulfill) => (this._maximumTimer = setTimeout(fulfill, this._timeout))).then(() => new Errors_js_1.TimeoutError(errorMessage));
    }
    _navigatedWithinDocument(frame) {
        if (frame !== this._frame)
            return;
        this._hasSameDocumentNavigation = true;
        this._checkLifecycleComplete();
    }
    _checkLifecycleComplete() {
        // We expect navigation to commit.
        if (!checkLifecycle(this._frame, this._expectedLifecycle))
            return;
        this._lifecycleCallback();
        if (this._frame._loaderId === this._initialLoaderId &&
            !this._hasSameDocumentNavigation)
            return;
        if (this._hasSameDocumentNavigation)
            this._sameDocumentNavigationCompleteCallback();
        if (this._frame._loaderId !== this._initialLoaderId)
            this._newDocumentNavigationCompleteCallback();
        /**
         * @param {!Frame} frame
         * @param {!Array<string>} expectedLifecycle
         * @returns {boolean}
         */
        function checkLifecycle(frame, expectedLifecycle) {
            for (const event of expectedLifecycle) {
                if (!frame._lifecycleEvents.has(event))
                    return false;
            }
            for (const child of frame.childFrames()) {
                if (!checkLifecycle(child, expectedLifecycle))
                    return false;
            }
            return true;
        }
    }
    dispose() {
        helper_js_1.helper.removeEventListeners(this._eventListeners);
        clearTimeout(this._maximumTimer);
    }
}
exports.LifecycleWatcher = LifecycleWatcher;

},{"./Connection.js":19,"./Errors.js":27,"./FrameManager.js":31,"./NetworkManager.js":38,"./assert.js":50,"./helper.js":52}],37:[function(require,module,exports){
"use strict";
/**
 * Copyright 2021 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.networkConditions = void 0;
/**
 * @public
 */
exports.networkConditions = {
    'Slow 3G': {
        download: ((500 * 1000) / 8) * 0.8,
        upload: ((500 * 1000) / 8) * 0.8,
        latency: 400 * 5,
    },
    'Fast 3G': {
        download: ((1.6 * 1000 * 1000) / 8) * 0.9,
        upload: ((750 * 1000) / 8) * 0.9,
        latency: 150 * 3.75,
    },
};

},{}],38:[function(require,module,exports){
"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkManager = exports.NetworkManagerEmittedEvents = void 0;
const EventEmitter_js_1 = require("./EventEmitter.js");
const assert_js_1 = require("./assert.js");
const helper_js_1 = require("./helper.js");
const HTTPRequest_js_1 = require("./HTTPRequest.js");
const HTTPResponse_js_1 = require("./HTTPResponse.js");
/**
 * We use symbols to prevent any external parties listening to these events.
 * They are internal to Puppeteer.
 *
 * @internal
 */
exports.NetworkManagerEmittedEvents = {
    Request: Symbol('NetworkManager.Request'),
    RequestServedFromCache: Symbol('NetworkManager.RequestServedFromCache'),
    Response: Symbol('NetworkManager.Response'),
    RequestFailed: Symbol('NetworkManager.RequestFailed'),
    RequestFinished: Symbol('NetworkManager.RequestFinished'),
};
/**
 * @internal
 */
class NetworkManager extends EventEmitter_js_1.EventEmitter {
    constructor(client, ignoreHTTPSErrors, frameManager) {
        super();
        /*
         * There are four possible orders of events:
         *  A. `_onRequestWillBeSent`
         *  B. `_onRequestWillBeSent`, `_onRequestPaused`
         *  C. `_onRequestPaused`, `_onRequestWillBeSent`
         *  D. `_onRequestPaused`, `_onRequestWillBeSent`, `_onRequestPaused`
         *     (see crbug.com/1196004)
         *
         * For `_onRequest` we need the event from `_onRequestWillBeSent` and
         * optionally the `interceptionId` from `_onRequestPaused`.
         *
         * If request interception is disabled, call `_onRequest` once per call to
         * `_onRequestWillBeSent`.
         * If request interception is enabled, call `_onRequest` once per call to
         * `_onRequestPaused` (once per `interceptionId`).
         *
         * Events are stored to allow for subsequent events to call `_onRequest`.
         *
         * Note that (chains of) redirect requests have the same `requestId` (!) as
         * the original request. We have to anticipate series of events like these:
         *  A. `_onRequestWillBeSent`,
         *     `_onRequestWillBeSent`, ...
         *  B. `_onRequestWillBeSent`, `_onRequestPaused`,
         *     `_onRequestWillBeSent`, `_onRequestPaused`, ...
         *  C. `_onRequestWillBeSent`, `_onRequestPaused`,
         *     `_onRequestPaused`, `_onRequestWillBeSent`, ...
         *  D. `_onRequestPaused`, `_onRequestWillBeSent`,
         *     `_onRequestPaused`, `_onRequestWillBeSent`, `_onRequestPaused`, ...
         *     (see crbug.com/1196004)
         */
        this._requestIdToRequestWillBeSentEvent = new Map();
        this._requestIdToRequestPausedEvent = new Map();
        this._requestIdToRequest = new Map();
        /*
         * The below maps are used to reconcile Network.responseReceivedExtraInfo
         * events with their corresponding request. Each response and redirect
         * response gets an ExtraInfo event, and we don't know which will come first.
         * This means that we have to store a Response or an ExtraInfo for each
         * response, and emit the event when we get both of them. In addition, to
         * handle redirects, we have to make them Arrays to represent the chain of
         * events.
         */
        this._requestIdToResponseReceivedExtraInfo = new Map();
        this._requestIdToQueuedRedirectInfoMap = new Map();
        this._requestIdToQueuedEvents = new Map();
        this._extraHTTPHeaders = {};
        this._credentials = null;
        this._attemptedAuthentications = new Set();
        this._userRequestInterceptionEnabled = false;
        this._protocolRequestInterceptionEnabled = false;
        this._userCacheDisabled = false;
        this._emulatedNetworkConditions = {
            offline: false,
            upload: -1,
            download: -1,
            latency: 0,
        };
        this._client = client;
        this._ignoreHTTPSErrors = ignoreHTTPSErrors;
        this._frameManager = frameManager;
        this._client.on('Fetch.requestPaused', this._onRequestPaused.bind(this));
        this._client.on('Fetch.authRequired', this._onAuthRequired.bind(this));
        this._client.on('Network.requestWillBeSent', this._onRequestWillBeSent.bind(this));
        this._client.on('Network.requestServedFromCache', this._onRequestServedFromCache.bind(this));
        this._client.on('Network.responseReceived', this._onResponseReceived.bind(this));
        this._client.on('Network.loadingFinished', this._onLoadingFinished.bind(this));
        this._client.on('Network.loadingFailed', this._onLoadingFailed.bind(this));
        this._client.on('Network.responseReceivedExtraInfo', this._onResponseReceivedExtraInfo.bind(this));
    }
    async initialize() {
        await this._client.send('Network.enable');
        if (this._ignoreHTTPSErrors)
            await this._client.send('Security.setIgnoreCertificateErrors', {
                ignore: true,
            });
    }
    async authenticate(credentials) {
        this._credentials = credentials;
        await this._updateProtocolRequestInterception();
    }
    async setExtraHTTPHeaders(extraHTTPHeaders) {
        this._extraHTTPHeaders = {};
        for (const key of Object.keys(extraHTTPHeaders)) {
            const value = extraHTTPHeaders[key];
            (0, assert_js_1.assert)(helper_js_1.helper.isString(value), `Expected value of header "${key}" to be String, but "${typeof value}" is found.`);
            this._extraHTTPHeaders[key.toLowerCase()] = value;
        }
        await this._client.send('Network.setExtraHTTPHeaders', {
            headers: this._extraHTTPHeaders,
        });
    }
    extraHTTPHeaders() {
        return Object.assign({}, this._extraHTTPHeaders);
    }
    numRequestsInProgress() {
        return [...this._requestIdToRequest].filter(([, request]) => {
            return !request.response();
        }).length;
    }
    async setOfflineMode(value) {
        this._emulatedNetworkConditions.offline = value;
        await this._updateNetworkConditions();
    }
    async emulateNetworkConditions(networkConditions) {
        this._emulatedNetworkConditions.upload = networkConditions
            ? networkConditions.upload
            : -1;
        this._emulatedNetworkConditions.download = networkConditions
            ? networkConditions.download
            : -1;
        this._emulatedNetworkConditions.latency = networkConditions
            ? networkConditions.latency
            : 0;
        await this._updateNetworkConditions();
    }
    async _updateNetworkConditions() {
        await this._client.send('Network.emulateNetworkConditions', {
            offline: this._emulatedNetworkConditions.offline,
            latency: this._emulatedNetworkConditions.latency,
            uploadThroughput: this._emulatedNetworkConditions.upload,
            downloadThroughput: this._emulatedNetworkConditions.download,
        });
    }
    async setUserAgent(userAgent, userAgentMetadata) {
        await this._client.send('Network.setUserAgentOverride', {
            userAgent: userAgent,
            userAgentMetadata: userAgentMetadata,
        });
    }
    async setCacheEnabled(enabled) {
        this._userCacheDisabled = !enabled;
        await this._updateProtocolCacheDisabled();
    }
    async setRequestInterception(value) {
        this._userRequestInterceptionEnabled = value;
        await this._updateProtocolRequestInterception();
    }
    async _updateProtocolRequestInterception() {
        const enabled = this._userRequestInterceptionEnabled || !!this._credentials;
        if (enabled === this._protocolRequestInterceptionEnabled)
            return;
        this._protocolRequestInterceptionEnabled = enabled;
        if (enabled) {
            await Promise.all([
                this._updateProtocolCacheDisabled(),
                this._client.send('Fetch.enable', {
                    handleAuthRequests: true,
                    patterns: [{ urlPattern: '*' }],
                }),
            ]);
        }
        else {
            await Promise.all([
                this._updateProtocolCacheDisabled(),
                this._client.send('Fetch.disable'),
            ]);
        }
    }
    _cacheDisabled() {
        return this._userCacheDisabled;
    }
    async _updateProtocolCacheDisabled() {
        await this._client.send('Network.setCacheDisabled', {
            cacheDisabled: this._cacheDisabled(),
        });
    }
    _onRequestWillBeSent(event) {
        // Request interception doesn't happen for data URLs with Network Service.
        if (this._userRequestInterceptionEnabled &&
            !event.request.url.startsWith('data:')) {
            const requestId = event.requestId;
            const requestPausedEvent = this._requestIdToRequestPausedEvent.get(requestId);
            this._requestIdToRequestWillBeSentEvent.set(requestId, event);
            if (requestPausedEvent) {
                const interceptionId = requestPausedEvent.requestId;
                this._onRequest(event, interceptionId);
                this._requestIdToRequestPausedEvent.delete(requestId);
            }
            return;
        }
        this._onRequest(event, null);
    }
    _onAuthRequired(event) {
        let response = 'Default';
        if (this._attemptedAuthentications.has(event.requestId)) {
            response = 'CancelAuth';
        }
        else if (this._credentials) {
            response = 'ProvideCredentials';
            this._attemptedAuthentications.add(event.requestId);
        }
        const { username, password } = this._credentials || {
            username: undefined,
            password: undefined,
        };
        this._client
            .send('Fetch.continueWithAuth', {
            requestId: event.requestId,
            authChallengeResponse: { response, username, password },
        })
            .catch(helper_js_1.debugError);
    }
    _onRequestPaused(event) {
        if (!this._userRequestInterceptionEnabled &&
            this._protocolRequestInterceptionEnabled) {
            this._client
                .send('Fetch.continueRequest', {
                requestId: event.requestId,
            })
                .catch(helper_js_1.debugError);
        }
        const requestId = event.networkId;
        const interceptionId = event.requestId;
        if (!requestId) {
            return;
        }
        let requestWillBeSentEvent = this._requestIdToRequestWillBeSentEvent.get(requestId);
        // redirect requests have the same `requestId`,
        if (requestWillBeSentEvent &&
            (requestWillBeSentEvent.request.url !== event.request.url ||
                requestWillBeSentEvent.request.method !== event.request.method)) {
            this._requestIdToRequestWillBeSentEvent.delete(requestId);
            requestWillBeSentEvent = null;
        }
        if (requestWillBeSentEvent) {
            this._onRequest(requestWillBeSentEvent, interceptionId);
            this._requestIdToRequestWillBeSentEvent.delete(requestId);
        }
        else {
            this._requestIdToRequestPausedEvent.set(requestId, event);
        }
    }
    _requestIdToQueuedRedirectInfo(requestId) {
        if (!this._requestIdToQueuedRedirectInfoMap.has(requestId)) {
            this._requestIdToQueuedRedirectInfoMap.set(requestId, []);
        }
        return this._requestIdToQueuedRedirectInfoMap.get(requestId);
    }
    _requestIdToResponseExtraInfo(requestId) {
        if (!this._requestIdToResponseReceivedExtraInfo.has(requestId)) {
            this._requestIdToResponseReceivedExtraInfo.set(requestId, []);
        }
        return this._requestIdToResponseReceivedExtraInfo.get(requestId);
    }
    _onRequest(event, interceptionId) {
        let redirectChain = [];
        if (event.redirectResponse) {
            // We want to emit a response and requestfinished for the
            // redirectResponse, but we can't do so unless we have a
            // responseExtraInfo ready to pair it up with. If we don't have any
            // responseExtraInfos saved in our queue, they we have to wait until
            // the next one to emit response and requestfinished, *and* we should
            // also wait to emit this Request too because it should come after the
            // response/requestfinished.
            let redirectResponseExtraInfo = null;
            if (event.redirectHasExtraInfo) {
                redirectResponseExtraInfo = this._requestIdToResponseExtraInfo(event.requestId).shift();
                if (!redirectResponseExtraInfo) {
                    this._requestIdToQueuedRedirectInfo(event.requestId).push({
                        event,
                        interceptionId,
                    });
                    return;
                }
            }
            const request = this._requestIdToRequest.get(event.requestId);
            // If we connect late to the target, we could have missed the
            // requestWillBeSent event.
            if (request) {
                this._handleRequestRedirect(request, event.redirectResponse, redirectResponseExtraInfo);
                redirectChain = request._redirectChain;
            }
        }
        const frame = event.frameId
            ? this._frameManager.frame(event.frameId)
            : null;
        const request = new HTTPRequest_js_1.HTTPRequest(this._client, frame, interceptionId, this._userRequestInterceptionEnabled, event, redirectChain);
        this._requestIdToRequest.set(event.requestId, request);
        this.emit(exports.NetworkManagerEmittedEvents.Request, request);
        request.finalizeInterceptions();
    }
    _onRequestServedFromCache(event) {
        const request = this._requestIdToRequest.get(event.requestId);
        if (request)
            request._fromMemoryCache = true;
        this.emit(exports.NetworkManagerEmittedEvents.RequestServedFromCache, request);
    }
    _handleRequestRedirect(request, responsePayload, extraInfo) {
        const response = new HTTPResponse_js_1.HTTPResponse(this._client, request, responsePayload, extraInfo);
        request._response = response;
        request._redirectChain.push(request);
        response._resolveBody(new Error('Response body is unavailable for redirect responses'));
        this._forgetRequest(request, false);
        this.emit(exports.NetworkManagerEmittedEvents.Response, response);
        this.emit(exports.NetworkManagerEmittedEvents.RequestFinished, request);
    }
    _emitResponseEvent(responseReceived, extraInfo) {
        const request = this._requestIdToRequest.get(responseReceived.requestId);
        // FileUpload sends a response without a matching request.
        if (!request)
            return;
        const extraInfos = this._requestIdToResponseExtraInfo(responseReceived.requestId);
        if (extraInfos.length) {
            (0, helper_js_1.debugError)(new Error('Unexpected extraInfo events for request ' +
                responseReceived.requestId));
        }
        const response = new HTTPResponse_js_1.HTTPResponse(this._client, request, responseReceived.response, extraInfo);
        request._response = response;
        this.emit(exports.NetworkManagerEmittedEvents.Response, response);
    }
    _onResponseReceived(event) {
        const request = this._requestIdToRequest.get(event.requestId);
        let extraInfo = null;
        if (request && !request._fromMemoryCache && event.hasExtraInfo) {
            extraInfo = this._requestIdToResponseExtraInfo(event.requestId).shift();
            if (!extraInfo) {
                // Wait until we get the corresponding ExtraInfo event.
                let resolver = null;
                const promise = new Promise((resolve) => (resolver = resolve));
                this._requestIdToQueuedEvents.set(event.requestId, {
                    responseReceived: event,
                    promise,
                    resolver,
                });
                return;
            }
        }
        this._emitResponseEvent(event, extraInfo);
    }
    responseWaitingForExtraInfoPromise(requestId) {
        const responseReceived = this._requestIdToQueuedEvents.get(requestId);
        if (!responseReceived)
            return Promise.resolve();
        return responseReceived.promise;
    }
    _onResponseReceivedExtraInfo(event) {
        // We may have skipped a redirect response/request pair due to waiting for
        // this ExtraInfo event. If so, continue that work now that we have the
        // request.
        const redirectInfo = this._requestIdToQueuedRedirectInfo(event.requestId).shift();
        if (redirectInfo) {
            this._requestIdToResponseExtraInfo(event.requestId).push(event);
            this._onRequest(redirectInfo.event, redirectInfo.interceptionId);
            return;
        }
        // We may have skipped response and loading events because we didn't have
        // this ExtraInfo event yet. If so, emit those events now.
        const queuedEvents = this._requestIdToQueuedEvents.get(event.requestId);
        if (queuedEvents) {
            this._emitResponseEvent(queuedEvents.responseReceived, event);
            if (queuedEvents.loadingFinished) {
                this._emitLoadingFinished(queuedEvents.loadingFinished);
            }
            if (queuedEvents.loadingFailed) {
                this._emitLoadingFailed(queuedEvents.loadingFailed);
            }
            queuedEvents.resolver();
            return;
        }
        // Wait until we get another event that can use this ExtraInfo event.
        this._requestIdToResponseExtraInfo(event.requestId).push(event);
    }
    _forgetRequest(request, events) {
        const requestId = request._requestId;
        const interceptionId = request._interceptionId;
        this._requestIdToRequest.delete(requestId);
        this._attemptedAuthentications.delete(interceptionId);
        if (events) {
            this._requestIdToRequestWillBeSentEvent.delete(requestId);
            this._requestIdToRequestPausedEvent.delete(requestId);
            this._requestIdToQueuedEvents.delete(requestId);
            this._requestIdToQueuedRedirectInfoMap.delete(requestId);
            this._requestIdToResponseReceivedExtraInfo.delete(requestId);
        }
    }
    _onLoadingFinished(event) {
        // If the response event for this request is still waiting on a
        // corresponding ExtraInfo event, then wait to emit this event too.
        const queuedEvents = this._requestIdToQueuedEvents.get(event.requestId);
        if (queuedEvents) {
            queuedEvents.loadingFinished = event;
        }
        else {
            this._emitLoadingFinished(event);
        }
    }
    _emitLoadingFinished(event) {
        const request = this._requestIdToRequest.get(event.requestId);
        // For certain requestIds we never receive requestWillBeSent event.
        // @see https://crbug.com/750469
        if (!request)
            return;
        // Under certain conditions we never get the Network.responseReceived
        // event from protocol. @see https://crbug.com/883475
        if (request.response())
            request.response()._resolveBody(null);
        this._forgetRequest(request, true);
        this.emit(exports.NetworkManagerEmittedEvents.RequestFinished, request);
    }
    _onLoadingFailed(event) {
        // If the response event for this request is still waiting on a
        // corresponding ExtraInfo event, then wait to emit this event too.
        const queuedEvents = this._requestIdToQueuedEvents.get(event.requestId);
        if (queuedEvents) {
            queuedEvents.loadingFailed = event;
        }
        else {
            this._emitLoadingFailed(event);
        }
    }
    _emitLoadingFailed(event) {
        const request = this._requestIdToRequest.get(event.requestId);
        // For certain requestIds we never receive requestWillBeSent event.
        // @see https://crbug.com/750469
        if (!request)
            return;
        request._failureText = event.errorText;
        const response = request.response();
        if (response)
            response._resolveBody(null);
        this._forgetRequest(request, true);
        this.emit(exports.NetworkManagerEmittedEvents.RequestFailed, request);
    }
}
exports.NetworkManager = NetworkManager;

},{"./EventEmitter.js":28,"./HTTPRequest.js":32,"./HTTPResponse.js":33,"./assert.js":50,"./helper.js":52}],39:[function(require,module,exports){
"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.paperFormats = void 0;
/**
 * @internal
 */
exports.paperFormats = {
    letter: { width: 8.5, height: 11 },
    legal: { width: 8.5, height: 14 },
    tabloid: { width: 11, height: 17 },
    ledger: { width: 17, height: 11 },
    a0: { width: 33.1, height: 46.8 },
    a1: { width: 23.4, height: 33.1 },
    a2: { width: 16.54, height: 23.4 },
    a3: { width: 11.7, height: 16.54 },
    a4: { width: 8.27, height: 11.7 },
    a5: { width: 5.83, height: 8.27 },
    a6: { width: 4.13, height: 5.83 },
};

},{}],40:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Page = void 0;
const EventEmitter_js_1 = require("./EventEmitter.js");
const Connection_js_1 = require("./Connection.js");
const Dialog_js_1 = require("./Dialog.js");
const EmulationManager_js_1 = require("./EmulationManager.js");
const FrameManager_js_1 = require("./FrameManager.js");
const Input_js_1 = require("./Input.js");
const Tracing_js_1 = require("./Tracing.js");
const assert_js_1 = require("./assert.js");
const helper_js_1 = require("./helper.js");
const Coverage_js_1 = require("./Coverage.js");
const WebWorker_js_1 = require("./WebWorker.js");
const JSHandle_js_1 = require("./JSHandle.js");
const NetworkManager_js_1 = require("./NetworkManager.js");
const Accessibility_js_1 = require("./Accessibility.js");
const TimeoutSettings_js_1 = require("./TimeoutSettings.js");
const FileChooser_js_1 = require("./FileChooser.js");
const ConsoleMessage_js_1 = require("./ConsoleMessage.js");
const PDFOptions_js_1 = require("./PDFOptions.js");
const environment_js_1 = require("../environment.js");
/**
 * Page provides methods to interact with a single tab or
 * {@link https://developer.chrome.com/extensions/background_pages | extension background page} in Chromium.
 *
 * @remarks
 *
 * One Browser instance might have multiple Page instances.
 *
 * @example
 * This example creates a page, navigates it to a URL, and then * saves a screenshot:
 * ```js
 * const puppeteer = require('puppeteer');
 *
 * (async () => {
 *   const browser = await puppeteer.launch();
 *   const page = await browser.newPage();
 *   await page.goto('https://example.com');
 *   await page.screenshot({path: 'screenshot.png'});
 *   await browser.close();
 * })();
 * ```
 *
 * The Page class extends from Puppeteer's {@link EventEmitter} class and will
 * emit various events which are documented in the {@link PageEmittedEvents} enum.
 *
 * @example
 * This example logs a message for a single page `load` event:
 * ```js
 * page.once('load', () => console.log('Page loaded!'));
 * ```
 *
 * To unsubscribe from events use the `off` method:
 *
 * ```js
 * function logRequest(interceptedRequest) {
 *   console.log('A request was made:', interceptedRequest.url());
 * }
 * page.on('request', logRequest);
 * // Sometime later...
 * page.off('request', logRequest);
 * ```
 * @public
 */
class Page extends EventEmitter_js_1.EventEmitter {
    /**
     * @internal
     */
    constructor(client, target, ignoreHTTPSErrors, screenshotTaskQueue) {
        super();
        this._closed = false;
        this._timeoutSettings = new TimeoutSettings_js_1.TimeoutSettings();
        this._pageBindings = new Map();
        this._javascriptEnabled = true;
        this._workers = new Map();
        // TODO: improve this typedef - it's a function that takes a file chooser or
        // something?
        this._fileChooserInterceptors = new Set();
        this._userDragInterceptionEnabled = false;
        this._handlerMap = new WeakMap();
        this._client = client;
        this._target = target;
        this._keyboard = new Input_js_1.Keyboard(client);
        this._mouse = new Input_js_1.Mouse(client, this._keyboard);
        this._touchscreen = new Input_js_1.Touchscreen(client, this._keyboard);
        this._accessibility = new Accessibility_js_1.Accessibility(client);
        this._frameManager = new FrameManager_js_1.FrameManager(client, this, ignoreHTTPSErrors, this._timeoutSettings);
        this._emulationManager = new EmulationManager_js_1.EmulationManager(client);
        this._tracing = new Tracing_js_1.Tracing(client);
        this._coverage = new Coverage_js_1.Coverage(client);
        this._screenshotTaskQueue = screenshotTaskQueue;
        this._viewport = null;
        client.on('Target.attachedToTarget', (event) => {
            if (event.targetInfo.type !== 'worker' &&
                event.targetInfo.type !== 'iframe') {
                // If we don't detach from service workers, they will never die.
                // We still want to attach to workers for emitting events.
                // We still want to attach to iframes so sessions may interact with them.
                // We detach from all other types out of an abundance of caution.
                // See https://source.chromium.org/chromium/chromium/src/+/main:content/browser/devtools/devtools_agent_host_impl.cc?ss=chromium&q=f:devtools%20-f:out%20%22::kTypePage%5B%5D%22
                // for the complete list of available types.
                client
                    .send('Target.detachFromTarget', {
                    sessionId: event.sessionId,
                })
                    .catch(helper_js_1.debugError);
                return;
            }
            if (event.targetInfo.type === 'worker') {
                const session = Connection_js_1.Connection.fromSession(client).session(event.sessionId);
                const worker = new WebWorker_js_1.WebWorker(session, event.targetInfo.url, this._addConsoleMessage.bind(this), this._handleException.bind(this));
                this._workers.set(event.sessionId, worker);
                this.emit("workercreated" /* WorkerCreated */, worker);
            }
        });
        client.on('Target.detachedFromTarget', (event) => {
            const worker = this._workers.get(event.sessionId);
            if (!worker)
                return;
            this._workers.delete(event.sessionId);
            this.emit("workerdestroyed" /* WorkerDestroyed */, worker);
        });
        this._frameManager.on(FrameManager_js_1.FrameManagerEmittedEvents.FrameAttached, (event) => this.emit("frameattached" /* FrameAttached */, event));
        this._frameManager.on(FrameManager_js_1.FrameManagerEmittedEvents.FrameDetached, (event) => this.emit("framedetached" /* FrameDetached */, event));
        this._frameManager.on(FrameManager_js_1.FrameManagerEmittedEvents.FrameNavigated, (event) => this.emit("framenavigated" /* FrameNavigated */, event));
        const networkManager = this._frameManager.networkManager();
        networkManager.on(NetworkManager_js_1.NetworkManagerEmittedEvents.Request, (event) => this.emit("request" /* Request */, event));
        networkManager.on(NetworkManager_js_1.NetworkManagerEmittedEvents.RequestServedFromCache, (event) => this.emit("requestservedfromcache" /* RequestServedFromCache */, event));
        networkManager.on(NetworkManager_js_1.NetworkManagerEmittedEvents.Response, (event) => this.emit("response" /* Response */, event));
        networkManager.on(NetworkManager_js_1.NetworkManagerEmittedEvents.RequestFailed, (event) => this.emit("requestfailed" /* RequestFailed */, event));
        networkManager.on(NetworkManager_js_1.NetworkManagerEmittedEvents.RequestFinished, (event) => this.emit("requestfinished" /* RequestFinished */, event));
        this._fileChooserInterceptors = new Set();
        client.on('Page.domContentEventFired', () => this.emit("domcontentloaded" /* DOMContentLoaded */));
        client.on('Page.loadEventFired', () => this.emit("load" /* Load */));
        client.on('Runtime.consoleAPICalled', (event) => this._onConsoleAPI(event));
        client.on('Runtime.bindingCalled', (event) => this._onBindingCalled(event));
        client.on('Page.javascriptDialogOpening', (event) => this._onDialog(event));
        client.on('Runtime.exceptionThrown', (exception) => this._handleException(exception.exceptionDetails));
        client.on('Inspector.targetCrashed', () => this._onTargetCrashed());
        client.on('Performance.metrics', (event) => this._emitMetrics(event));
        client.on('Log.entryAdded', (event) => this._onLogEntryAdded(event));
        client.on('Page.fileChooserOpened', (event) => this._onFileChooser(event));
        this._target._isClosedPromise.then(() => {
            this.emit("close" /* Close */);
            this._closed = true;
        });
    }
    /**
     * @internal
     */
    static async create(client, target, ignoreHTTPSErrors, defaultViewport, screenshotTaskQueue) {
        const page = new Page(client, target, ignoreHTTPSErrors, screenshotTaskQueue);
        await page._initialize();
        if (defaultViewport)
            await page.setViewport(defaultViewport);
        return page;
    }
    async _initialize() {
        await Promise.all([
            this._frameManager.initialize(),
            this._client.send('Target.setAutoAttach', {
                autoAttach: true,
                waitForDebuggerOnStart: false,
                flatten: true,
            }),
            this._client.send('Performance.enable'),
            this._client.send('Log.enable'),
        ]);
    }
    async _onFileChooser(event) {
        if (!this._fileChooserInterceptors.size)
            return;
        const frame = this._frameManager.frame(event.frameId);
        const context = await frame.executionContext();
        const element = await context._adoptBackendNodeId(event.backendNodeId);
        const interceptors = Array.from(this._fileChooserInterceptors);
        this._fileChooserInterceptors.clear();
        const fileChooser = new FileChooser_js_1.FileChooser(element, event);
        for (const interceptor of interceptors)
            interceptor.call(null, fileChooser);
    }
    /**
     * @returns `true` if drag events are being intercepted, `false` otherwise.
     */
    isDragInterceptionEnabled() {
        return this._userDragInterceptionEnabled;
    }
    /**
     * @returns `true` if the page has JavaScript enabled, `false` otherwise.
     */
    isJavaScriptEnabled() {
        return this._javascriptEnabled;
    }
    /**
     * Listen to page events.
     */
    // Note: this method exists to define event typings and handle
    // proper wireup of cooperative request interception. Actual event listening and
    // dispatching is delegated to EventEmitter.
    on(eventName, handler) {
        if (eventName === 'request') {
            const wrap = (event) => {
                event.enqueueInterceptAction(() => handler(event));
            };
            this._handlerMap.set(handler, wrap);
            return super.on(eventName, wrap);
        }
        return super.on(eventName, handler);
    }
    once(eventName, handler) {
        // Note: this method only exists to define the types; we delegate the impl
        // to EventEmitter.
        return super.once(eventName, handler);
    }
    off(eventName, handler) {
        if (eventName === 'request') {
            handler = this._handlerMap.get(handler) || handler;
        }
        return super.off(eventName, handler);
    }
    /**
     * This method is typically coupled with an action that triggers file
     * choosing. The following example clicks a button that issues a file chooser
     * and then responds with `/tmp/myfile.pdf` as if a user has selected this file.
     *
     * ```js
     * const [fileChooser] = await Promise.all([
     * page.waitForFileChooser(),
     * page.click('#upload-file-button'),
     * // some button that triggers file selection
     * ]);
     * await fileChooser.accept(['/tmp/myfile.pdf']);
     * ```
     *
     * NOTE: This must be called before the file chooser is launched. It will not
     * return a currently active file chooser.
     * @param options - Optional waiting parameters
     * @returns Resolves after a page requests a file picker.
     * @remarks
     * NOTE: In non-headless Chromium, this method results in the native file picker
     * dialog `not showing up` for the user.
     */
    async waitForFileChooser(options = {}) {
        if (!this._fileChooserInterceptors.size)
            await this._client.send('Page.setInterceptFileChooserDialog', {
                enabled: true,
            });
        const { timeout = this._timeoutSettings.timeout() } = options;
        let callback;
        const promise = new Promise((x) => (callback = x));
        this._fileChooserInterceptors.add(callback);
        return helper_js_1.helper
            .waitWithTimeout(promise, 'waiting for file chooser', timeout)
            .catch((error) => {
            this._fileChooserInterceptors.delete(callback);
            throw error;
        });
    }
    /**
     * Sets the page's geolocation.
     * @remarks
     * NOTE: Consider using {@link BrowserContext.overridePermissions} to grant
     * permissions for the page to read its geolocation.
     * @example
     * ```js
     * await page.setGeolocation({latitude: 59.95, longitude: 30.31667});
     * ```
     */
    async setGeolocation(options) {
        const { longitude, latitude, accuracy = 0 } = options;
        if (longitude < -180 || longitude > 180)
            throw new Error(`Invalid longitude "${longitude}": precondition -180 <= LONGITUDE <= 180 failed.`);
        if (latitude < -90 || latitude > 90)
            throw new Error(`Invalid latitude "${latitude}": precondition -90 <= LATITUDE <= 90 failed.`);
        if (accuracy < 0)
            throw new Error(`Invalid accuracy "${accuracy}": precondition 0 <= ACCURACY failed.`);
        await this._client.send('Emulation.setGeolocationOverride', {
            longitude,
            latitude,
            accuracy,
        });
    }
    /**
     * @returns A target this page was created from.
     */
    target() {
        return this._target;
    }
    /**
     * Get the CDP session client the page belongs to.
     * @internal
     */
    client() {
        return this._client;
    }
    /**
     * Get the browser the page belongs to.
     */
    browser() {
        return this._target.browser();
    }
    /**
     * Get the browser context that the page belongs to.
     */
    browserContext() {
        return this._target.browserContext();
    }
    _onTargetCrashed() {
        this.emit('error', new Error('Page crashed!'));
    }
    _onLogEntryAdded(event) {
        const { level, text, args, source, url, lineNumber } = event.entry;
        if (args)
            args.map((arg) => helper_js_1.helper.releaseObject(this._client, arg));
        if (source !== 'worker')
            this.emit("console" /* Console */, new ConsoleMessage_js_1.ConsoleMessage(level, text, [], [{ url, lineNumber }]));
    }
    /**
     * @returns The page's main frame.
     * @remarks
     * Page is guaranteed to have a main frame which persists during navigations.
     */
    mainFrame() {
        return this._frameManager.mainFrame();
    }
    get keyboard() {
        return this._keyboard;
    }
    get touchscreen() {
        return this._touchscreen;
    }
    get coverage() {
        return this._coverage;
    }
    get tracing() {
        return this._tracing;
    }
    get accessibility() {
        return this._accessibility;
    }
    /**
     * @returns An array of all frames attached to the page.
     */
    frames() {
        return this._frameManager.frames();
    }
    /**
     * @returns all of the dedicated
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API |
     * WebWorkers}
     * associated with the page.
     * @remarks
     * NOTE: This does not contain ServiceWorkers
     */
    workers() {
        return Array.from(this._workers.values());
    }
    /**
     * @param value - Whether to enable request interception.
     *
     * @remarks
     * Activating request interception enables {@link HTTPRequest.abort},
     * {@link HTTPRequest.continue} and {@link HTTPRequest.respond} methods.  This
     * provides the capability to modify network requests that are made by a page.
     *
     * Once request interception is enabled, every request will stall unless it's
     * continued, responded or aborted; or completed using the browser cache.
     *
     * @example
     * An example of a naïve request interceptor that aborts all image requests:
     * ```js
     * const puppeteer = require('puppeteer');
     * (async () => {
     *   const browser = await puppeteer.launch();
     *   const page = await browser.newPage();
     *   await page.setRequestInterception(true);
     *   page.on('request', interceptedRequest => {
     *     if (interceptedRequest.url().endsWith('.png') ||
     *         interceptedRequest.url().endsWith('.jpg'))
     *       interceptedRequest.abort();
     *     else
     *       interceptedRequest.continue();
     *     });
     *   await page.goto('https://example.com');
     *   await browser.close();
     * })();
     * ```
     * NOTE: Enabling request interception disables page caching.
     */
    async setRequestInterception(value) {
        return this._frameManager.networkManager().setRequestInterception(value);
    }
    /**
     * @param enabled - Whether to enable drag interception.
     *
     * @remarks
     * Activating drag interception enables the `Input.drag`,
     * methods  This provides the capability to capture drag events emitted
     * on the page, which can then be used to simulate drag-and-drop.
     */
    async setDragInterception(enabled) {
        this._userDragInterceptionEnabled = enabled;
        return this._client.send('Input.setInterceptDrags', { enabled });
    }
    /**
     * @param enabled - When `true`, enables offline mode for the page.
     * @remarks
     * NOTE: while this method sets the network connection to offline, it does
     * not change the parameters used in [page.emulateNetworkConditions(networkConditions)]
     * (#pageemulatenetworkconditionsnetworkconditions)
     */
    setOfflineMode(enabled) {
        return this._frameManager.networkManager().setOfflineMode(enabled);
    }
    /**
     * @param networkConditions - Passing `null` disables network condition emulation.
     * @example
     * ```js
     * const puppeteer = require('puppeteer');
     * const slow3G = puppeteer.networkConditions['Slow 3G'];
     *
     * (async () => {
     * const browser = await puppeteer.launch();
     * const page = await browser.newPage();
     * await page.emulateNetworkConditions(slow3G);
     * await page.goto('https://www.google.com');
     * // other actions...
     * await browser.close();
     * })();
     * ```
     * @remarks
     * NOTE: This does not affect WebSockets and WebRTC PeerConnections (see
     * https://crbug.com/563644). To set the page offline, you can use
     * [page.setOfflineMode(enabled)](#pagesetofflinemodeenabled).
     */
    emulateNetworkConditions(networkConditions) {
        return this._frameManager
            .networkManager()
            .emulateNetworkConditions(networkConditions);
    }
    /**
     * This setting will change the default maximum navigation time for the
     * following methods and related shortcuts:
     *
     * - {@link Page.goBack | page.goBack(options)}
     *
     * - {@link Page.goForward | page.goForward(options)}
     *
     * - {@link Page.goto | page.goto(url,options)}
     *
     * - {@link Page.reload | page.reload(options)}
     *
     * - {@link Page.setContent | page.setContent(html,options)}
     *
     * - {@link Page.waitForNavigation | page.waitForNavigation(options)}
     * @param timeout - Maximum navigation time in milliseconds.
     */
    setDefaultNavigationTimeout(timeout) {
        this._timeoutSettings.setDefaultNavigationTimeout(timeout);
    }
    /**
     * @param timeout - Maximum time in milliseconds.
     */
    setDefaultTimeout(timeout) {
        this._timeoutSettings.setDefaultTimeout(timeout);
    }
    /**
     * Runs `document.querySelector` within the page. If no element matches the
     * selector, the return value resolves to `null`.
     *
     * @remarks
     * Shortcut for {@link Frame.$ | Page.mainFrame().$(selector) }.
     *
     * @param selector - A `selector` to query page for
     * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector}
     * to query page for.
     */
    async $(selector) {
        return this.mainFrame().$(selector);
    }
    /**
     * @remarks
     *
     * The only difference between {@link Page.evaluate | page.evaluate} and
     * `page.evaluateHandle` is that `evaluateHandle` will return the value
     * wrapped in an in-page object.
     *
     * If the function passed to `page.evaluteHandle` returns a Promise, the
     * function will wait for the promise to resolve and return its value.
     *
     * You can pass a string instead of a function (although functions are
     * recommended as they are easier to debug and use with TypeScript):
     *
     * @example
     * ```
     * const aHandle = await page.evaluateHandle('document')
     * ```
     *
     * @example
     * {@link JSHandle} instances can be passed as arguments to the `pageFunction`:
     * ```
     * const aHandle = await page.evaluateHandle(() => document.body);
     * const resultHandle = await page.evaluateHandle(body => body.innerHTML, aHandle);
     * console.log(await resultHandle.jsonValue());
     * await resultHandle.dispose();
     * ```
     *
     * Most of the time this function returns a {@link JSHandle},
     * but if `pageFunction` returns a reference to an element,
     * you instead get an {@link ElementHandle} back:
     *
     * @example
     * ```
     * const button = await page.evaluateHandle(() => document.querySelector('button'));
     * // can call `click` because `button` is an `ElementHandle`
     * await button.click();
     * ```
     *
     * The TypeScript definitions assume that `evaluateHandle` returns
     *  a `JSHandle`, but if you know it's going to return an
     * `ElementHandle`, pass it as the generic argument:
     *
     * ```
     * const button = await page.evaluateHandle<ElementHandle>(...);
     * ```
     *
     * @param pageFunction - a function that is run within the page
     * @param args - arguments to be passed to the pageFunction
     */
    async evaluateHandle(pageFunction, ...args) {
        const context = await this.mainFrame().executionContext();
        return context.evaluateHandle(pageFunction, ...args);
    }
    /**
     * This method iterates the JavaScript heap and finds all objects with the
     * given prototype.
     *
     * @remarks
     * Shortcut for
     * {@link ExecutionContext.queryObjects |
     * page.mainFrame().executionContext().queryObjects(prototypeHandle)}.
     *
     * @example
     *
     * ```js
     * // Create a Map object
     * await page.evaluate(() => window.map = new Map());
     * // Get a handle to the Map object prototype
     * const mapPrototype = await page.evaluateHandle(() => Map.prototype);
     * // Query all map instances into an array
     * const mapInstances = await page.queryObjects(mapPrototype);
     * // Count amount of map objects in heap
     * const count = await page.evaluate(maps => maps.length, mapInstances);
     * await mapInstances.dispose();
     * await mapPrototype.dispose();
     * ```
     * @param prototypeHandle - a handle to the object prototype.
     * @returns Promise which resolves to a handle to an array of objects with
     * this prototype.
     */
    async queryObjects(prototypeHandle) {
        const context = await this.mainFrame().executionContext();
        return context.queryObjects(prototypeHandle);
    }
    /**
     * This method runs `document.querySelector` within the page and passes the
     * result as the first argument to the `pageFunction`.
     *
     * @remarks
     *
     * If no element is found matching `selector`, the method will throw an error.
     *
     * If `pageFunction` returns a promise `$eval` will wait for the promise to
     * resolve and then return its value.
     *
     * @example
     *
     * ```
     * const searchValue = await page.$eval('#search', el => el.value);
     * const preloadHref = await page.$eval('link[rel=preload]', el => el.href);
     * const html = await page.$eval('.main-container', el => el.outerHTML);
     * ```
     *
     * If you are using TypeScript, you may have to provide an explicit type to the
     * first argument of the `pageFunction`.
     * By default it is typed as `Element`, but you may need to provide a more
     * specific sub-type:
     *
     * @example
     *
     * ```
     * // if you don't provide HTMLInputElement here, TS will error
     * // as `value` is not on `Element`
     * const searchValue = await page.$eval('#search', (el: HTMLInputElement) => el.value);
     * ```
     *
     * The compiler should be able to infer the return type
     * from the `pageFunction` you provide. If it is unable to, you can use the generic
     * type to tell the compiler what return type you expect from `$eval`:
     *
     * @example
     *
     * ```
     * // The compiler can infer the return type in this case, but if it can't
     * // or if you want to be more explicit, provide it as the generic type.
     * const searchValue = await page.$eval<string>(
     *  '#search', (el: HTMLInputElement) => el.value
     * );
     * ```
     *
     * @param selector - the
     * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector}
     * to query for
     * @param pageFunction - the function to be evaluated in the page context.
     * Will be passed the result of `document.querySelector(selector)` as its
     * first argument.
     * @param args - any additional arguments to pass through to `pageFunction`.
     *
     * @returns The result of calling `pageFunction`. If it returns an element it
     * is wrapped in an {@link ElementHandle}, else the raw value itself is
     * returned.
     */
    async $eval(selector, pageFunction, ...args) {
        return this.mainFrame().$eval(selector, pageFunction, ...args);
    }
    /**
     * This method runs `Array.from(document.querySelectorAll(selector))` within
     * the page and passes the result as the first argument to the `pageFunction`.
     *
     * @remarks
     *
     * If `pageFunction` returns a promise `$$eval` will wait for the promise to
     * resolve and then return its value.
     *
     * @example
     *
     * ```
     * // get the amount of divs on the page
     * const divCount = await page.$$eval('div', divs => divs.length);
     *
     * // get the text content of all the `.options` elements:
     * const options = await page.$$eval('div > span.options', options => {
     *   return options.map(option => option.textContent)
     * });
     * ```
     *
     * If you are using TypeScript, you may have to provide an explicit type to the
     * first argument of the `pageFunction`.
     * By default it is typed as `Element[]`, but you may need to provide a more
     * specific sub-type:
     *
     * @example
     *
     * ```
     * // if you don't provide HTMLInputElement here, TS will error
     * // as `value` is not on `Element`
     * await page.$$eval('input', (elements: HTMLInputElement[]) => {
     *   return elements.map(e => e.value);
     * });
     * ```
     *
     * The compiler should be able to infer the return type
     * from the `pageFunction` you provide. If it is unable to, you can use the generic
     * type to tell the compiler what return type you expect from `$$eval`:
     *
     * @example
     *
     * ```
     * // The compiler can infer the return type in this case, but if it can't
     * // or if you want to be more explicit, provide it as the generic type.
     * const allInputValues = await page.$$eval<string[]>(
     *  'input', (elements: HTMLInputElement[]) => elements.map(e => e.textContent)
     * );
     * ```
     *
     * @param selector - the
     * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector}
     * to query for
     * @param pageFunction - the function to be evaluated in the page context. Will
     * be passed the result of `Array.from(document.querySelectorAll(selector))`
     * as its first argument.
     * @param args - any additional arguments to pass through to `pageFunction`.
     *
     * @returns The result of calling `pageFunction`. If it returns an element it
     * is wrapped in an {@link ElementHandle}, else the raw value itself is
     * returned.
     */
    async $$eval(selector, pageFunction, ...args) {
        return this.mainFrame().$$eval(selector, pageFunction, ...args);
    }
    /**
     * The method runs `document.querySelectorAll` within the page. If no elements
     * match the selector, the return value resolves to `[]`.
     * @remarks
     * Shortcut for {@link Frame.$$ | Page.mainFrame().$$(selector) }.
     * @param selector - A `selector` to query page for
     */
    async $$(selector) {
        return this.mainFrame().$$(selector);
    }
    /**
     * The method evaluates the XPath expression relative to the page document as
     * its context node. If there are no such elements, the method resolves to an
     * empty array.
     * @remarks
     * Shortcut for {@link Frame.$x | Page.mainFrame().$x(expression) }.
     * @param expression - Expression to evaluate
     */
    async $x(expression) {
        return this.mainFrame().$x(expression);
    }
    /**
     * If no URLs are specified, this method returns cookies for the current page
     * URL. If URLs are specified, only cookies for those URLs are returned.
     */
    async cookies(...urls) {
        const originalCookies = (await this._client.send('Network.getCookies', {
            urls: urls.length ? urls : [this.url()],
        })).cookies;
        const unsupportedCookieAttributes = ['priority'];
        const filterUnsupportedAttributes = (cookie) => {
            for (const attr of unsupportedCookieAttributes)
                delete cookie[attr];
            return cookie;
        };
        return originalCookies.map(filterUnsupportedAttributes);
    }
    async deleteCookie(...cookies) {
        const pageURL = this.url();
        for (const cookie of cookies) {
            const item = Object.assign({}, cookie);
            if (!cookie.url && pageURL.startsWith('http'))
                item.url = pageURL;
            await this._client.send('Network.deleteCookies', item);
        }
    }
    /**
     * @example
     * ```js
     * await page.setCookie(cookieObject1, cookieObject2);
     * ```
     */
    async setCookie(...cookies) {
        const pageURL = this.url();
        const startsWithHTTP = pageURL.startsWith('http');
        const items = cookies.map((cookie) => {
            const item = Object.assign({}, cookie);
            if (!item.url && startsWithHTTP)
                item.url = pageURL;
            (0, assert_js_1.assert)(item.url !== 'about:blank', `Blank page can not have cookie "${item.name}"`);
            (0, assert_js_1.assert)(!String.prototype.startsWith.call(item.url || '', 'data:'), `Data URL page can not have cookie "${item.name}"`);
            return item;
        });
        await this.deleteCookie(...items);
        if (items.length)
            await this._client.send('Network.setCookies', { cookies: items });
    }
    /**
     * Adds a `<script>` tag into the page with the desired URL or content.
     * @remarks
     * Shortcut for {@link Frame.addScriptTag | page.mainFrame().addScriptTag(options) }.
     * @returns Promise which resolves to the added tag when the script's onload fires or
     * when the script content was injected into frame.
     */
    async addScriptTag(options) {
        return this.mainFrame().addScriptTag(options);
    }
    /**
     * Adds a `<link rel="stylesheet">` tag into the page with the desired URL or a
     * `<style type="text/css">` tag with the content.
     * @returns Promise which resolves to the added tag when the stylesheet's
     * onload fires or when the CSS content was injected into frame.
     */
    async addStyleTag(options) {
        return this.mainFrame().addStyleTag(options);
    }
    /**
     * The method adds a function called `name` on the page's `window` object. When
     * called, the function executes `puppeteerFunction` in node.js and returns a
     * `Promise` which resolves to the return value of `puppeteerFunction`.
     *
     * If the puppeteerFunction returns a `Promise`, it will be awaited.
     *
     * NOTE: Functions installed via `page.exposeFunction` survive navigations.
     * @param name - Name of the function on the window object
     * @param puppeteerFunction -  Callback function which will be called in
     * Puppeteer's context.
     * @example
     * An example of adding an `md5` function into the page:
     * ```js
     * const puppeteer = require('puppeteer');
     * const crypto = require('crypto');
     *
     * (async () => {
     * const browser = await puppeteer.launch();
     * const page = await browser.newPage();
     * page.on('console', (msg) => console.log(msg.text()));
     * await page.exposeFunction('md5', (text) =>
     * crypto.createHash('md5').update(text).digest('hex')
     * );
     * await page.evaluate(async () => {
     * // use window.md5 to compute hashes
     * const myString = 'PUPPETEER';
     * const myHash = await window.md5(myString);
     * console.log(`md5 of ${myString} is ${myHash}`);
     * });
     * await browser.close();
     * })();
     * ```
     * An example of adding a `window.readfile` function into the page:
     * ```js
     * const puppeteer = require('puppeteer');
     * const fs = require('fs');
     *
     * (async () => {
     * const browser = await puppeteer.launch();
     * const page = await browser.newPage();
     * page.on('console', (msg) => console.log(msg.text()));
     * await page.exposeFunction('readfile', async (filePath) => {
     * return new Promise((resolve, reject) => {
     * fs.readFile(filePath, 'utf8', (err, text) => {
     *    if (err) reject(err);
     *    else resolve(text);
     *  });
     * });
     * });
     * await page.evaluate(async () => {
     * // use window.readfile to read contents of a file
     * const content = await window.readfile('/etc/hosts');
     * console.log(content);
     * });
     * await browser.close();
     * })();
     * ```
     */
    async exposeFunction(name, puppeteerFunction) {
        if (this._pageBindings.has(name))
            throw new Error(`Failed to add page binding with name ${name}: window['${name}'] already exists!`);
        let exposedFunction;
        if (typeof puppeteerFunction === 'function') {
            exposedFunction = puppeteerFunction;
        }
        else if (typeof puppeteerFunction.default === 'function') {
            exposedFunction = puppeteerFunction.default;
        }
        else {
            throw new Error(`Failed to add page binding with name ${name}: ${puppeteerFunction} is not a function or a module with a default export.`);
        }
        this._pageBindings.set(name, exposedFunction);
        const expression = helper_js_1.helper.pageBindingInitString('exposedFun', name);
        await this._client.send('Runtime.addBinding', { name: name });
        await this._client.send('Page.addScriptToEvaluateOnNewDocument', {
            source: expression,
        });
        await Promise.all(this.frames().map((frame) => frame.evaluate(expression).catch(helper_js_1.debugError)));
    }
    /**
     * Provide credentials for `HTTP authentication`.
     * @remarks To disable authentication, pass `null`.
     */
    async authenticate(credentials) {
        return this._frameManager.networkManager().authenticate(credentials);
    }
    /**
     * The extra HTTP headers will be sent with every request the page initiates.
     * NOTE: All HTTP header names are lowercased. (HTTP headers are
     * case-insensitive, so this shouldn’t impact your server code.)
     * NOTE: page.setExtraHTTPHeaders does not guarantee the order of headers in
     * the outgoing requests.
     * @param headers - An object containing additional HTTP headers to be sent
     * with every request. All header values must be strings.
     * @returns
     */
    async setExtraHTTPHeaders(headers) {
        return this._frameManager.networkManager().setExtraHTTPHeaders(headers);
    }
    /**
     * @param userAgent - Specific user agent to use in this page
     * @param userAgentData - Specific user agent client hint data to use in this
     * page
     * @returns Promise which resolves when the user agent is set.
     */
    async setUserAgent(userAgent, userAgentMetadata) {
        return this._frameManager
            .networkManager()
            .setUserAgent(userAgent, userAgentMetadata);
    }
    /**
     * @returns Object containing metrics as key/value pairs.
     *
     * - `Timestamp` : The timestamp when the metrics sample was taken.
     *
     * - `Documents` : Number of documents in the page.
     *
     * - `Frames` : Number of frames in the page.
     *
     * - `JSEventListeners` : Number of events in the page.
     *
     * - `Nodes` : Number of DOM nodes in the page.
     *
     * - `LayoutCount` : Total number of full or partial page layout.
     *
     * - `RecalcStyleCount` : Total number of page style recalculations.
     *
     * - `LayoutDuration` : Combined durations of all page layouts.
     *
     * - `RecalcStyleDuration` : Combined duration of all page style
     *   recalculations.
     *
     * - `ScriptDuration` : Combined duration of JavaScript execution.
     *
     * - `TaskDuration` : Combined duration of all tasks performed by the browser.
     *
     *
     * - `JSHeapUsedSize` : Used JavaScript heap size.
     *
     * - `JSHeapTotalSize` : Total JavaScript heap size.
     * @remarks
     * NOTE: All timestamps are in monotonic time: monotonically increasing time
     * in seconds since an arbitrary point in the past.
     */
    async metrics() {
        const response = await this._client.send('Performance.getMetrics');
        return this._buildMetricsObject(response.metrics);
    }
    _emitMetrics(event) {
        this.emit("metrics" /* Metrics */, {
            title: event.title,
            metrics: this._buildMetricsObject(event.metrics),
        });
    }
    _buildMetricsObject(metrics) {
        const result = {};
        for (const metric of metrics || []) {
            if (supportedMetrics.has(metric.name))
                result[metric.name] = metric.value;
        }
        return result;
    }
    _handleException(exceptionDetails) {
        const message = helper_js_1.helper.getExceptionMessage(exceptionDetails);
        const err = new Error(message);
        err.stack = ''; // Don't report clientside error with a node stack attached
        this.emit("pageerror" /* PageError */, err);
    }
    async _onConsoleAPI(event) {
        if (event.executionContextId === 0) {
            // DevTools protocol stores the last 1000 console messages. These
            // messages are always reported even for removed execution contexts. In
            // this case, they are marked with executionContextId = 0 and are
            // reported upon enabling Runtime agent.
            //
            // Ignore these messages since:
            // - there's no execution context we can use to operate with message
            //   arguments
            // - these messages are reported before Puppeteer clients can subscribe
            //   to the 'console'
            //   page event.
            //
            // @see https://github.com/puppeteer/puppeteer/issues/3865
            return;
        }
        const context = this._frameManager.executionContextById(event.executionContextId, this._client);
        const values = event.args.map((arg) => (0, JSHandle_js_1.createJSHandle)(context, arg));
        this._addConsoleMessage(event.type, values, event.stackTrace);
    }
    async _onBindingCalled(event) {
        let payload;
        try {
            payload = JSON.parse(event.payload);
        }
        catch {
            // The binding was either called by something in the page or it was
            // called before our wrapper was initialized.
            return;
        }
        const { type, name, seq, args } = payload;
        if (type !== 'exposedFun' || !this._pageBindings.has(name))
            return;
        let expression = null;
        try {
            const result = await this._pageBindings.get(name)(...args);
            expression = helper_js_1.helper.pageBindingDeliverResultString(name, seq, result);
        }
        catch (error) {
            if (error instanceof Error)
                expression = helper_js_1.helper.pageBindingDeliverErrorString(name, seq, error.message, error.stack);
            else
                expression = helper_js_1.helper.pageBindingDeliverErrorValueString(name, seq, error);
        }
        this._client
            .send('Runtime.evaluate', {
            expression,
            contextId: event.executionContextId,
        })
            .catch(helper_js_1.debugError);
    }
    _addConsoleMessage(type, args, stackTrace) {
        if (!this.listenerCount("console" /* Console */)) {
            args.forEach((arg) => arg.dispose());
            return;
        }
        const textTokens = [];
        for (const arg of args) {
            const remoteObject = arg._remoteObject;
            if (remoteObject.objectId)
                textTokens.push(arg.toString());
            else
                textTokens.push(helper_js_1.helper.valueFromRemoteObject(remoteObject));
        }
        const stackTraceLocations = [];
        if (stackTrace) {
            for (const callFrame of stackTrace.callFrames) {
                stackTraceLocations.push({
                    url: callFrame.url,
                    lineNumber: callFrame.lineNumber,
                    columnNumber: callFrame.columnNumber,
                });
            }
        }
        const message = new ConsoleMessage_js_1.ConsoleMessage(type, textTokens.join(' '), args, stackTraceLocations);
        this.emit("console" /* Console */, message);
    }
    _onDialog(event) {
        let dialogType = null;
        const validDialogTypes = new Set([
            'alert',
            'confirm',
            'prompt',
            'beforeunload',
        ]);
        if (validDialogTypes.has(event.type)) {
            dialogType = event.type;
        }
        (0, assert_js_1.assert)(dialogType, 'Unknown javascript dialog type: ' + event.type);
        const dialog = new Dialog_js_1.Dialog(this._client, dialogType, event.message, event.defaultPrompt);
        this.emit("dialog" /* Dialog */, dialog);
    }
    /**
     * Resets default white background
     */
    async _resetDefaultBackgroundColor() {
        await this._client.send('Emulation.setDefaultBackgroundColorOverride');
    }
    /**
     * Hides default white background
     */
    async _setTransparentBackgroundColor() {
        await this._client.send('Emulation.setDefaultBackgroundColorOverride', {
            color: { r: 0, g: 0, b: 0, a: 0 },
        });
    }
    /**
     *
     * @returns
     * @remarks Shortcut for
     * {@link Frame.url | page.mainFrame().url()}.
     */
    url() {
        return this.mainFrame().url();
    }
    async content() {
        return await this._frameManager.mainFrame().content();
    }
    /**
     * @param html - HTML markup to assign to the page.
     * @param options - Parameters that has some properties.
     * @remarks
     * The parameter `options` might have the following options.
     *
     * - `timeout` : Maximum time in milliseconds for resources to load, defaults
     *   to 30 seconds, pass `0` to disable timeout. The default value can be
     *   changed by using the
     *   {@link Page.setDefaultNavigationTimeout |
     *   page.setDefaultNavigationTimeout(timeout)}
     *   or {@link Page.setDefaultTimeout | page.setDefaultTimeout(timeout)}
     *   methods.
     *
     * - `waitUntil`: When to consider setting markup succeeded, defaults to `load`.
     *    Given an array of event strings, setting content is considered to be
     *    successful after all events have been fired. Events can be either:<br/>
     *  - `load` : consider setting content to be finished when the `load` event is
     *    fired.<br/>
     *  - `domcontentloaded` : consider setting content to be finished when the
     *   `DOMContentLoaded` event is fired.<br/>
     *  - `networkidle0` : consider setting content to be finished when there are no
     *   more than 0 network connections for at least `500` ms.<br/>
     *  - `networkidle2` : consider setting content to be finished when there are no
     *   more than 2 network connections for at least `500` ms.
     */
    async setContent(html, options = {}) {
        await this._frameManager.mainFrame().setContent(html, options);
    }
    /**
     * @param url - URL to navigate page to. The URL should include scheme, e.g.
     * `https://`
     * @param options - Navigation Parameter
     * @returns Promise which resolves to the main resource response. In case of
     * multiple redirects, the navigation will resolve with the response of the
     * last redirect.
     * @remarks
     * The argument `options` might have the following properties:
     *
     * - `timeout` : Maximum navigation time in milliseconds, defaults to 30
     *   seconds, pass 0 to disable timeout. The default value can be changed by
     *   using the
     *   {@link Page.setDefaultNavigationTimeout |
     *   page.setDefaultNavigationTimeout(timeout)}
     *   or {@link Page.setDefaultTimeout | page.setDefaultTimeout(timeout)}
     *   methods.
     *
     * - `waitUntil`:When to consider navigation succeeded, defaults to `load`.
     *    Given an array of event strings, navigation is considered to be successful
     *    after all events have been fired. Events can be either:<br/>
     *  - `load` : consider navigation to be finished when the load event is
     *    fired.<br/>
     *  - `domcontentloaded` : consider navigation to be finished when the
     *    DOMContentLoaded event is fired.<br/>
     *  - `networkidle0` : consider navigation to be finished when there are no
     *    more than 0 network connections for at least `500` ms.<br/>
     *  - `networkidle2` : consider navigation to be finished when there are no
     *    more than 2 network connections for at least `500` ms.
     *
     * - `referer` : Referer header value. If provided it will take preference
     *   over the referer header value set by
     *   {@link Page.setExtraHTTPHeaders |page.setExtraHTTPHeaders()}.
     *
     * `page.goto` will throw an error if:
     * - there's an SSL error (e.g. in case of self-signed certificates).
     * - target URL is invalid.
     * - the timeout is exceeded during navigation.
     * - the remote server does not respond or is unreachable.
     * - the main resource failed to load.
     *
     * `page.goto` will not throw an error when any valid HTTP status code is
     *   returned by the remote server, including 404 "Not Found" and 500
     *   "Internal Server Error". The status code for such responses can be
     *   retrieved by calling response.status().
     *
     * NOTE: `page.goto` either throws an error or returns a main resource
     * response. The only exceptions are navigation to about:blank or navigation
     * to the same URL with a different hash, which would succeed and return null.
     *
     * NOTE: Headless mode doesn't support navigation to a PDF document. See the
     * {@link https://bugs.chromium.org/p/chromium/issues/detail?id=761295
     * | upstream issue}.
     *
     * Shortcut for {@link Frame.goto | page.mainFrame().goto(url, options)}.
     */
    async goto(url, options = {}) {
        return await this._frameManager.mainFrame().goto(url, options);
    }
    /**
     * @param options - Navigation parameters which might have the following
     * properties:
     * @returns Promise which resolves to the main resource response. In case of
     * multiple redirects, the navigation will resolve with the response of the
     * last redirect.
     * @remarks
     * The argument `options` might have the following properties:
     *
     * - `timeout` : Maximum navigation time in milliseconds, defaults to 30
     *   seconds, pass 0 to disable timeout. The default value can be changed by
     *   using the
     *   {@link Page.setDefaultNavigationTimeout |
     *   page.setDefaultNavigationTimeout(timeout)}
     *   or {@link Page.setDefaultTimeout | page.setDefaultTimeout(timeout)}
     *   methods.
     *
     * - `waitUntil`: When to consider navigation succeeded, defaults to `load`.
     *    Given an array of event strings, navigation is considered to be
     *    successful after all events have been fired. Events can be either:<br/>
     *  - `load` : consider navigation to be finished when the load event is fired.<br/>
     *  - `domcontentloaded` : consider navigation to be finished when the
     *   DOMContentLoaded event is fired.<br/>
     *  - `networkidle0` : consider navigation to be finished when there are no
     *   more than 0 network connections for at least `500` ms.<br/>
     *  - `networkidle2` : consider navigation to be finished when there are no
     *   more than 2 network connections for at least `500` ms.
     */
    async reload(options) {
        const result = await Promise.all([
            this.waitForNavigation(options),
            this._client.send('Page.reload'),
        ]);
        return result[0];
    }
    /**
     * This resolves when the page navigates to a new URL or reloads. It is useful
     * when you run code that will indirectly cause the page to navigate. Consider
     * this example:
     * ```js
     * const [response] = await Promise.all([
     * page.waitForNavigation(), // The promise resolves after navigation has finished
     * page.click('a.my-link'), // Clicking the link will indirectly cause a navigation
     * ]);
     * ```
     *
     * @param options - Navigation parameters which might have the following properties:
     * @returns Promise which resolves to the main resource response. In case of
     * multiple redirects, the navigation will resolve with the response of the
     * last redirect. In case of navigation to a different anchor or navigation
     * due to History API usage, the navigation will resolve with `null`.
     * @remarks
     * NOTE: Usage of the
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/History_API | History API}
     * to change the URL is considered a navigation.
     *
     * Shortcut for
     * {@link Frame.waitForNavigation | page.mainFrame().waitForNavigation(options)}.
     */
    async waitForNavigation(options = {}) {
        return await this._frameManager.mainFrame().waitForNavigation(options);
    }
    _sessionClosePromise() {
        if (!this._disconnectPromise)
            this._disconnectPromise = new Promise((fulfill) => this._client.once(Connection_js_1.CDPSessionEmittedEvents.Disconnected, () => fulfill(new Error('Target closed'))));
        return this._disconnectPromise;
    }
    /**
     * @param urlOrPredicate - A URL or predicate to wait for
     * @param options - Optional waiting parameters
     * @returns Promise which resolves to the matched response
     * @example
     * ```js
     * const firstResponse = await page.waitForResponse(
     * 'https://example.com/resource'
     * );
     * const finalResponse = await page.waitForResponse(
     * (response) =>
     * response.url() === 'https://example.com' && response.status() === 200
     * );
     * const finalResponse = await page.waitForResponse(async (response) => {
     * return (await response.text()).includes('<html>');
     * });
     * return finalResponse.ok();
     * ```
     * @remarks
     * Optional Waiting Parameters have:
     *
     * - `timeout`: Maximum wait time in milliseconds, defaults to `30` seconds, pass
     * `0` to disable the timeout. The default value can be changed by using the
     * {@link Page.setDefaultTimeout} method.
     */
    async waitForRequest(urlOrPredicate, options = {}) {
        const { timeout = this._timeoutSettings.timeout() } = options;
        return helper_js_1.helper.waitForEvent(this._frameManager.networkManager(), NetworkManager_js_1.NetworkManagerEmittedEvents.Request, (request) => {
            if (helper_js_1.helper.isString(urlOrPredicate))
                return urlOrPredicate === request.url();
            if (typeof urlOrPredicate === 'function')
                return !!urlOrPredicate(request);
            return false;
        }, timeout, this._sessionClosePromise());
    }
    /**
     * @param urlOrPredicate - A URL or predicate to wait for.
     * @param options - Optional waiting parameters
     * @returns Promise which resolves to the matched response.
     * @example
     * ```js
     * const firstResponse = await page.waitForResponse(
     * 'https://example.com/resource'
     * );
     * const finalResponse = await page.waitForResponse(
     * (response) =>
     * response.url() === 'https://example.com' && response.status() === 200
     * );
     * const finalResponse = await page.waitForResponse(async (response) => {
     * return (await response.text()).includes('<html>');
     * });
     * return finalResponse.ok();
     * ```
     * @remarks
     * Optional Parameter have:
     *
     * - `timeout`: Maximum wait time in milliseconds, defaults to `30` seconds,
     * pass `0` to disable the timeout. The default value can be changed by using
     * the {@link Page.setDefaultTimeout} method.
     */
    async waitForResponse(urlOrPredicate, options = {}) {
        const { timeout = this._timeoutSettings.timeout() } = options;
        return helper_js_1.helper.waitForEvent(this._frameManager.networkManager(), NetworkManager_js_1.NetworkManagerEmittedEvents.Response, async (response) => {
            if (helper_js_1.helper.isString(urlOrPredicate))
                return urlOrPredicate === response.url();
            if (typeof urlOrPredicate === 'function')
                return !!(await urlOrPredicate(response));
            return false;
        }, timeout, this._sessionClosePromise());
    }
    /**
     * @param options - Optional waiting parameters
     * @returns Promise which resolves when network is idle
     */
    async waitForNetworkIdle(options = {}) {
        const { idleTime = 500, timeout = this._timeoutSettings.timeout() } = options;
        const networkManager = this._frameManager.networkManager();
        let idleResolveCallback;
        const idlePromise = new Promise((resolve) => {
            idleResolveCallback = resolve;
        });
        let abortRejectCallback;
        const abortPromise = new Promise((_, reject) => {
            abortRejectCallback = reject;
        });
        let idleTimer;
        const onIdle = () => idleResolveCallback();
        const cleanup = () => {
            idleTimer && clearTimeout(idleTimer);
            abortRejectCallback(new Error('abort'));
        };
        const evaluate = () => {
            idleTimer && clearTimeout(idleTimer);
            if (networkManager.numRequestsInProgress() === 0)
                idleTimer = setTimeout(onIdle, idleTime);
        };
        evaluate();
        const eventHandler = () => {
            evaluate();
            return false;
        };
        const listenToEvent = (event) => helper_js_1.helper.waitForEvent(networkManager, event, eventHandler, timeout, abortPromise);
        const eventPromises = [
            listenToEvent(NetworkManager_js_1.NetworkManagerEmittedEvents.Request),
            listenToEvent(NetworkManager_js_1.NetworkManagerEmittedEvents.Response),
        ];
        await Promise.race([
            idlePromise,
            ...eventPromises,
            this._sessionClosePromise(),
        ]).then((r) => {
            cleanup();
            return r;
        }, (error) => {
            cleanup();
            throw error;
        });
    }
    /**
     * @param urlOrPredicate - A URL or predicate to wait for.
     * @param options - Optional waiting parameters
     * @returns Promise which resolves to the matched frame.
     * @example
     * ```js
     * const frame = await page.waitForFrame(async (frame) => {
     *   return frame.name() === 'Test';
     * });
     * ```
     * @remarks
     * Optional Parameter have:
     *
     * - `timeout`: Maximum wait time in milliseconds, defaults to `30` seconds,
     * pass `0` to disable the timeout. The default value can be changed by using
     * the {@link Page.setDefaultTimeout} method.
     */
    async waitForFrame(urlOrPredicate, options = {}) {
        const { timeout = this._timeoutSettings.timeout() } = options;
        async function predicate(frame) {
            if (helper_js_1.helper.isString(urlOrPredicate))
                return urlOrPredicate === frame.url();
            if (typeof urlOrPredicate === 'function')
                return !!(await urlOrPredicate(frame));
            return false;
        }
        return Promise.race([
            helper_js_1.helper.waitForEvent(this._frameManager, FrameManager_js_1.FrameManagerEmittedEvents.FrameAttached, predicate, timeout, this._sessionClosePromise()),
            helper_js_1.helper.waitForEvent(this._frameManager, FrameManager_js_1.FrameManagerEmittedEvents.FrameNavigated, predicate, timeout, this._sessionClosePromise()),
        ]);
    }
    /**
     * This method navigate to the previous page in history.
     * @param options - Navigation parameters
     * @returns Promise which resolves to the main resource response. In case of
     * multiple redirects, the navigation will resolve with the response of the
     * last redirect. If can not go back, resolves to `null`.
     * @remarks
     * The argument `options` might have the following properties:
     *
     * - `timeout` : Maximum navigation time in milliseconds, defaults to 30
     *   seconds, pass 0 to disable timeout. The default value can be changed by
     *   using the
     *   {@link Page.setDefaultNavigationTimeout
     *   | page.setDefaultNavigationTimeout(timeout)}
     *   or {@link Page.setDefaultTimeout | page.setDefaultTimeout(timeout)}
     *   methods.
     *
     * - `waitUntil` : When to consider navigation succeeded, defaults to `load`.
     *    Given an array of event strings, navigation is considered to be
     *    successful after all events have been fired. Events can be either:<br/>
     *  - `load` : consider navigation to be finished when the load event is fired.<br/>
     *  - `domcontentloaded` : consider navigation to be finished when the
     *   DOMContentLoaded event is fired.<br/>
     *  - `networkidle0` : consider navigation to be finished when there are no
     *   more than 0 network connections for at least `500` ms.<br/>
     *  - `networkidle2` : consider navigation to be finished when there are no
     *   more than 2 network connections for at least `500` ms.
     */
    async goBack(options = {}) {
        return this._go(-1, options);
    }
    /**
     * This method navigate to the next page in history.
     * @param options - Navigation Parameter
     * @returns Promise which resolves to the main resource response. In case of
     * multiple redirects, the navigation will resolve with the response of the
     * last redirect. If can not go forward, resolves to `null`.
     * @remarks
     * The argument `options` might have the following properties:
     *
     * - `timeout` : Maximum navigation time in milliseconds, defaults to 30
     *   seconds, pass 0 to disable timeout. The default value can be changed by
     *   using the
     *   {@link Page.setDefaultNavigationTimeout
     *   | page.setDefaultNavigationTimeout(timeout)}
     *   or {@link Page.setDefaultTimeout | page.setDefaultTimeout(timeout)}
     *   methods.
     *
     * - `waitUntil`: When to consider navigation succeeded, defaults to `load`.
     *    Given an array of event strings, navigation is considered to be
     *    successful after all events have been fired. Events can be either:<br/>
     *  - `load` : consider navigation to be finished when the load event is fired.<br/>
     *  - `domcontentloaded` : consider navigation to be finished when the
     *   DOMContentLoaded event is fired.<br/>
     *  - `networkidle0` : consider navigation to be finished when there are no
     *   more than 0 network connections for at least `500` ms.<br/>
     *  - `networkidle2` : consider navigation to be finished when there are no
     *   more than 2 network connections for at least `500` ms.
     */
    async goForward(options = {}) {
        return this._go(+1, options);
    }
    async _go(delta, options) {
        const history = await this._client.send('Page.getNavigationHistory');
        const entry = history.entries[history.currentIndex + delta];
        if (!entry)
            return null;
        const result = await Promise.all([
            this.waitForNavigation(options),
            this._client.send('Page.navigateToHistoryEntry', { entryId: entry.id }),
        ]);
        return result[0];
    }
    /**
     * Brings page to front (activates tab).
     */
    async bringToFront() {
        await this._client.send('Page.bringToFront');
    }
    /**
     * Emulates given device metrics and user agent. This method is a shortcut for
     * calling two methods: {@link Page.setUserAgent} and {@link Page.setViewport}
     * To aid emulation, Puppeteer provides a list of device descriptors that can
     * be obtained via the {@link Puppeteer.devices} `page.emulate` will resize
     * the page. A lot of websites don't expect phones to change size, so you
     * should emulate before navigating to the page.
     * @example
     * ```js
     * const puppeteer = require('puppeteer');
     * const iPhone = puppeteer.devices['iPhone 6'];
     * (async () => {
     * const browser = await puppeteer.launch();
     * const page = await browser.newPage();
     * await page.emulate(iPhone);
     * await page.goto('https://www.google.com');
     * // other actions...
     * await browser.close();
     * })();
     * ```
     * @remarks List of all available devices is available in the source code:
     * {@link https://github.com/puppeteer/puppeteer/blob/main/src/common/DeviceDescriptors.ts | src/common/DeviceDescriptors.ts}.
     */
    async emulate(options) {
        await Promise.all([
            this.setViewport(options.viewport),
            this.setUserAgent(options.userAgent),
        ]);
    }
    /**
     * @param enabled - Whether or not to enable JavaScript on the page.
     * @returns
     * @remarks
     * NOTE: changing this value won't affect scripts that have already been run.
     * It will take full effect on the next navigation.
     */
    async setJavaScriptEnabled(enabled) {
        if (this._javascriptEnabled === enabled)
            return;
        this._javascriptEnabled = enabled;
        await this._client.send('Emulation.setScriptExecutionDisabled', {
            value: !enabled,
        });
    }
    /**
     * Toggles bypassing page's Content-Security-Policy.
     * @param enabled - sets bypassing of page's Content-Security-Policy.
     * @remarks
     * NOTE: CSP bypassing happens at the moment of CSP initialization rather than
     * evaluation. Usually, this means that `page.setBypassCSP` should be called
     * before navigating to the domain.
     */
    async setBypassCSP(enabled) {
        await this._client.send('Page.setBypassCSP', { enabled });
    }
    /**
     * @param type - Changes the CSS media type of the page. The only allowed
     * values are `screen`, `print` and `null`. Passing `null` disables CSS media
     * emulation.
     * @example
     * ```
     * await page.evaluate(() => matchMedia('screen').matches);
     * // → true
     * await page.evaluate(() => matchMedia('print').matches);
     * // → false
     *
     * await page.emulateMediaType('print');
     * await page.evaluate(() => matchMedia('screen').matches);
     * // → false
     * await page.evaluate(() => matchMedia('print').matches);
     * // → true
     *
     * await page.emulateMediaType(null);
     * await page.evaluate(() => matchMedia('screen').matches);
     * // → true
     * await page.evaluate(() => matchMedia('print').matches);
     * // → false
     * ```
     */
    async emulateMediaType(type) {
        (0, assert_js_1.assert)(type === 'screen' || type === 'print' || type === null, 'Unsupported media type: ' + type);
        await this._client.send('Emulation.setEmulatedMedia', {
            media: type || '',
        });
    }
    /**
     * Enables CPU throttling to emulate slow CPUs.
     * @param factor - slowdown factor (1 is no throttle, 2 is 2x slowdown, etc).
     */
    async emulateCPUThrottling(factor) {
        (0, assert_js_1.assert)(factor === null || factor >= 1, 'Throttling rate should be greater or equal to 1');
        await this._client.send('Emulation.setCPUThrottlingRate', {
            rate: factor !== null ? factor : 1,
        });
    }
    /**
     * @param features - `<?Array<Object>>` Given an array of media feature
     * objects, emulates CSS media features on the page. Each media feature object
     * must have the following properties:
     * @example
     * ```js
     * await page.emulateMediaFeatures([
     * { name: 'prefers-color-scheme', value: 'dark' },
     * ]);
     * await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches);
     * // → true
     * await page.evaluate(() => matchMedia('(prefers-color-scheme: light)').matches);
     * // → false
     *
     * await page.emulateMediaFeatures([
     * { name: 'prefers-reduced-motion', value: 'reduce' },
     * ]);
     * await page.evaluate(
     * () => matchMedia('(prefers-reduced-motion: reduce)').matches
     * );
     * // → true
     * await page.evaluate(
     * () => matchMedia('(prefers-reduced-motion: no-preference)').matches
     * );
     * // → false
     *
     * await page.emulateMediaFeatures([
     * { name: 'prefers-color-scheme', value: 'dark' },
     * { name: 'prefers-reduced-motion', value: 'reduce' },
     * ]);
     * await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches);
     * // → true
     * await page.evaluate(() => matchMedia('(prefers-color-scheme: light)').matches);
     * // → false
     * await page.evaluate(
     * () => matchMedia('(prefers-reduced-motion: reduce)').matches
     * );
     * // → true
     * await page.evaluate(
     * () => matchMedia('(prefers-reduced-motion: no-preference)').matches
     * );
     * // → false
     *
     * await page.emulateMediaFeatures([{ name: 'color-gamut', value: 'p3' }]);
     * await page.evaluate(() => matchMedia('(color-gamut: srgb)').matches);
     * // → true
     * await page.evaluate(() => matchMedia('(color-gamut: p3)').matches);
     * // → true
     * await page.evaluate(() => matchMedia('(color-gamut: rec2020)').matches);
     * // → false
     * ```
     */
    async emulateMediaFeatures(features) {
        if (features === null)
            await this._client.send('Emulation.setEmulatedMedia', { features: null });
        if (Array.isArray(features)) {
            features.every((mediaFeature) => {
                const name = mediaFeature.name;
                (0, assert_js_1.assert)(/^(?:prefers-(?:color-scheme|reduced-motion)|color-gamut)$/.test(name), 'Unsupported media feature: ' + name);
                return true;
            });
            await this._client.send('Emulation.setEmulatedMedia', {
                features: features,
            });
        }
    }
    /**
     * @param timezoneId - Changes the timezone of the page. See
     * {@link https://source.chromium.org/chromium/chromium/deps/icu.git/+/faee8bc70570192d82d2978a71e2a615788597d1:source/data/misc/metaZones.txt | ICU’s metaZones.txt}
     * for a list of supported timezone IDs. Passing
     * `null` disables timezone emulation.
     */
    async emulateTimezone(timezoneId) {
        try {
            await this._client.send('Emulation.setTimezoneOverride', {
                timezoneId: timezoneId || '',
            });
        }
        catch (error) {
            if (error.message.includes('Invalid timezone'))
                throw new Error(`Invalid timezone ID: ${timezoneId}`);
            throw error;
        }
    }
    /**
     * Emulates the idle state.
     * If no arguments set, clears idle state emulation.
     *
     * @example
     * ```js
     * // set idle emulation
     * await page.emulateIdleState({isUserActive: true, isScreenUnlocked: false});
     *
     * // do some checks here
     * ...
     *
     * // clear idle emulation
     * await page.emulateIdleState();
     * ```
     *
     * @param overrides - Mock idle state. If not set, clears idle overrides
     */
    async emulateIdleState(overrides) {
        if (overrides) {
            await this._client.send('Emulation.setIdleOverride', {
                isUserActive: overrides.isUserActive,
                isScreenUnlocked: overrides.isScreenUnlocked,
            });
        }
        else {
            await this._client.send('Emulation.clearIdleOverride');
        }
    }
    /**
     * Simulates the given vision deficiency on the page.
     *
     * @example
     * ```js
     * const puppeteer = require('puppeteer');
     *
     * (async () => {
     *   const browser = await puppeteer.launch();
     *   const page = await browser.newPage();
     *   await page.goto('https://v8.dev/blog/10-years');
     *
     *   await page.emulateVisionDeficiency('achromatopsia');
     *   await page.screenshot({ path: 'achromatopsia.png' });
     *
     *   await page.emulateVisionDeficiency('deuteranopia');
     *   await page.screenshot({ path: 'deuteranopia.png' });
     *
     *   await page.emulateVisionDeficiency('blurredVision');
     *   await page.screenshot({ path: 'blurred-vision.png' });
     *
     *   await browser.close();
     * })();
     * ```
     *
     * @param type - the type of deficiency to simulate, or `'none'` to reset.
     */
    async emulateVisionDeficiency(type) {
        const visionDeficiencies = new Set([
            'none',
            'achromatopsia',
            'blurredVision',
            'deuteranopia',
            'protanopia',
            'tritanopia',
        ]);
        try {
            (0, assert_js_1.assert)(!type || visionDeficiencies.has(type), `Unsupported vision deficiency: ${type}`);
            await this._client.send('Emulation.setEmulatedVisionDeficiency', {
                type: type || 'none',
            });
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * `page.setViewport` will resize the page. A lot of websites don't expect
     * phones to change size, so you should set the viewport before navigating to
     * the page.
     *
     * In the case of multiple pages in a single browser, each page can have its
     * own viewport size.
     * @example
     * ```js
     * const page = await browser.newPage();
     * await page.setViewport({
     * width: 640,
     * height: 480,
     * deviceScaleFactor: 1,
     * });
     * await page.goto('https://example.com');
     * ```
     *
     * @param viewport -
     * @remarks
     * Argument viewport have following properties:
     *
     * - `width`: page width in pixels. required
     *
     * - `height`: page height in pixels. required
     *
     * - `deviceScaleFactor`: Specify device scale factor (can be thought of as
     *   DPR). Defaults to `1`.
     *
     * - `isMobile`: Whether the meta viewport tag is taken into account. Defaults
     *   to `false`.
     *
     * - `hasTouch`: Specifies if viewport supports touch events. Defaults to `false`
     *
     * - `isLandScape`: Specifies if viewport is in landscape mode. Defaults to false.
     *
     * NOTE: in certain cases, setting viewport will reload the page in order to
     * set the isMobile or hasTouch properties.
     */
    async setViewport(viewport) {
        const needsReload = await this._emulationManager.emulateViewport(viewport);
        this._viewport = viewport;
        if (needsReload)
            await this.reload();
    }
    /**
     * @returns
     *
     * - `width`: page's width in pixels
     *
     * - `height`: page's height in pixels
     *
     * - `deviceScalarFactor`: Specify device scale factor (can be though of as
     *   dpr). Defaults to `1`.
     *
     * - `isMobile`: Whether the meta viewport tag is taken into account. Defaults
     *   to `false`.
     *
     * - `hasTouch`: Specifies if viewport supports touch events. Defaults to
     *   `false`.
     *
     * - `isLandScape`: Specifies if viewport is in landscape mode. Defaults to
     *   `false`.
     */
    viewport() {
        return this._viewport;
    }
    /**
     * @remarks
     *
     * Evaluates a function in the page's context and returns the result.
     *
     * If the function passed to `page.evaluteHandle` returns a Promise, the
     * function will wait for the promise to resolve and return its value.
     *
     * @example
     *
     * ```js
     * const result = await frame.evaluate(() => {
     *   return Promise.resolve(8 * 7);
     * });
     * console.log(result); // prints "56"
     * ```
     *
     * You can pass a string instead of a function (although functions are
     * recommended as they are easier to debug and use with TypeScript):
     *
     * @example
     * ```
     * const aHandle = await page.evaluate('1 + 2');
     * ```
     *
     * To get the best TypeScript experience, you should pass in as the
     * generic the type of `pageFunction`:
     *
     * ```
     * const aHandle = await page.evaluate<() => number>(() => 2);
     * ```
     *
     * @example
     *
     * {@link ElementHandle} instances (including {@link JSHandle}s) can be passed
     * as arguments to the `pageFunction`:
     *
     * ```
     * const bodyHandle = await page.$('body');
     * const html = await page.evaluate(body => body.innerHTML, bodyHandle);
     * await bodyHandle.dispose();
     * ```
     *
     * @param pageFunction - a function that is run within the page
     * @param args - arguments to be passed to the pageFunction
     *
     * @returns the return value of `pageFunction`.
     */
    async evaluate(pageFunction, ...args) {
        return this._frameManager.mainFrame().evaluate(pageFunction, ...args);
    }
    /**
     * Adds a function which would be invoked in one of the following scenarios:
     *
     * - whenever the page is navigated
     *
     * - whenever the child frame is attached or navigated. In this case, the
     * function is invoked in the context of the newly attached frame.
     *
     * The function is invoked after the document was created but before any of
     * its scripts were run. This is useful to amend the JavaScript environment,
     * e.g. to seed `Math.random`.
     * @param pageFunction - Function to be evaluated in browser context
     * @param args - Arguments to pass to `pageFunction`
     * @example
     * An example of overriding the navigator.languages property before the page loads:
     * ```js
     * // preload.js
     *
     * // overwrite the `languages` property to use a custom getter
     * Object.defineProperty(navigator, 'languages', {
     * get: function () {
     * return ['en-US', 'en', 'bn'];
     * },
     * });
     *
     * // In your puppeteer script, assuming the preload.js file is
     * in same folder of our script
     * const preloadFile = fs.readFileSync('./preload.js', 'utf8');
     * await page.evaluateOnNewDocument(preloadFile);
     * ```
     */
    async evaluateOnNewDocument(pageFunction, ...args) {
        const source = helper_js_1.helper.evaluationString(pageFunction, ...args);
        await this._client.send('Page.addScriptToEvaluateOnNewDocument', {
            source,
        });
    }
    /**
     * Toggles ignoring cache for each request based on the enabled state. By
     * default, caching is enabled.
     * @param enabled - sets the `enabled` state of cache
     */
    async setCacheEnabled(enabled = true) {
        await this._frameManager.networkManager().setCacheEnabled(enabled);
    }
    /**
     * @remarks
     * Options object which might have the following properties:
     *
     * - `path` : The file path to save the image to. The screenshot type
     *   will be inferred from file extension. If `path` is a relative path, then
     *   it is resolved relative to
     *   {@link https://nodejs.org/api/process.html#process_process_cwd
     *   | current working directory}.
     *   If no path is provided, the image won't be saved to the disk.
     *
     * - `type` : Specify screenshot type, can be either `jpeg` or `png`.
     *   Defaults to 'png'.
     *
     * - `quality` : The quality of the image, between 0-100. Not
     *   applicable to `png` images.
     *
     * - `fullPage` : When true, takes a screenshot of the full
     *   scrollable page. Defaults to `false`
     *
     * - `clip` : An object which specifies clipping region of the page.
     *   Should have the following fields:<br/>
     *  - `x` : x-coordinate of top-left corner of clip area.<br/>
     *  - `y` :  y-coordinate of top-left corner of clip area.<br/>
     *  - `width` : width of clipping area.<br/>
     *  - `height` : height of clipping area.
     *
     * - `omitBackground` : Hides default white background and allows
     *   capturing screenshots with transparency. Defaults to `false`
     *
     * - `encoding` : The encoding of the image, can be either base64 or
     *   binary. Defaults to `binary`.
     *
     *
     * NOTE: Screenshots take at least 1/6 second on OS X. See
     * {@link https://crbug.com/741689} for discussion.
     * @returns Promise which resolves to buffer or a base64 string (depending on
     * the value of `encoding`) with captured screenshot.
     */
    async screenshot(options = {}) {
        let screenshotType = null;
        // options.type takes precedence over inferring the type from options.path
        // because it may be a 0-length file with no extension created beforehand
        // (i.e. as a temp file).
        if (options.type) {
            const type = options.type;
            if (type !== 'png' && type !== 'jpeg' && type !== 'webp') {
                (0, assert_js_1.assertNever)(type, 'Unknown options.type value: ' + type);
            }
            screenshotType = options.type;
        }
        else if (options.path) {
            const filePath = options.path;
            const extension = filePath
                .slice(filePath.lastIndexOf('.') + 1)
                .toLowerCase();
            if (extension === 'png')
                screenshotType = 'png';
            else if (extension === 'jpg' || extension === 'jpeg')
                screenshotType = 'jpeg';
            else if (extension === 'webp')
                screenshotType = 'webp';
            (0, assert_js_1.assert)(screenshotType, `Unsupported screenshot type for extension \`.${extension}\``);
        }
        if (!screenshotType)
            screenshotType = 'png';
        if (options.quality) {
            (0, assert_js_1.assert)(screenshotType === 'jpeg' || screenshotType === 'webp', 'options.quality is unsupported for the ' +
                screenshotType +
                ' screenshots');
            (0, assert_js_1.assert)(typeof options.quality === 'number', 'Expected options.quality to be a number but found ' +
                typeof options.quality);
            (0, assert_js_1.assert)(Number.isInteger(options.quality), 'Expected options.quality to be an integer');
            (0, assert_js_1.assert)(options.quality >= 0 && options.quality <= 100, 'Expected options.quality to be between 0 and 100 (inclusive), got ' +
                options.quality);
        }
        (0, assert_js_1.assert)(!options.clip || !options.fullPage, 'options.clip and options.fullPage are exclusive');
        if (options.clip) {
            (0, assert_js_1.assert)(typeof options.clip.x === 'number', 'Expected options.clip.x to be a number but found ' +
                typeof options.clip.x);
            (0, assert_js_1.assert)(typeof options.clip.y === 'number', 'Expected options.clip.y to be a number but found ' +
                typeof options.clip.y);
            (0, assert_js_1.assert)(typeof options.clip.width === 'number', 'Expected options.clip.width to be a number but found ' +
                typeof options.clip.width);
            (0, assert_js_1.assert)(typeof options.clip.height === 'number', 'Expected options.clip.height to be a number but found ' +
                typeof options.clip.height);
            (0, assert_js_1.assert)(options.clip.width !== 0, 'Expected options.clip.width not to be 0.');
            (0, assert_js_1.assert)(options.clip.height !== 0, 'Expected options.clip.height not to be 0.');
        }
        return this._screenshotTaskQueue.postTask(() => this._screenshotTask(screenshotType, options));
    }
    async _screenshotTask(format, options) {
        await this._client.send('Target.activateTarget', {
            targetId: this._target._targetId,
        });
        let clip = options.clip ? processClip(options.clip) : undefined;
        let { captureBeyondViewport = true } = options;
        captureBeyondViewport =
            typeof captureBeyondViewport === 'boolean' ? captureBeyondViewport : true;
        if (options.fullPage) {
            const metrics = await this._client.send('Page.getLayoutMetrics');
            // Fallback to `contentSize` in case of using Firefox.
            const { width, height } = metrics.cssContentSize || metrics.contentSize;
            // Overwrite clip for full page.
            clip = { x: 0, y: 0, width, height, scale: 1 };
            if (!captureBeyondViewport) {
                const { isMobile = false, deviceScaleFactor = 1, isLandscape = false, } = this._viewport || {};
                const screenOrientation = isLandscape
                    ? { angle: 90, type: 'landscapePrimary' }
                    : { angle: 0, type: 'portraitPrimary' };
                await this._client.send('Emulation.setDeviceMetricsOverride', {
                    mobile: isMobile,
                    width,
                    height,
                    deviceScaleFactor,
                    screenOrientation,
                });
            }
        }
        const shouldSetDefaultBackground = options.omitBackground && (format === 'png' || format === 'webp');
        if (shouldSetDefaultBackground) {
            await this._setTransparentBackgroundColor();
        }
        const result = await this._client.send('Page.captureScreenshot', {
            format,
            quality: options.quality,
            clip,
            captureBeyondViewport,
        });
        if (shouldSetDefaultBackground) {
            await this._resetDefaultBackgroundColor();
        }
        if (options.fullPage && this._viewport)
            await this.setViewport(this._viewport);
        const buffer = options.encoding === 'base64'
            ? result.data
            : Buffer.from(result.data, 'base64');
        if (options.path) {
            if (!environment_js_1.isNode) {
                throw new Error('Screenshots can only be written to a file path in a Node environment.');
            }
            const fs = await helper_js_1.helper.importFSModule();
            await fs.promises.writeFile(options.path, buffer);
        }
        return buffer;
        function processClip(clip) {
            const x = Math.round(clip.x);
            const y = Math.round(clip.y);
            const width = Math.round(clip.width + clip.x - x);
            const height = Math.round(clip.height + clip.y - y);
            return { x, y, width, height, scale: 1 };
        }
    }
    /**
     * Generatees a PDF of the page with the `print` CSS media type.
     * @remarks
     *
     * NOTE: PDF generation is only supported in Chrome headless mode.
     *
     * To generate a PDF with the `screen` media type, call
     * {@link Page.emulateMediaType | `page.emulateMediaType('screen')`} before
     * calling `page.pdf()`.
     *
     * By default, `page.pdf()` generates a pdf with modified colors for printing.
     * Use the
     * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-print-color-adjust | `-webkit-print-color-adjust`}
     * property to force rendering of exact colors.
     *
     *
     * @param options - options for generating the PDF.
     */
    async createPDFStream(options = {}) {
        const { scale = 1, displayHeaderFooter = false, headerTemplate = '', footerTemplate = '', printBackground = false, landscape = false, pageRanges = '', preferCSSPageSize = false, margin = {}, omitBackground = false, timeout = 30000, } = options;
        let paperWidth = 8.5;
        let paperHeight = 11;
        if (options.format) {
            const format = PDFOptions_js_1.paperFormats[options.format.toLowerCase()];
            (0, assert_js_1.assert)(format, 'Unknown paper format: ' + options.format);
            paperWidth = format.width;
            paperHeight = format.height;
        }
        else {
            paperWidth = convertPrintParameterToInches(options.width) || paperWidth;
            paperHeight =
                convertPrintParameterToInches(options.height) || paperHeight;
        }
        const marginTop = convertPrintParameterToInches(margin.top) || 0;
        const marginLeft = convertPrintParameterToInches(margin.left) || 0;
        const marginBottom = convertPrintParameterToInches(margin.bottom) || 0;
        const marginRight = convertPrintParameterToInches(margin.right) || 0;
        if (omitBackground) {
            await this._setTransparentBackgroundColor();
        }
        const printCommandPromise = this._client.send('Page.printToPDF', {
            transferMode: 'ReturnAsStream',
            landscape,
            displayHeaderFooter,
            headerTemplate,
            footerTemplate,
            printBackground,
            scale,
            paperWidth,
            paperHeight,
            marginTop,
            marginBottom,
            marginLeft,
            marginRight,
            pageRanges,
            preferCSSPageSize,
        });
        const result = await helper_js_1.helper.waitWithTimeout(printCommandPromise, 'Page.printToPDF', timeout);
        if (omitBackground) {
            await this._resetDefaultBackgroundColor();
        }
        return helper_js_1.helper.getReadableFromProtocolStream(this._client, result.stream);
    }
    /**
     * @param options -
     * @returns
     */
    async pdf(options = {}) {
        const { path = undefined } = options;
        const readable = await this.createPDFStream(options);
        return await helper_js_1.helper.getReadableAsBuffer(readable, path);
    }
    /**
     * @returns The page's title
     * @remarks
     * Shortcut for {@link Frame.title | page.mainFrame().title()}.
     */
    async title() {
        return this.mainFrame().title();
    }
    async close(options = { runBeforeUnload: undefined }) {
        (0, assert_js_1.assert)(!!this._client._connection, 'Protocol error: Connection closed. Most likely the page has been closed.');
        const runBeforeUnload = !!options.runBeforeUnload;
        if (runBeforeUnload) {
            await this._client.send('Page.close');
        }
        else {
            await this._client._connection.send('Target.closeTarget', {
                targetId: this._target._targetId,
            });
            await this._target._isClosedPromise;
        }
    }
    /**
     * Indicates that the page has been closed.
     * @returns
     */
    isClosed() {
        return this._closed;
    }
    get mouse() {
        return this._mouse;
    }
    /**
     * This method fetches an element with `selector`, scrolls it into view if
     * needed, and then uses {@link Page.mouse} to click in the center of the
     * element. If there's no element matching `selector`, the method throws an
     * error.
     * @remarks Bear in mind that if `click()` triggers a navigation event and
     * there's a separate `page.waitForNavigation()` promise to be resolved, you
     * may end up with a race condition that yields unexpected results. The
     * correct pattern for click and wait for navigation is the following:
     * ```js
     * const [response] = await Promise.all([
     * page.waitForNavigation(waitOptions),
     * page.click(selector, clickOptions),
     * ]);
     * ```
     * Shortcut for {@link Frame.click | page.mainFrame().click(selector[, options]) }.
     * @param selector - A `selector` to search for element to click. If there are
     * multiple elements satisfying the `selector`, the first will be clicked
     * @param options - `Object`
     * @returns Promise which resolves when the element matching `selector` is
     * successfully clicked. The Promise will be rejected if there is no element
     * matching `selector`.
     */
    click(selector, options = {}) {
        return this.mainFrame().click(selector, options);
    }
    /**
     * This method fetches an element with `selector` and focuses it. If there's no
     * element matching `selector`, the method throws an error.
     * @param selector - A
     * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector }
     * of an element to focus. If there are multiple elements satisfying the
     * selector, the first will be focused.
     * @returns  Promise which resolves when the element matching selector is
     * successfully focused. The promise will be rejected if there is no element
     * matching selector.
     * @remarks
     * Shortcut for {@link Frame.focus | page.mainFrame().focus(selector)}.
     */
    focus(selector) {
        return this.mainFrame().focus(selector);
    }
    /**
     * This method fetches an element with `selector`, scrolls it into view if
     * needed, and then uses {@link Page.mouse} to hover over the center of the element.
     * If there's no element matching `selector`, the method throws an error.
     * @param selector - A
     * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector}
     * to search for element to hover. If there are multiple elements satisfying
     * the selector, the first will be hovered.
     * @returns Promise which resolves when the element matching `selector` is
     * successfully hovered. Promise gets rejected if there's no element matching
     * `selector`.
     * @remarks
     * Shortcut for {@link Page.hover | page.mainFrame().hover(selector)}.
     */
    hover(selector) {
        return this.mainFrame().hover(selector);
    }
    /**
     * Triggers a `change` and `input` event once all the provided options have been
     * selected. If there's no `<select>` element matching `selector`, the method
     * throws an error.
     *
     * @example
     * ```js
     * page.select('select#colors', 'blue'); // single selection
     * page.select('select#colors', 'red', 'green', 'blue'); // multiple selections
     * ```
     * @param selector - A
     * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | Selector}
     * to query the page for
     * @param values - Values of options to select. If the `<select>` has the
     * `multiple` attribute, all values are considered, otherwise only the first one
     * is taken into account.
     * @returns
     *
     * @remarks
     * Shortcut for {@link Frame.select | page.mainFrame().select()}
     */
    select(selector, ...values) {
        return this.mainFrame().select(selector, ...values);
    }
    /**
     * This method fetches an element with `selector`, scrolls it into view if
     * needed, and then uses {@link Page.touchscreen} to tap in the center of the element.
     * If there's no element matching `selector`, the method throws an error.
     * @param selector - A
     * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | Selector}
     * to search for element to tap. If there are multiple elements satisfying the
     * selector, the first will be tapped.
     * @returns
     * @remarks
     * Shortcut for {@link Frame.tap | page.mainFrame().tap(selector)}.
     */
    tap(selector) {
        return this.mainFrame().tap(selector);
    }
    /**
     * Sends a `keydown`, `keypress/input`, and `keyup` event for each character
     * in the text.
     *
     * To press a special key, like `Control` or `ArrowDown`, use {@link Keyboard.press}.
     * @example
     * ```
     * await page.type('#mytextarea', 'Hello');
     * // Types instantly
     * await page.type('#mytextarea', 'World', { delay: 100 });
     * // Types slower, like a user
     * ```
     * @param selector - A
     * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector}
     * of an element to type into. If there are multiple elements satisfying the
     * selector, the first will be used.
     * @param text - A text to type into a focused element.
     * @param options - have property `delay` which is the Time to wait between
     * key presses in milliseconds. Defaults to `0`.
     * @returns
     * @remarks
     */
    type(selector, text, options) {
        return this.mainFrame().type(selector, text, options);
    }
    /**
     * @remarks
     *
     * This method behaves differently depending on the first parameter. If it's a
     * `string`, it will be treated as a `selector` or `xpath` (if the string
     * starts with `//`). This method then is a shortcut for
     * {@link Page.waitForSelector} or {@link Page.waitForXPath}.
     *
     * If the first argument is a function this method is a shortcut for
     * {@link Page.waitForFunction}.
     *
     * If the first argument is a `number`, it's treated as a timeout in
     * milliseconds and the method returns a promise which resolves after the
     * timeout.
     *
     * @param selectorOrFunctionOrTimeout - a selector, predicate or timeout to
     * wait for.
     * @param options - optional waiting parameters.
     * @param args - arguments to pass to `pageFunction`.
     *
     * @deprecated Don't use this method directly. Instead use the more explicit
     * methods available: {@link Page.waitForSelector},
     * {@link Page.waitForXPath}, {@link Page.waitForFunction} or
     * {@link Page.waitForTimeout}.
     */
    waitFor(selectorOrFunctionOrTimeout, options = {}, ...args) {
        return this.mainFrame().waitFor(selectorOrFunctionOrTimeout, options, ...args);
    }
    /**
     * Causes your script to wait for the given number of milliseconds.
     *
     * @remarks
     *
     * It's generally recommended to not wait for a number of seconds, but instead
     * use {@link Page.waitForSelector}, {@link Page.waitForXPath} or
     * {@link Page.waitForFunction} to wait for exactly the conditions you want.
     *
     * @example
     *
     * Wait for 1 second:
     *
     * ```
     * await page.waitForTimeout(1000);
     * ```
     *
     * @param milliseconds - the number of milliseconds to wait.
     */
    waitForTimeout(milliseconds) {
        return this.mainFrame().waitForTimeout(milliseconds);
    }
    /**
     * Wait for the `selector` to appear in page. If at the moment of calling the
     * method the `selector` already exists, the method will return immediately. If
     * the `selector` doesn't appear after the `timeout` milliseconds of waiting, the
     * function will throw.
     *
     * This method works across navigations:
     * ```js
     * const puppeteer = require('puppeteer');
     * (async () => {
     * const browser = await puppeteer.launch();
     * const page = await browser.newPage();
     * let currentURL;
     * page
     * .waitForSelector('img')
     * .then(() => console.log('First URL with image: ' + currentURL));
     * for (currentURL of [
     * 'https://example.com',
     * 'https://google.com',
     * 'https://bbc.com',
     * ]) {
     * await page.goto(currentURL);
     * }
     * await browser.close();
     * })();
     * ```
     * @param selector - A
     * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector}
     * of an element to wait for
     * @param options - Optional waiting parameters
     * @returns Promise which resolves when element specified by selector string
     * is added to DOM. Resolves to `null` if waiting for hidden: `true` and
     * selector is not found in DOM.
     * @remarks
     * The optional Parameter in Arguments `options` are :
     *
     * - `Visible`: A boolean wait for element to be present in DOM and to be
     * visible, i.e. to not have `display: none` or `visibility: hidden` CSS
     * properties. Defaults to `false`.
     *
     * - `hidden`: ait for element to not be found in the DOM or to be hidden,
     * i.e. have `display: none` or `visibility: hidden` CSS properties. Defaults to
     * `false`.
     *
     * - `timeout`: maximum time to wait for in milliseconds. Defaults to `30000`
     * (30 seconds). Pass `0` to disable timeout. The default value can be changed
     * by using the {@link Page.setDefaultTimeout} method.
     */
    waitForSelector(selector, options = {}) {
        return this.mainFrame().waitForSelector(selector, options);
    }
    /**
     * Wait for the `xpath` to appear in page. If at the moment of calling the
     * method the `xpath` already exists, the method will return immediately. If
     * the `xpath` doesn't appear after the `timeout` milliseconds of waiting, the
     * function will throw.
     *
     * This method works across navigation
     * ```js
     * const puppeteer = require('puppeteer');
     * (async () => {
     * const browser = await puppeteer.launch();
     * const page = await browser.newPage();
     * let currentURL;
     * page
     * .waitForXPath('//img')
     * .then(() => console.log('First URL with image: ' + currentURL));
     * for (currentURL of [
     * 'https://example.com',
     * 'https://google.com',
     * 'https://bbc.com',
     * ]) {
     * await page.goto(currentURL);
     * }
     * await browser.close();
     * })();
     * ```
     * @param xpath - A
     * {@link https://developer.mozilla.org/en-US/docs/Web/XPath | xpath} of an
     * element to wait for
     * @param options - Optional waiting parameters
     * @returns Promise which resolves when element specified by xpath string is
     * added to DOM. Resolves to `null` if waiting for `hidden: true` and xpath is
     * not found in DOM.
     * @remarks
     * The optional Argument `options` have properties:
     *
     * - `visible`: A boolean to wait for element to be present in DOM and to be
     * visible, i.e. to not have `display: none` or `visibility: hidden` CSS
     * properties. Defaults to `false`.
     *
     * - `hidden`: A boolean wait for element to not be found in the DOM or to be
     * hidden, i.e. have `display: none` or `visibility: hidden` CSS properties.
     * Defaults to `false`.
     *
     * - `timeout`: A number which is maximum time to wait for in milliseconds.
     * Defaults to `30000` (30 seconds). Pass `0` to disable timeout. The default
     * value can be changed by using the {@link Page.setDefaultTimeout} method.
     */
    waitForXPath(xpath, options = {}) {
        return this.mainFrame().waitForXPath(xpath, options);
    }
    /**
     * The `waitForFunction` can be used to observe viewport size change:
     *
     * ```
     * const puppeteer = require('puppeteer');
     * (async () => {
     * const browser = await puppeteer.launch();
     * const page = await browser.newPage();
     * const watchDog = page.waitForFunction('window.innerWidth < 100');
     * await page.setViewport({ width: 50, height: 50 });
     * await watchDog;
     * await browser.close();
     * })();
     * ```
     * To pass arguments from node.js to the predicate of `page.waitForFunction` function:
     * ```
     * const selector = '.foo';
     * await page.waitForFunction(
     * (selector) => !!document.querySelector(selector),
     * {},
     * selector
     * );
     * ```
     * The predicate of `page.waitForFunction` can be asynchronous too:
     * ```
     * const username = 'github-username';
     * await page.waitForFunction(
     * async (username) => {
     * const githubResponse = await fetch(
     *  `https://api.github.com/users/${username}`
     * );
     * const githubUser = await githubResponse.json();
     * // show the avatar
     * const img = document.createElement('img');
     * img.src = githubUser.avatar_url;
     * // wait 3 seconds
     * await new Promise((resolve, reject) => setTimeout(resolve, 3000));
     * img.remove();
     * },
     * {},
     * username
     * );
     * ```
     * @param pageFunction - Function to be evaluated in browser context
     * @param options - Optional waiting parameters
     * @param args -  Arguments to pass to `pageFunction`
     * @returns Promise which resolves when the `pageFunction` returns a truthy
     * value. It resolves to a JSHandle of the truthy value.
     *
     * The optional waiting parameter can be:
     *
     * - `Polling`: An interval at which the `pageFunction` is executed, defaults to
     *   `raf`. If `polling` is a number, then it is treated as an interval in
     *   milliseconds at which the function would be executed. If polling is a
     *   string, then it can be one of the following values:<br/>
     *    - `raf`: to constantly execute `pageFunction` in `requestAnimationFrame`
     *      callback. This is the tightest polling mode which is suitable to
     *      observe styling changes.<br/>
     *    - `mutation`: to execute pageFunction on every DOM mutation.
     *
     * - `timeout`: maximum time to wait for in milliseconds. Defaults to `30000`
     * (30 seconds). Pass `0` to disable timeout. The default value can be changed
     * by using the
     * {@link Page.setDefaultTimeout | page.setDefaultTimeout(timeout)} method.
     *
     */
    waitForFunction(pageFunction, options = {}, ...args) {
        return this.mainFrame().waitForFunction(pageFunction, options, ...args);
    }
}
exports.Page = Page;
const supportedMetrics = new Set([
    'Timestamp',
    'Documents',
    'Frames',
    'JSEventListeners',
    'Nodes',
    'LayoutCount',
    'RecalcStyleCount',
    'LayoutDuration',
    'RecalcStyleDuration',
    'ScriptDuration',
    'TaskDuration',
    'JSHeapUsedSize',
    'JSHeapTotalSize',
]);
const unitToPixels = {
    px: 1,
    in: 96,
    cm: 37.8,
    mm: 3.78,
};
function convertPrintParameterToInches(parameter) {
    if (typeof parameter === 'undefined')
        return undefined;
    let pixels;
    if (helper_js_1.helper.isNumber(parameter)) {
        // Treat numbers as pixel values to be aligned with phantom's paperSize.
        pixels = /** @type {number} */ parameter;
    }
    else if (helper_js_1.helper.isString(parameter)) {
        const text = /** @type {string} */ parameter;
        let unit = text.substring(text.length - 2).toLowerCase();
        let valueText = '';
        if (unitToPixels.hasOwnProperty(unit)) {
            valueText = text.substring(0, text.length - 2);
        }
        else {
            // In case of unknown unit try to parse the whole parameter as number of pixels.
            // This is consistent with phantom's paperSize behavior.
            unit = 'px';
            valueText = text;
        }
        const value = Number(valueText);
        (0, assert_js_1.assert)(!isNaN(value), 'Failed to parse parameter value: ' + text);
        pixels = value * unitToPixels[unit];
    }
    else {
        throw new Error('page.pdf() Cannot handle parameter type: ' + typeof parameter);
    }
    return pixels / 96;
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"../environment.js":53,"./Accessibility.js":14,"./Connection.js":19,"./ConsoleMessage.js":20,"./Coverage.js":21,"./Dialog.js":25,"./EmulationManager.js":26,"./EventEmitter.js":28,"./FileChooser.js":30,"./FrameManager.js":31,"./Input.js":34,"./JSHandle.js":35,"./NetworkManager.js":38,"./PDFOptions.js":39,"./TimeoutSettings.js":46,"./Tracing.js":47,"./WebWorker.js":49,"./assert.js":50,"./helper.js":52,"buffer":6}],41:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Puppeteer = void 0;
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const Errors_js_1 = require("./Errors.js");
const DeviceDescriptors_js_1 = require("./DeviceDescriptors.js");
const QueryHandler_js_1 = require("./QueryHandler.js");
const BrowserConnector_js_1 = require("./BrowserConnector.js");
const NetworkConditions_js_1 = require("./NetworkConditions.js");
/**
 * The main Puppeteer class.
 *
 * IMPORTANT: if you are using Puppeteer in a Node environment, you will get an
 * instance of {@link PuppeteerNode} when you import or require `puppeteer`.
 * That class extends `Puppeteer`, so has all the methods documented below as
 * well as all that are defined on {@link PuppeteerNode}.
 * @public
 */
class Puppeteer {
    /**
     * @internal
     */
    constructor(settings) {
        this._changedProduct = false;
        this._isPuppeteerCore = settings.isPuppeteerCore;
    }
    /**
     * This method attaches Puppeteer to an existing browser instance.
     *
     * @remarks
     *
     * @param options - Set of configurable options to set on the browser.
     * @returns Promise which resolves to browser instance.
     */
    connect(options) {
        return (0, BrowserConnector_js_1.connectToBrowser)(options);
    }
    /**
     * @remarks
     * A list of devices to be used with `page.emulate(options)`. Actual list of devices can be found in {@link https://github.com/puppeteer/puppeteer/blob/main/src/common/DeviceDescriptors.ts | src/common/DeviceDescriptors.ts}.
     *
     * @example
     *
     * ```js
     * const puppeteer = require('puppeteer');
     * const iPhone = puppeteer.devices['iPhone 6'];
     *
     * (async () => {
     *   const browser = await puppeteer.launch();
     *   const page = await browser.newPage();
     *   await page.emulate(iPhone);
     *   await page.goto('https://www.google.com');
     *   // other actions...
     *   await browser.close();
     * })();
     * ```
     *
     */
    get devices() {
        return DeviceDescriptors_js_1.devicesMap;
    }
    /**
     * @remarks
     *
     * Puppeteer methods might throw errors if they are unable to fulfill a request.
     * For example, `page.waitForSelector(selector[, options])` might fail if
     * the selector doesn't match any nodes during the given timeframe.
     *
     * For certain types of errors Puppeteer uses specific error classes.
     * These classes are available via `puppeteer.errors`.
     *
     * @example
     * An example of handling a timeout error:
     * ```js
     * try {
     *   await page.waitForSelector('.foo');
     * } catch (e) {
     *   if (e instanceof puppeteer.errors.TimeoutError) {
     *     // Do something if this is a timeout.
     *   }
     * }
     * ```
     */
    get errors() {
        return Errors_js_1.puppeteerErrors;
    }
    /**
     * @remarks
     * Returns a list of network conditions to be used with `page.emulateNetworkConditions(networkConditions)`. Actual list of predefined conditions can be found in {@link https://github.com/puppeteer/puppeteer/blob/main/src/common/NetworkConditions.ts | src/common/NetworkConditions.ts}.
     *
     * @example
     *
     * ```js
     * const puppeteer = require('puppeteer');
     * const slow3G = puppeteer.networkConditions['Slow 3G'];
     *
     * (async () => {
     *   const browser = await puppeteer.launch();
     *   const page = await browser.newPage();
     *   await page.emulateNetworkConditions(slow3G);
     *   await page.goto('https://www.google.com');
     *   // other actions...
     *   await browser.close();
     * })();
     * ```
     *
     */
    get networkConditions() {
        return NetworkConditions_js_1.networkConditions;
    }
    /**
     * Registers a {@link CustomQueryHandler | custom query handler}. After
     * registration, the handler can be used everywhere where a selector is
     * expected by prepending the selection string with `<name>/`. The name is
     * only allowed to consist of lower- and upper case latin letters.
     * @example
     * ```
     * puppeteer.registerCustomQueryHandler('text', { … });
     * const aHandle = await page.$('text/…');
     * ```
     * @param name - The name that the custom query handler will be registered under.
     * @param queryHandler - The {@link CustomQueryHandler | custom query handler} to
     * register.
     */
    registerCustomQueryHandler(name, queryHandler) {
        (0, QueryHandler_js_1.registerCustomQueryHandler)(name, queryHandler);
    }
    /**
     * @param name - The name of the query handler to unregistered.
     */
    unregisterCustomQueryHandler(name) {
        (0, QueryHandler_js_1.unregisterCustomQueryHandler)(name);
    }
    /**
     * @returns a list with the names of all registered custom query handlers.
     */
    customQueryHandlerNames() {
        return (0, QueryHandler_js_1.customQueryHandlerNames)();
    }
    /**
     * Clears all registered handlers.
     */
    clearCustomQueryHandlers() {
        (0, QueryHandler_js_1.clearCustomQueryHandlers)();
    }
}
exports.Puppeteer = Puppeteer;

},{"./BrowserConnector.js":17,"./DeviceDescriptors.js":24,"./Errors.js":27,"./NetworkConditions.js":37,"./QueryHandler.js":42}],42:[function(require,module,exports){
"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueryHandlerAndSelector = exports.clearCustomQueryHandlers = exports.customQueryHandlerNames = exports.unregisterCustomQueryHandler = exports.registerCustomQueryHandler = void 0;
const AriaQueryHandler_js_1 = require("./AriaQueryHandler.js");
function makeQueryHandler(handler) {
    const internalHandler = {};
    if (handler.queryOne) {
        internalHandler.queryOne = async (element, selector) => {
            const jsHandle = await element.evaluateHandle(handler.queryOne, selector);
            const elementHandle = jsHandle.asElement();
            if (elementHandle)
                return elementHandle;
            await jsHandle.dispose();
            return null;
        };
        internalHandler.waitFor = (domWorld, selector, options) => domWorld.waitForSelectorInPage(handler.queryOne, selector, options);
    }
    if (handler.queryAll) {
        internalHandler.queryAll = async (element, selector) => {
            const jsHandle = await element.evaluateHandle(handler.queryAll, selector);
            const properties = await jsHandle.getProperties();
            await jsHandle.dispose();
            const result = [];
            for (const property of properties.values()) {
                const elementHandle = property.asElement();
                if (elementHandle)
                    result.push(elementHandle);
            }
            return result;
        };
        internalHandler.queryAllArray = async (element, selector) => {
            const resultHandle = await element.evaluateHandle(handler.queryAll, selector);
            const arrayHandle = await resultHandle.evaluateHandle((res) => Array.from(res));
            return arrayHandle;
        };
    }
    return internalHandler;
}
const _defaultHandler = makeQueryHandler({
    queryOne: (element, selector) => element.querySelector(selector),
    queryAll: (element, selector) => element.querySelectorAll(selector),
});
const pierceHandler = makeQueryHandler({
    queryOne: (element, selector) => {
        let found = null;
        const search = (root) => {
            const iter = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
            do {
                const currentNode = iter.currentNode;
                if (currentNode.shadowRoot) {
                    search(currentNode.shadowRoot);
                }
                if (currentNode instanceof ShadowRoot) {
                    continue;
                }
                if (!found && currentNode.matches(selector)) {
                    found = currentNode;
                }
            } while (!found && iter.nextNode());
        };
        if (element instanceof Document) {
            element = element.documentElement;
        }
        search(element);
        return found;
    },
    queryAll: (element, selector) => {
        const result = [];
        const collect = (root) => {
            const iter = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
            do {
                const currentNode = iter.currentNode;
                if (currentNode.shadowRoot) {
                    collect(currentNode.shadowRoot);
                }
                if (currentNode instanceof ShadowRoot) {
                    continue;
                }
                if (currentNode.matches(selector)) {
                    result.push(currentNode);
                }
            } while (iter.nextNode());
        };
        if (element instanceof Document) {
            element = element.documentElement;
        }
        collect(element);
        return result;
    },
});
const _builtInHandlers = new Map([
    ['aria', AriaQueryHandler_js_1.ariaHandler],
    ['pierce', pierceHandler],
]);
const _queryHandlers = new Map(_builtInHandlers);
/**
 * @internal
 */
function registerCustomQueryHandler(name, handler) {
    if (_queryHandlers.get(name))
        throw new Error(`A custom query handler named "${name}" already exists`);
    const isValidName = /^[a-zA-Z]+$/.test(name);
    if (!isValidName)
        throw new Error(`Custom query handler names may only contain [a-zA-Z]`);
    const internalHandler = makeQueryHandler(handler);
    _queryHandlers.set(name, internalHandler);
}
exports.registerCustomQueryHandler = registerCustomQueryHandler;
/**
 * @internal
 */
function unregisterCustomQueryHandler(name) {
    if (_queryHandlers.has(name) && !_builtInHandlers.has(name)) {
        _queryHandlers.delete(name);
    }
}
exports.unregisterCustomQueryHandler = unregisterCustomQueryHandler;
/**
 * @internal
 */
function customQueryHandlerNames() {
    return [..._queryHandlers.keys()].filter((name) => !_builtInHandlers.has(name));
}
exports.customQueryHandlerNames = customQueryHandlerNames;
/**
 * @internal
 */
function clearCustomQueryHandlers() {
    customQueryHandlerNames().forEach(unregisterCustomQueryHandler);
}
exports.clearCustomQueryHandlers = clearCustomQueryHandlers;
/**
 * @internal
 */
function getQueryHandlerAndSelector(selector) {
    const hasCustomQueryHandler = /^[a-zA-Z]+\//.test(selector);
    if (!hasCustomQueryHandler)
        return { updatedSelector: selector, queryHandler: _defaultHandler };
    const index = selector.indexOf('/');
    const name = selector.slice(0, index);
    const updatedSelector = selector.slice(index + 1);
    const queryHandler = _queryHandlers.get(name);
    if (!queryHandler)
        throw new Error(`Query set to use "${name}", but no query handler of that name was found`);
    return {
        updatedSelector,
        queryHandler,
    };
}
exports.getQueryHandlerAndSelector = getQueryHandlerAndSelector;

},{"./AriaQueryHandler.js":15}],43:[function(require,module,exports){
"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityDetails = void 0;
/**
 * The SecurityDetails class represents the security details of a
 * response that was received over a secure connection.
 *
 * @public
 */
class SecurityDetails {
    /**
     * @internal
     */
    constructor(securityPayload) {
        this._subjectName = securityPayload.subjectName;
        this._issuer = securityPayload.issuer;
        this._validFrom = securityPayload.validFrom;
        this._validTo = securityPayload.validTo;
        this._protocol = securityPayload.protocol;
        this._sanList = securityPayload.sanList;
    }
    /**
     * @returns The name of the issuer of the certificate.
     */
    issuer() {
        return this._issuer;
    }
    /**
     * @returns {@link https://en.wikipedia.org/wiki/Unix_time | Unix timestamp}
     * marking the start of the certificate's validity.
     */
    validFrom() {
        return this._validFrom;
    }
    /**
     * @returns {@link https://en.wikipedia.org/wiki/Unix_time | Unix timestamp}
     * marking the end of the certificate's validity.
     */
    validTo() {
        return this._validTo;
    }
    /**
     * @returns The security protocol being used, e.g. "TLS 1.2".
     */
    protocol() {
        return this._protocol;
    }
    /**
     * @returns The name of the subject to which the certificate was issued.
     */
    subjectName() {
        return this._subjectName;
    }
    /**
     * @returns The list of {@link https://en.wikipedia.org/wiki/Subject_Alternative_Name | subject alternative names (SANs)} of the certificate.
     */
    subjectAlternativeNames() {
        return this._sanList;
    }
}
exports.SecurityDetails = SecurityDetails;

},{}],44:[function(require,module,exports){
"use strict";
/**
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Target = void 0;
const Page_js_1 = require("./Page.js");
const WebWorker_js_1 = require("./WebWorker.js");
/**
 * @public
 */
class Target {
    /**
     * @internal
     */
    constructor(targetInfo, browserContext, sessionFactory, ignoreHTTPSErrors, defaultViewport, screenshotTaskQueue) {
        this._targetInfo = targetInfo;
        this._browserContext = browserContext;
        this._targetId = targetInfo.targetId;
        this._sessionFactory = sessionFactory;
        this._ignoreHTTPSErrors = ignoreHTTPSErrors;
        this._defaultViewport = defaultViewport;
        this._screenshotTaskQueue = screenshotTaskQueue;
        /** @type {?Promise<!Puppeteer.Page>} */
        this._pagePromise = null;
        /** @type {?Promise<!WebWorker>} */
        this._workerPromise = null;
        this._initializedPromise = new Promise((fulfill) => (this._initializedCallback = fulfill)).then(async (success) => {
            if (!success)
                return false;
            const opener = this.opener();
            if (!opener || !opener._pagePromise || this.type() !== 'page')
                return true;
            const openerPage = await opener._pagePromise;
            if (!openerPage.listenerCount("popup" /* Popup */))
                return true;
            const popupPage = await this.page();
            openerPage.emit("popup" /* Popup */, popupPage);
            return true;
        });
        this._isClosedPromise = new Promise((fulfill) => (this._closedCallback = fulfill));
        this._isInitialized =
            this._targetInfo.type !== 'page' || this._targetInfo.url !== '';
        if (this._isInitialized)
            this._initializedCallback(true);
    }
    /**
     * Creates a Chrome Devtools Protocol session attached to the target.
     */
    createCDPSession() {
        return this._sessionFactory();
    }
    /**
     * If the target is not of type `"page"` or `"background_page"`, returns `null`.
     */
    async page() {
        if ((this._targetInfo.type === 'page' ||
            this._targetInfo.type === 'background_page' ||
            this._targetInfo.type === 'webview') &&
            !this._pagePromise) {
            this._pagePromise = this._sessionFactory().then((client) => Page_js_1.Page.create(client, this, this._ignoreHTTPSErrors, this._defaultViewport, this._screenshotTaskQueue));
        }
        return this._pagePromise;
    }
    /**
     * If the target is not of type `"service_worker"` or `"shared_worker"`, returns `null`.
     */
    async worker() {
        if (this._targetInfo.type !== 'service_worker' &&
            this._targetInfo.type !== 'shared_worker')
            return null;
        if (!this._workerPromise) {
            // TODO(einbinder): Make workers send their console logs.
            this._workerPromise = this._sessionFactory().then((client) => new WebWorker_js_1.WebWorker(client, this._targetInfo.url, () => { } /* consoleAPICalled */, () => { } /* exceptionThrown */));
        }
        return this._workerPromise;
    }
    url() {
        return this._targetInfo.url;
    }
    /**
     * Identifies what kind of target this is.
     *
     * @remarks
     *
     * See {@link https://developer.chrome.com/extensions/background_pages | docs} for more info about background pages.
     */
    type() {
        const type = this._targetInfo.type;
        if (type === 'page' ||
            type === 'background_page' ||
            type === 'service_worker' ||
            type === 'shared_worker' ||
            type === 'browser' ||
            type === 'webview')
            return type;
        return 'other';
    }
    /**
     * Get the browser the target belongs to.
     */
    browser() {
        return this._browserContext.browser();
    }
    /**
     * Get the browser context the target belongs to.
     */
    browserContext() {
        return this._browserContext;
    }
    /**
     * Get the target that opened this target. Top-level targets return `null`.
     */
    opener() {
        const { openerId } = this._targetInfo;
        if (!openerId)
            return null;
        return this.browser()._targets.get(openerId);
    }
    /**
     * @internal
     */
    _targetInfoChanged(targetInfo) {
        this._targetInfo = targetInfo;
        if (!this._isInitialized &&
            (this._targetInfo.type !== 'page' || this._targetInfo.url !== '')) {
            this._isInitialized = true;
            this._initializedCallback(true);
            return;
        }
    }
}
exports.Target = Target;

},{"./Page.js":40,"./WebWorker.js":49}],45:[function(require,module,exports){
"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskQueue = void 0;
class TaskQueue {
    constructor() {
        this._chain = Promise.resolve();
    }
    postTask(task) {
        const result = this._chain.then(task);
        this._chain = result.then(() => undefined, () => undefined);
        return result;
    }
}
exports.TaskQueue = TaskQueue;

},{}],46:[function(require,module,exports){
"use strict";
/**
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutSettings = void 0;
const DEFAULT_TIMEOUT = 30000;
/**
 * @internal
 */
class TimeoutSettings {
    constructor() {
        this._defaultTimeout = null;
        this._defaultNavigationTimeout = null;
    }
    setDefaultTimeout(timeout) {
        this._defaultTimeout = timeout;
    }
    setDefaultNavigationTimeout(timeout) {
        this._defaultNavigationTimeout = timeout;
    }
    navigationTimeout() {
        if (this._defaultNavigationTimeout !== null)
            return this._defaultNavigationTimeout;
        if (this._defaultTimeout !== null)
            return this._defaultTimeout;
        return DEFAULT_TIMEOUT;
    }
    timeout() {
        if (this._defaultTimeout !== null)
            return this._defaultTimeout;
        return DEFAULT_TIMEOUT;
    }
}
exports.TimeoutSettings = TimeoutSettings;

},{}],47:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tracing = void 0;
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const assert_js_1 = require("./assert.js");
const helper_js_1 = require("./helper.js");
/**
 * The Tracing class exposes the tracing audit interface.
 * @remarks
 * You can use `tracing.start` and `tracing.stop` to create a trace file
 * which can be opened in Chrome DevTools or {@link https://chromedevtools.github.io/timeline-viewer/ | timeline viewer}.
 *
 * @example
 * ```js
 * await page.tracing.start({path: 'trace.json'});
 * await page.goto('https://www.google.com');
 * await page.tracing.stop();
 * ```
 *
 * @public
 */
class Tracing {
    /**
     * @internal
     */
    constructor(client) {
        this._recording = false;
        this._path = '';
        this._client = client;
    }
    /**
     * Starts a trace for the current page.
     * @remarks
     * Only one trace can be active at a time per browser.
     * @param options - Optional `TracingOptions`.
     */
    async start(options = {}) {
        (0, assert_js_1.assert)(!this._recording, 'Cannot start recording trace while already recording trace.');
        const defaultCategories = [
            '-*',
            'devtools.timeline',
            'v8.execute',
            'disabled-by-default-devtools.timeline',
            'disabled-by-default-devtools.timeline.frame',
            'toplevel',
            'blink.console',
            'blink.user_timing',
            'latencyInfo',
            'disabled-by-default-devtools.timeline.stack',
            'disabled-by-default-v8.cpu_profiler',
        ];
        const { path = null, screenshots = false, categories = defaultCategories, } = options;
        if (screenshots)
            categories.push('disabled-by-default-devtools.screenshot');
        const excludedCategories = categories
            .filter((cat) => cat.startsWith('-'))
            .map((cat) => cat.slice(1));
        const includedCategories = categories.filter((cat) => !cat.startsWith('-'));
        this._path = path;
        this._recording = true;
        await this._client.send('Tracing.start', {
            transferMode: 'ReturnAsStream',
            traceConfig: {
                excludedCategories,
                includedCategories,
            },
        });
    }
    /**
     * Stops a trace started with the `start` method.
     * @returns Promise which resolves to buffer with trace data.
     */
    async stop() {
        let fulfill;
        let reject;
        const contentPromise = new Promise((x, y) => {
            fulfill = x;
            reject = y;
        });
        this._client.once('Tracing.tracingComplete', async (event) => {
            try {
                const readable = await helper_js_1.helper.getReadableFromProtocolStream(this._client, event.stream);
                const buffer = await helper_js_1.helper.getReadableAsBuffer(readable, this._path);
                fulfill(buffer);
            }
            catch (error) {
                reject(error);
            }
        });
        await this._client.send('Tracing.end');
        this._recording = false;
        return contentPromise;
    }
}
exports.Tracing = Tracing;

},{"./assert.js":50,"./helper.js":52}],48:[function(require,module,exports){
"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyDefinitions = void 0;
/**
 * @internal
 */
exports.keyDefinitions = {
    '0': { keyCode: 48, key: '0', code: 'Digit0' },
    '1': { keyCode: 49, key: '1', code: 'Digit1' },
    '2': { keyCode: 50, key: '2', code: 'Digit2' },
    '3': { keyCode: 51, key: '3', code: 'Digit3' },
    '4': { keyCode: 52, key: '4', code: 'Digit4' },
    '5': { keyCode: 53, key: '5', code: 'Digit5' },
    '6': { keyCode: 54, key: '6', code: 'Digit6' },
    '7': { keyCode: 55, key: '7', code: 'Digit7' },
    '8': { keyCode: 56, key: '8', code: 'Digit8' },
    '9': { keyCode: 57, key: '9', code: 'Digit9' },
    Power: { key: 'Power', code: 'Power' },
    Eject: { key: 'Eject', code: 'Eject' },
    Abort: { keyCode: 3, code: 'Abort', key: 'Cancel' },
    Help: { keyCode: 6, code: 'Help', key: 'Help' },
    Backspace: { keyCode: 8, code: 'Backspace', key: 'Backspace' },
    Tab: { keyCode: 9, code: 'Tab', key: 'Tab' },
    Numpad5: {
        keyCode: 12,
        shiftKeyCode: 101,
        key: 'Clear',
        code: 'Numpad5',
        shiftKey: '5',
        location: 3,
    },
    NumpadEnter: {
        keyCode: 13,
        code: 'NumpadEnter',
        key: 'Enter',
        text: '\r',
        location: 3,
    },
    Enter: { keyCode: 13, code: 'Enter', key: 'Enter', text: '\r' },
    '\r': { keyCode: 13, code: 'Enter', key: 'Enter', text: '\r' },
    '\n': { keyCode: 13, code: 'Enter', key: 'Enter', text: '\r' },
    ShiftLeft: { keyCode: 16, code: 'ShiftLeft', key: 'Shift', location: 1 },
    ShiftRight: { keyCode: 16, code: 'ShiftRight', key: 'Shift', location: 2 },
    ControlLeft: {
        keyCode: 17,
        code: 'ControlLeft',
        key: 'Control',
        location: 1,
    },
    ControlRight: {
        keyCode: 17,
        code: 'ControlRight',
        key: 'Control',
        location: 2,
    },
    AltLeft: { keyCode: 18, code: 'AltLeft', key: 'Alt', location: 1 },
    AltRight: { keyCode: 18, code: 'AltRight', key: 'Alt', location: 2 },
    Pause: { keyCode: 19, code: 'Pause', key: 'Pause' },
    CapsLock: { keyCode: 20, code: 'CapsLock', key: 'CapsLock' },
    Escape: { keyCode: 27, code: 'Escape', key: 'Escape' },
    Convert: { keyCode: 28, code: 'Convert', key: 'Convert' },
    NonConvert: { keyCode: 29, code: 'NonConvert', key: 'NonConvert' },
    Space: { keyCode: 32, code: 'Space', key: ' ' },
    Numpad9: {
        keyCode: 33,
        shiftKeyCode: 105,
        key: 'PageUp',
        code: 'Numpad9',
        shiftKey: '9',
        location: 3,
    },
    PageUp: { keyCode: 33, code: 'PageUp', key: 'PageUp' },
    Numpad3: {
        keyCode: 34,
        shiftKeyCode: 99,
        key: 'PageDown',
        code: 'Numpad3',
        shiftKey: '3',
        location: 3,
    },
    PageDown: { keyCode: 34, code: 'PageDown', key: 'PageDown' },
    End: { keyCode: 35, code: 'End', key: 'End' },
    Numpad1: {
        keyCode: 35,
        shiftKeyCode: 97,
        key: 'End',
        code: 'Numpad1',
        shiftKey: '1',
        location: 3,
    },
    Home: { keyCode: 36, code: 'Home', key: 'Home' },
    Numpad7: {
        keyCode: 36,
        shiftKeyCode: 103,
        key: 'Home',
        code: 'Numpad7',
        shiftKey: '7',
        location: 3,
    },
    ArrowLeft: { keyCode: 37, code: 'ArrowLeft', key: 'ArrowLeft' },
    Numpad4: {
        keyCode: 37,
        shiftKeyCode: 100,
        key: 'ArrowLeft',
        code: 'Numpad4',
        shiftKey: '4',
        location: 3,
    },
    Numpad8: {
        keyCode: 38,
        shiftKeyCode: 104,
        key: 'ArrowUp',
        code: 'Numpad8',
        shiftKey: '8',
        location: 3,
    },
    ArrowUp: { keyCode: 38, code: 'ArrowUp', key: 'ArrowUp' },
    ArrowRight: { keyCode: 39, code: 'ArrowRight', key: 'ArrowRight' },
    Numpad6: {
        keyCode: 39,
        shiftKeyCode: 102,
        key: 'ArrowRight',
        code: 'Numpad6',
        shiftKey: '6',
        location: 3,
    },
    Numpad2: {
        keyCode: 40,
        shiftKeyCode: 98,
        key: 'ArrowDown',
        code: 'Numpad2',
        shiftKey: '2',
        location: 3,
    },
    ArrowDown: { keyCode: 40, code: 'ArrowDown', key: 'ArrowDown' },
    Select: { keyCode: 41, code: 'Select', key: 'Select' },
    Open: { keyCode: 43, code: 'Open', key: 'Execute' },
    PrintScreen: { keyCode: 44, code: 'PrintScreen', key: 'PrintScreen' },
    Insert: { keyCode: 45, code: 'Insert', key: 'Insert' },
    Numpad0: {
        keyCode: 45,
        shiftKeyCode: 96,
        key: 'Insert',
        code: 'Numpad0',
        shiftKey: '0',
        location: 3,
    },
    Delete: { keyCode: 46, code: 'Delete', key: 'Delete' },
    NumpadDecimal: {
        keyCode: 46,
        shiftKeyCode: 110,
        code: 'NumpadDecimal',
        key: '\u0000',
        shiftKey: '.',
        location: 3,
    },
    Digit0: { keyCode: 48, code: 'Digit0', shiftKey: ')', key: '0' },
    Digit1: { keyCode: 49, code: 'Digit1', shiftKey: '!', key: '1' },
    Digit2: { keyCode: 50, code: 'Digit2', shiftKey: '@', key: '2' },
    Digit3: { keyCode: 51, code: 'Digit3', shiftKey: '#', key: '3' },
    Digit4: { keyCode: 52, code: 'Digit4', shiftKey: '$', key: '4' },
    Digit5: { keyCode: 53, code: 'Digit5', shiftKey: '%', key: '5' },
    Digit6: { keyCode: 54, code: 'Digit6', shiftKey: '^', key: '6' },
    Digit7: { keyCode: 55, code: 'Digit7', shiftKey: '&', key: '7' },
    Digit8: { keyCode: 56, code: 'Digit8', shiftKey: '*', key: '8' },
    Digit9: { keyCode: 57, code: 'Digit9', shiftKey: '(', key: '9' },
    KeyA: { keyCode: 65, code: 'KeyA', shiftKey: 'A', key: 'a' },
    KeyB: { keyCode: 66, code: 'KeyB', shiftKey: 'B', key: 'b' },
    KeyC: { keyCode: 67, code: 'KeyC', shiftKey: 'C', key: 'c' },
    KeyD: { keyCode: 68, code: 'KeyD', shiftKey: 'D', key: 'd' },
    KeyE: { keyCode: 69, code: 'KeyE', shiftKey: 'E', key: 'e' },
    KeyF: { keyCode: 70, code: 'KeyF', shiftKey: 'F', key: 'f' },
    KeyG: { keyCode: 71, code: 'KeyG', shiftKey: 'G', key: 'g' },
    KeyH: { keyCode: 72, code: 'KeyH', shiftKey: 'H', key: 'h' },
    KeyI: { keyCode: 73, code: 'KeyI', shiftKey: 'I', key: 'i' },
    KeyJ: { keyCode: 74, code: 'KeyJ', shiftKey: 'J', key: 'j' },
    KeyK: { keyCode: 75, code: 'KeyK', shiftKey: 'K', key: 'k' },
    KeyL: { keyCode: 76, code: 'KeyL', shiftKey: 'L', key: 'l' },
    KeyM: { keyCode: 77, code: 'KeyM', shiftKey: 'M', key: 'm' },
    KeyN: { keyCode: 78, code: 'KeyN', shiftKey: 'N', key: 'n' },
    KeyO: { keyCode: 79, code: 'KeyO', shiftKey: 'O', key: 'o' },
    KeyP: { keyCode: 80, code: 'KeyP', shiftKey: 'P', key: 'p' },
    KeyQ: { keyCode: 81, code: 'KeyQ', shiftKey: 'Q', key: 'q' },
    KeyR: { keyCode: 82, code: 'KeyR', shiftKey: 'R', key: 'r' },
    KeyS: { keyCode: 83, code: 'KeyS', shiftKey: 'S', key: 's' },
    KeyT: { keyCode: 84, code: 'KeyT', shiftKey: 'T', key: 't' },
    KeyU: { keyCode: 85, code: 'KeyU', shiftKey: 'U', key: 'u' },
    KeyV: { keyCode: 86, code: 'KeyV', shiftKey: 'V', key: 'v' },
    KeyW: { keyCode: 87, code: 'KeyW', shiftKey: 'W', key: 'w' },
    KeyX: { keyCode: 88, code: 'KeyX', shiftKey: 'X', key: 'x' },
    KeyY: { keyCode: 89, code: 'KeyY', shiftKey: 'Y', key: 'y' },
    KeyZ: { keyCode: 90, code: 'KeyZ', shiftKey: 'Z', key: 'z' },
    MetaLeft: { keyCode: 91, code: 'MetaLeft', key: 'Meta', location: 1 },
    MetaRight: { keyCode: 92, code: 'MetaRight', key: 'Meta', location: 2 },
    ContextMenu: { keyCode: 93, code: 'ContextMenu', key: 'ContextMenu' },
    NumpadMultiply: {
        keyCode: 106,
        code: 'NumpadMultiply',
        key: '*',
        location: 3,
    },
    NumpadAdd: { keyCode: 107, code: 'NumpadAdd', key: '+', location: 3 },
    NumpadSubtract: {
        keyCode: 109,
        code: 'NumpadSubtract',
        key: '-',
        location: 3,
    },
    NumpadDivide: { keyCode: 111, code: 'NumpadDivide', key: '/', location: 3 },
    F1: { keyCode: 112, code: 'F1', key: 'F1' },
    F2: { keyCode: 113, code: 'F2', key: 'F2' },
    F3: { keyCode: 114, code: 'F3', key: 'F3' },
    F4: { keyCode: 115, code: 'F4', key: 'F4' },
    F5: { keyCode: 116, code: 'F5', key: 'F5' },
    F6: { keyCode: 117, code: 'F6', key: 'F6' },
    F7: { keyCode: 118, code: 'F7', key: 'F7' },
    F8: { keyCode: 119, code: 'F8', key: 'F8' },
    F9: { keyCode: 120, code: 'F9', key: 'F9' },
    F10: { keyCode: 121, code: 'F10', key: 'F10' },
    F11: { keyCode: 122, code: 'F11', key: 'F11' },
    F12: { keyCode: 123, code: 'F12', key: 'F12' },
    F13: { keyCode: 124, code: 'F13', key: 'F13' },
    F14: { keyCode: 125, code: 'F14', key: 'F14' },
    F15: { keyCode: 126, code: 'F15', key: 'F15' },
    F16: { keyCode: 127, code: 'F16', key: 'F16' },
    F17: { keyCode: 128, code: 'F17', key: 'F17' },
    F18: { keyCode: 129, code: 'F18', key: 'F18' },
    F19: { keyCode: 130, code: 'F19', key: 'F19' },
    F20: { keyCode: 131, code: 'F20', key: 'F20' },
    F21: { keyCode: 132, code: 'F21', key: 'F21' },
    F22: { keyCode: 133, code: 'F22', key: 'F22' },
    F23: { keyCode: 134, code: 'F23', key: 'F23' },
    F24: { keyCode: 135, code: 'F24', key: 'F24' },
    NumLock: { keyCode: 144, code: 'NumLock', key: 'NumLock' },
    ScrollLock: { keyCode: 145, code: 'ScrollLock', key: 'ScrollLock' },
    AudioVolumeMute: {
        keyCode: 173,
        code: 'AudioVolumeMute',
        key: 'AudioVolumeMute',
    },
    AudioVolumeDown: {
        keyCode: 174,
        code: 'AudioVolumeDown',
        key: 'AudioVolumeDown',
    },
    AudioVolumeUp: { keyCode: 175, code: 'AudioVolumeUp', key: 'AudioVolumeUp' },
    MediaTrackNext: {
        keyCode: 176,
        code: 'MediaTrackNext',
        key: 'MediaTrackNext',
    },
    MediaTrackPrevious: {
        keyCode: 177,
        code: 'MediaTrackPrevious',
        key: 'MediaTrackPrevious',
    },
    MediaStop: { keyCode: 178, code: 'MediaStop', key: 'MediaStop' },
    MediaPlayPause: {
        keyCode: 179,
        code: 'MediaPlayPause',
        key: 'MediaPlayPause',
    },
    Semicolon: { keyCode: 186, code: 'Semicolon', shiftKey: ':', key: ';' },
    Equal: { keyCode: 187, code: 'Equal', shiftKey: '+', key: '=' },
    NumpadEqual: { keyCode: 187, code: 'NumpadEqual', key: '=', location: 3 },
    Comma: { keyCode: 188, code: 'Comma', shiftKey: '<', key: ',' },
    Minus: { keyCode: 189, code: 'Minus', shiftKey: '_', key: '-' },
    Period: { keyCode: 190, code: 'Period', shiftKey: '>', key: '.' },
    Slash: { keyCode: 191, code: 'Slash', shiftKey: '?', key: '/' },
    Backquote: { keyCode: 192, code: 'Backquote', shiftKey: '~', key: '`' },
    BracketLeft: { keyCode: 219, code: 'BracketLeft', shiftKey: '{', key: '[' },
    Backslash: { keyCode: 220, code: 'Backslash', shiftKey: '|', key: '\\' },
    BracketRight: { keyCode: 221, code: 'BracketRight', shiftKey: '}', key: ']' },
    Quote: { keyCode: 222, code: 'Quote', shiftKey: '"', key: "'" },
    AltGraph: { keyCode: 225, code: 'AltGraph', key: 'AltGraph' },
    Props: { keyCode: 247, code: 'Props', key: 'CrSel' },
    Cancel: { keyCode: 3, key: 'Cancel', code: 'Abort' },
    Clear: { keyCode: 12, key: 'Clear', code: 'Numpad5', location: 3 },
    Shift: { keyCode: 16, key: 'Shift', code: 'ShiftLeft', location: 1 },
    Control: { keyCode: 17, key: 'Control', code: 'ControlLeft', location: 1 },
    Alt: { keyCode: 18, key: 'Alt', code: 'AltLeft', location: 1 },
    Accept: { keyCode: 30, key: 'Accept' },
    ModeChange: { keyCode: 31, key: 'ModeChange' },
    ' ': { keyCode: 32, key: ' ', code: 'Space' },
    Print: { keyCode: 42, key: 'Print' },
    Execute: { keyCode: 43, key: 'Execute', code: 'Open' },
    '\u0000': { keyCode: 46, key: '\u0000', code: 'NumpadDecimal', location: 3 },
    a: { keyCode: 65, key: 'a', code: 'KeyA' },
    b: { keyCode: 66, key: 'b', code: 'KeyB' },
    c: { keyCode: 67, key: 'c', code: 'KeyC' },
    d: { keyCode: 68, key: 'd', code: 'KeyD' },
    e: { keyCode: 69, key: 'e', code: 'KeyE' },
    f: { keyCode: 70, key: 'f', code: 'KeyF' },
    g: { keyCode: 71, key: 'g', code: 'KeyG' },
    h: { keyCode: 72, key: 'h', code: 'KeyH' },
    i: { keyCode: 73, key: 'i', code: 'KeyI' },
    j: { keyCode: 74, key: 'j', code: 'KeyJ' },
    k: { keyCode: 75, key: 'k', code: 'KeyK' },
    l: { keyCode: 76, key: 'l', code: 'KeyL' },
    m: { keyCode: 77, key: 'm', code: 'KeyM' },
    n: { keyCode: 78, key: 'n', code: 'KeyN' },
    o: { keyCode: 79, key: 'o', code: 'KeyO' },
    p: { keyCode: 80, key: 'p', code: 'KeyP' },
    q: { keyCode: 81, key: 'q', code: 'KeyQ' },
    r: { keyCode: 82, key: 'r', code: 'KeyR' },
    s: { keyCode: 83, key: 's', code: 'KeyS' },
    t: { keyCode: 84, key: 't', code: 'KeyT' },
    u: { keyCode: 85, key: 'u', code: 'KeyU' },
    v: { keyCode: 86, key: 'v', code: 'KeyV' },
    w: { keyCode: 87, key: 'w', code: 'KeyW' },
    x: { keyCode: 88, key: 'x', code: 'KeyX' },
    y: { keyCode: 89, key: 'y', code: 'KeyY' },
    z: { keyCode: 90, key: 'z', code: 'KeyZ' },
    Meta: { keyCode: 91, key: 'Meta', code: 'MetaLeft', location: 1 },
    '*': { keyCode: 106, key: '*', code: 'NumpadMultiply', location: 3 },
    '+': { keyCode: 107, key: '+', code: 'NumpadAdd', location: 3 },
    '-': { keyCode: 109, key: '-', code: 'NumpadSubtract', location: 3 },
    '/': { keyCode: 111, key: '/', code: 'NumpadDivide', location: 3 },
    ';': { keyCode: 186, key: ';', code: 'Semicolon' },
    '=': { keyCode: 187, key: '=', code: 'Equal' },
    ',': { keyCode: 188, key: ',', code: 'Comma' },
    '.': { keyCode: 190, key: '.', code: 'Period' },
    '`': { keyCode: 192, key: '`', code: 'Backquote' },
    '[': { keyCode: 219, key: '[', code: 'BracketLeft' },
    '\\': { keyCode: 220, key: '\\', code: 'Backslash' },
    ']': { keyCode: 221, key: ']', code: 'BracketRight' },
    "'": { keyCode: 222, key: "'", code: 'Quote' },
    Attn: { keyCode: 246, key: 'Attn' },
    CrSel: { keyCode: 247, key: 'CrSel', code: 'Props' },
    ExSel: { keyCode: 248, key: 'ExSel' },
    EraseEof: { keyCode: 249, key: 'EraseEof' },
    Play: { keyCode: 250, key: 'Play' },
    ZoomOut: { keyCode: 251, key: 'ZoomOut' },
    ')': { keyCode: 48, key: ')', code: 'Digit0' },
    '!': { keyCode: 49, key: '!', code: 'Digit1' },
    '@': { keyCode: 50, key: '@', code: 'Digit2' },
    '#': { keyCode: 51, key: '#', code: 'Digit3' },
    $: { keyCode: 52, key: '$', code: 'Digit4' },
    '%': { keyCode: 53, key: '%', code: 'Digit5' },
    '^': { keyCode: 54, key: '^', code: 'Digit6' },
    '&': { keyCode: 55, key: '&', code: 'Digit7' },
    '(': { keyCode: 57, key: '(', code: 'Digit9' },
    A: { keyCode: 65, key: 'A', code: 'KeyA' },
    B: { keyCode: 66, key: 'B', code: 'KeyB' },
    C: { keyCode: 67, key: 'C', code: 'KeyC' },
    D: { keyCode: 68, key: 'D', code: 'KeyD' },
    E: { keyCode: 69, key: 'E', code: 'KeyE' },
    F: { keyCode: 70, key: 'F', code: 'KeyF' },
    G: { keyCode: 71, key: 'G', code: 'KeyG' },
    H: { keyCode: 72, key: 'H', code: 'KeyH' },
    I: { keyCode: 73, key: 'I', code: 'KeyI' },
    J: { keyCode: 74, key: 'J', code: 'KeyJ' },
    K: { keyCode: 75, key: 'K', code: 'KeyK' },
    L: { keyCode: 76, key: 'L', code: 'KeyL' },
    M: { keyCode: 77, key: 'M', code: 'KeyM' },
    N: { keyCode: 78, key: 'N', code: 'KeyN' },
    O: { keyCode: 79, key: 'O', code: 'KeyO' },
    P: { keyCode: 80, key: 'P', code: 'KeyP' },
    Q: { keyCode: 81, key: 'Q', code: 'KeyQ' },
    R: { keyCode: 82, key: 'R', code: 'KeyR' },
    S: { keyCode: 83, key: 'S', code: 'KeyS' },
    T: { keyCode: 84, key: 'T', code: 'KeyT' },
    U: { keyCode: 85, key: 'U', code: 'KeyU' },
    V: { keyCode: 86, key: 'V', code: 'KeyV' },
    W: { keyCode: 87, key: 'W', code: 'KeyW' },
    X: { keyCode: 88, key: 'X', code: 'KeyX' },
    Y: { keyCode: 89, key: 'Y', code: 'KeyY' },
    Z: { keyCode: 90, key: 'Z', code: 'KeyZ' },
    ':': { keyCode: 186, key: ':', code: 'Semicolon' },
    '<': { keyCode: 188, key: '<', code: 'Comma' },
    _: { keyCode: 189, key: '_', code: 'Minus' },
    '>': { keyCode: 190, key: '>', code: 'Period' },
    '?': { keyCode: 191, key: '?', code: 'Slash' },
    '~': { keyCode: 192, key: '~', code: 'Backquote' },
    '{': { keyCode: 219, key: '{', code: 'BracketLeft' },
    '|': { keyCode: 220, key: '|', code: 'Backslash' },
    '}': { keyCode: 221, key: '}', code: 'BracketRight' },
    '"': { keyCode: 222, key: '"', code: 'Quote' },
    SoftLeft: { key: 'SoftLeft', code: 'SoftLeft', location: 4 },
    SoftRight: { key: 'SoftRight', code: 'SoftRight', location: 4 },
    Camera: { keyCode: 44, key: 'Camera', code: 'Camera', location: 4 },
    Call: { key: 'Call', code: 'Call', location: 4 },
    EndCall: { keyCode: 95, key: 'EndCall', code: 'EndCall', location: 4 },
    VolumeDown: {
        keyCode: 182,
        key: 'VolumeDown',
        code: 'VolumeDown',
        location: 4,
    },
    VolumeUp: { keyCode: 183, key: 'VolumeUp', code: 'VolumeUp', location: 4 },
};

},{}],49:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebWorker = void 0;
/**
 * Copyright 2018 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const EventEmitter_js_1 = require("./EventEmitter.js");
const helper_js_1 = require("./helper.js");
const ExecutionContext_js_1 = require("./ExecutionContext.js");
const JSHandle_js_1 = require("./JSHandle.js");
/**
 * The WebWorker class represents a
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API | WebWorker}.
 *
 * @remarks
 * The events `workercreated` and `workerdestroyed` are emitted on the page
 * object to signal the worker lifecycle.
 *
 * @example
 * ```js
 * page.on('workercreated', worker => console.log('Worker created: ' + worker.url()));
 * page.on('workerdestroyed', worker => console.log('Worker destroyed: ' + worker.url()));
 *
 * console.log('Current workers:');
 * for (const worker of page.workers()) {
 *   console.log('  ' + worker.url());
 * }
 * ```
 *
 * @public
 */
class WebWorker extends EventEmitter_js_1.EventEmitter {
    /**
     *
     * @internal
     */
    constructor(client, url, consoleAPICalled, exceptionThrown) {
        super();
        this._client = client;
        this._url = url;
        this._executionContextPromise = new Promise((x) => (this._executionContextCallback = x));
        let jsHandleFactory;
        this._client.once('Runtime.executionContextCreated', async (event) => {
            // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
            jsHandleFactory = (remoteObject) => new JSHandle_js_1.JSHandle(executionContext, client, remoteObject);
            const executionContext = new ExecutionContext_js_1.ExecutionContext(client, event.context, null);
            this._executionContextCallback(executionContext);
        });
        // This might fail if the target is closed before we receive all execution contexts.
        this._client.send('Runtime.enable').catch(helper_js_1.debugError);
        this._client.on('Runtime.consoleAPICalled', (event) => consoleAPICalled(event.type, event.args.map(jsHandleFactory), event.stackTrace));
        this._client.on('Runtime.exceptionThrown', (exception) => exceptionThrown(exception.exceptionDetails));
    }
    /**
     * @returns The URL of this web worker.
     */
    url() {
        return this._url;
    }
    /**
     * Returns the ExecutionContext the WebWorker runs in
     * @returns The ExecutionContext the web worker runs in.
     */
    async executionContext() {
        return this._executionContextPromise;
    }
    /**
     * If the function passed to the `worker.evaluate` returns a Promise, then
     * `worker.evaluate` would wait for the promise to resolve and return its
     * value. If the function passed to the `worker.evaluate` returns a
     * non-serializable value, then `worker.evaluate` resolves to `undefined`.
     * DevTools Protocol also supports transferring some additional values that
     * are not serializable by `JSON`: `-0`, `NaN`, `Infinity`, `-Infinity`, and
     * bigint literals.
     * Shortcut for `await worker.executionContext()).evaluate(pageFunction, ...args)`.
     *
     * @param pageFunction - Function to be evaluated in the worker context.
     * @param args - Arguments to pass to `pageFunction`.
     * @returns Promise which resolves to the return value of `pageFunction`.
     */
    async evaluate(pageFunction, ...args) {
        return (await this._executionContextPromise).evaluate(pageFunction, ...args);
    }
    /**
     * The only difference between `worker.evaluate` and `worker.evaluateHandle`
     * is that `worker.evaluateHandle` returns in-page object (JSHandle). If the
     * function passed to the `worker.evaluateHandle` returns a `Promise`, then
     * `worker.evaluateHandle` would wait for the promise to resolve and return
     * its value. Shortcut for
     * `await worker.executionContext()).evaluateHandle(pageFunction, ...args)`
     *
     * @param pageFunction - Function to be evaluated in the page context.
     * @param args - Arguments to pass to `pageFunction`.
     * @returns Promise which resolves to the return value of `pageFunction`.
     */
    async evaluateHandle(pageFunction, ...args) {
        return (await this._executionContextPromise).evaluateHandle(pageFunction, ...args);
    }
}
exports.WebWorker = WebWorker;

},{"./EventEmitter.js":28,"./ExecutionContext.js":29,"./JSHandle.js":35,"./helper.js":52}],50:[function(require,module,exports){
"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertNever = exports.assert = void 0;
/**
 * Asserts that the given value is truthy.
 * @param value
 * @param message - the error message to throw if the value is not truthy.
 */
const assert = (value, message) => {
    if (!value)
        throw new Error(message);
};
exports.assert = assert;
const assertNever = (value, message) => {
    if (value)
        throw new Error(message);
};
exports.assertNever = assertNever;

},{}],51:[function(require,module,exports){
"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFetch = void 0;
const environment_js_1 = require("../environment.js");
/* Use the global version if we're in the browser, else load the node-fetch module. */
const getFetch = async () => {
    return environment_js_1.isNode ? await Promise.resolve().then(() => __importStar(require('node-fetch'))) : globalThis.fetch;
};
exports.getFetch = getFetch;

},{"../environment.js":53,"node-fetch":11}],52:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.helper = exports.debugError = void 0;
const Errors_js_1 = require("./Errors.js");
const Debug_js_1 = require("./Debug.js");
const assert_js_1 = require("./assert.js");
const environment_js_1 = require("../environment.js");
exports.debugError = (0, Debug_js_1.debug)('puppeteer:error');
function getExceptionMessage(exceptionDetails) {
    if (exceptionDetails.exception)
        return (exceptionDetails.exception.description || exceptionDetails.exception.value);
    let message = exceptionDetails.text;
    if (exceptionDetails.stackTrace) {
        for (const callframe of exceptionDetails.stackTrace.callFrames) {
            const location = callframe.url +
                ':' +
                callframe.lineNumber +
                ':' +
                callframe.columnNumber;
            const functionName = callframe.functionName || '<anonymous>';
            message += `\n    at ${functionName} (${location})`;
        }
    }
    return message;
}
function valueFromRemoteObject(remoteObject) {
    (0, assert_js_1.assert)(!remoteObject.objectId, 'Cannot extract value when objectId is given');
    if (remoteObject.unserializableValue) {
        if (remoteObject.type === 'bigint' && typeof BigInt !== 'undefined')
            return BigInt(remoteObject.unserializableValue.replace('n', ''));
        switch (remoteObject.unserializableValue) {
            case '-0':
                return -0;
            case 'NaN':
                return NaN;
            case 'Infinity':
                return Infinity;
            case '-Infinity':
                return -Infinity;
            default:
                throw new Error('Unsupported unserializable value: ' +
                    remoteObject.unserializableValue);
        }
    }
    return remoteObject.value;
}
async function releaseObject(client, remoteObject) {
    if (!remoteObject.objectId)
        return;
    await client
        .send('Runtime.releaseObject', { objectId: remoteObject.objectId })
        .catch((error) => {
        // Exceptions might happen in case of a page been navigated or closed.
        // Swallow these since they are harmless and we don't leak anything in this case.
        (0, exports.debugError)(error);
    });
}
function addEventListener(emitter, eventName, handler) {
    emitter.on(eventName, handler);
    return { emitter, eventName, handler };
}
function removeEventListeners(listeners) {
    for (const listener of listeners)
        listener.emitter.removeListener(listener.eventName, listener.handler);
    listeners.length = 0;
}
function isString(obj) {
    return typeof obj === 'string' || obj instanceof String;
}
function isNumber(obj) {
    return typeof obj === 'number' || obj instanceof Number;
}
async function waitForEvent(emitter, eventName, predicate, timeout, abortPromise) {
    let eventTimeout, resolveCallback, rejectCallback;
    const promise = new Promise((resolve, reject) => {
        resolveCallback = resolve;
        rejectCallback = reject;
    });
    const listener = addEventListener(emitter, eventName, async (event) => {
        if (!(await predicate(event)))
            return;
        resolveCallback(event);
    });
    if (timeout) {
        eventTimeout = setTimeout(() => {
            rejectCallback(new Errors_js_1.TimeoutError('Timeout exceeded while waiting for event'));
        }, timeout);
    }
    function cleanup() {
        removeEventListeners([listener]);
        clearTimeout(eventTimeout);
    }
    const result = await Promise.race([promise, abortPromise]).then((r) => {
        cleanup();
        return r;
    }, (error) => {
        cleanup();
        throw error;
    });
    if (result instanceof Error)
        throw result;
    return result;
}
function evaluationString(fun, ...args) {
    if (isString(fun)) {
        (0, assert_js_1.assert)(args.length === 0, 'Cannot evaluate a string with arguments');
        return fun;
    }
    function serializeArgument(arg) {
        if (Object.is(arg, undefined))
            return 'undefined';
        return JSON.stringify(arg);
    }
    return `(${fun})(${args.map(serializeArgument).join(',')})`;
}
function pageBindingInitString(type, name) {
    function addPageBinding(type, bindingName) {
        /* Cast window to any here as we're about to add properties to it
         * via win[bindingName] which TypeScript doesn't like.
         */
        const win = window;
        const binding = win[bindingName];
        win[bindingName] = (...args) => {
            const me = window[bindingName];
            let callbacks = me.callbacks;
            if (!callbacks) {
                callbacks = new Map();
                me.callbacks = callbacks;
            }
            const seq = (me.lastSeq || 0) + 1;
            me.lastSeq = seq;
            const promise = new Promise((resolve, reject) => callbacks.set(seq, { resolve, reject }));
            binding(JSON.stringify({ type, name: bindingName, seq, args }));
            return promise;
        };
    }
    return evaluationString(addPageBinding, type, name);
}
function pageBindingDeliverResultString(name, seq, result) {
    function deliverResult(name, seq, result) {
        window[name].callbacks.get(seq).resolve(result);
        window[name].callbacks.delete(seq);
    }
    return evaluationString(deliverResult, name, seq, result);
}
function pageBindingDeliverErrorString(name, seq, message, stack) {
    function deliverError(name, seq, message, stack) {
        const error = new Error(message);
        error.stack = stack;
        window[name].callbacks.get(seq).reject(error);
        window[name].callbacks.delete(seq);
    }
    return evaluationString(deliverError, name, seq, message, stack);
}
function pageBindingDeliverErrorValueString(name, seq, value) {
    function deliverErrorValue(name, seq, value) {
        window[name].callbacks.get(seq).reject(value);
        window[name].callbacks.delete(seq);
    }
    return evaluationString(deliverErrorValue, name, seq, value);
}
function makePredicateString(predicate, predicateQueryHandler) {
    function checkWaitForOptions(node, waitForVisible, waitForHidden) {
        if (!node)
            return waitForHidden;
        if (!waitForVisible && !waitForHidden)
            return node;
        const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        const style = window.getComputedStyle(element);
        const isVisible = style && style.visibility !== 'hidden' && hasVisibleBoundingBox();
        const success = waitForVisible === isVisible || waitForHidden === !isVisible;
        return success ? node : null;
        function hasVisibleBoundingBox() {
            const rect = element.getBoundingClientRect();
            return !!(rect.top || rect.bottom || rect.width || rect.height);
        }
    }
    const predicateQueryHandlerDef = predicateQueryHandler
        ? `const predicateQueryHandler = ${predicateQueryHandler};`
        : '';
    return `
    (() => {
      ${predicateQueryHandlerDef}
      const checkWaitForOptions = ${checkWaitForOptions};
      return (${predicate})(...args)
    })() `;
}
async function waitWithTimeout(promise, taskName, timeout) {
    let reject;
    const timeoutError = new Errors_js_1.TimeoutError(`waiting for ${taskName} failed: timeout ${timeout}ms exceeded`);
    const timeoutPromise = new Promise((resolve, x) => (reject = x));
    let timeoutTimer = null;
    if (timeout)
        timeoutTimer = setTimeout(() => reject(timeoutError), timeout);
    try {
        return await Promise.race([promise, timeoutPromise]);
    }
    finally {
        if (timeoutTimer)
            clearTimeout(timeoutTimer);
    }
}
async function getReadableAsBuffer(readable, path) {
    if (!environment_js_1.isNode && path) {
        throw new Error('Cannot write to a path outside of Node.js environment.');
    }
    const fs = environment_js_1.isNode ? await importFSModule() : null;
    let fileHandle;
    if (path && fs) {
        fileHandle = await fs.promises.open(path, 'w');
    }
    const buffers = [];
    for await (const chunk of readable) {
        buffers.push(chunk);
        if (fileHandle) {
            await fs.promises.writeFile(fileHandle, chunk);
        }
    }
    if (path)
        await fileHandle.close();
    let resultBuffer = null;
    try {
        resultBuffer = Buffer.concat(buffers);
    }
    finally {
        return resultBuffer;
    }
}
async function getReadableFromProtocolStream(client, handle) {
    // TODO:
    // This restriction can be lifted once https://github.com/nodejs/node/pull/39062 has landed
    if (!environment_js_1.isNode) {
        throw new Error('Cannot create a stream outside of Node.js environment.');
    }
    const { Readable } = await Promise.resolve().then(() => __importStar(require('stream')));
    let eof = false;
    return new Readable({
        async read(size) {
            if (eof) {
                return null;
            }
            const response = await client.send('IO.read', { handle, size });
            this.push(response.data, response.base64Encoded ? 'base64' : undefined);
            if (response.eof) {
                eof = true;
                await client.send('IO.close', { handle });
                this.push(null);
            }
        },
    });
}
/**
 * Loads the Node fs promises API. Needed because on Node 10.17 and below,
 * fs.promises is experimental, and therefore not marked as enumerable. That
 * means when TypeScript compiles an `import('fs')`, its helper doesn't spot the
 * promises declaration and therefore on Node <10.17 you get an error as
 * fs.promises is undefined in compiled TypeScript land.
 *
 * See https://github.com/puppeteer/puppeteer/issues/6548 for more details.
 *
 * Once Node 10 is no longer supported (April 2021) we can remove this and use
 * `(await import('fs')).promises`.
 */
async function importFSModule() {
    if (!environment_js_1.isNode) {
        throw new Error('Cannot load the fs module API outside of Node.');
    }
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    if (fs.promises) {
        return fs;
    }
    return fs.default;
}
exports.helper = {
    evaluationString,
    pageBindingInitString,
    pageBindingDeliverResultString,
    pageBindingDeliverErrorString,
    pageBindingDeliverErrorValueString,
    makePredicateString,
    getReadableAsBuffer,
    getReadableFromProtocolStream,
    waitWithTimeout,
    waitForEvent,
    isString,
    isNumber,
    importFSModule,
    addEventListener,
    removeEventListeners,
    valueFromRemoteObject,
    getExceptionMessage,
    releaseObject,
};

}).call(this)}).call(this,require("buffer").Buffer)
},{"../environment.js":53,"./Debug.js":23,"./Errors.js":27,"./assert.js":50,"buffer":6,"fs":5,"stream":76}],53:[function(require,module,exports){
(function (process){(function (){
"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNode = void 0;
exports.isNode = !!(typeof process !== 'undefined' && process.version);

}).call(this)}).call(this,require('_process'))
},{"_process":13}],54:[function(require,module,exports){
"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializePuppeteerWeb = void 0;
const Puppeteer_js_1 = require("./common/Puppeteer.js");
const initializePuppeteerWeb = (packageName) => {
    const isPuppeteerCore = packageName === 'puppeteer-core';
    return new Puppeteer_js_1.Puppeteer({
        isPuppeteerCore,
    });
};
exports.initializePuppeteerWeb = initializePuppeteerWeb;

},{"./common/Puppeteer.js":41}],55:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeWebSocketTransport = void 0;
const ws_1 = __importDefault(require("ws"));
class NodeWebSocketTransport {
    constructor(ws) {
        this._ws = ws;
        this._ws.addEventListener('message', (event) => {
            if (this.onmessage)
                this.onmessage.call(null, event.data);
        });
        this._ws.addEventListener('close', () => {
            if (this.onclose)
                this.onclose.call(null);
        });
        // Silently ignore all errors - we don't know what to do with them.
        this._ws.addEventListener('error', () => { });
        this.onmessage = null;
        this.onclose = null;
    }
    static create(url) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkg = require('../../../../package.json');
        return new Promise((resolve, reject) => {
            const ws = new ws_1.default(url, [], {
                followRedirects: true,
                perMessageDeflate: false,
                maxPayload: 256 * 1024 * 1024,
                headers: {
                    'User-Agent': `Puppeteer ${pkg.version}`,
                },
            });
            ws.addEventListener('open', () => resolve(new NodeWebSocketTransport(ws)));
            ws.addEventListener('error', reject);
        });
    }
    send(message) {
        this._ws.send(message);
    }
    close() {
        this._ws.close();
    }
}
exports.NodeWebSocketTransport = NodeWebSocketTransport;

},{"../../../../package.json":60,"ws":79}],56:[function(require,module,exports){
"use strict";
/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const initialize_web_js_1 = require("./initialize-web.js");
const environment_js_1 = require("./environment.js");
if (environment_js_1.isNode) {
    throw new Error('Trying to run Puppeteer-Web in a Node environment');
}
exports.default = (0, initialize_web_js_1.initializePuppeteerWeb)('puppeteer');

},{"./environment.js":53,"./initialize-web.js":54}],57:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Mitt: Tiny (~200b) functional event emitter / pubsub.
 * @name mitt
 * @returns {Mitt}
 */
function mitt(all) {
    all = all || new Map();
    return {
        /**
         * A Map of event names to registered handler functions.
         */
        all,
        /**
         * Register an event handler for the given type.
         * @param {string|symbol} type Type of event to listen for, or `"*"` for all events
         * @param {Function} handler Function to call in response to given event
         * @memberOf mitt
         */
        on(type, handler) {
            const handlers = all.get(type);
            const added = handlers && handlers.push(handler);
            if (!added) {
                all.set(type, [handler]);
            }
        },
        /**
         * Remove an event handler for the given type.
         * @param {string|symbol} type Type of event to unregister `handler` from, or `"*"`
         * @param {Function} handler Handler function to remove
         * @memberOf mitt
         */
        off(type, handler) {
            const handlers = all.get(type);
            if (handlers) {
                handlers.splice(handlers.indexOf(handler) >>> 0, 1);
            }
        },
        /**
         * Invoke all handlers for the given type.
         * If present, `"*"` handlers are invoked after type-matched handlers.
         *
         * Note: Manually firing "*" handlers is not supported.
         *
         * @param {string|symbol} type The event type to invoke
         * @param {Any} [evt] Any value (object is recommended and powerful), passed to each handler
         * @memberOf mitt
         */
        emit(type, evt) {
            (all.get(type) || []).slice().map((handler) => { handler(evt); });
            (all.get('*') || []).slice().map((handler) => { handler(type, evt); });
        }
    };
}
exports.default = mitt;

},{}],58:[function(require,module,exports){
(function (process){(function (){
/* eslint-env browser */

/**
 * This is the web browser implementation of `debug()`.
 */

exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = localstorage();
exports.destroy = (() => {
	let warned = false;

	return () => {
		if (!warned) {
			warned = true;
			console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
		}
	};
})();

/**
 * Colors.
 */

exports.colors = [
	'#0000CC',
	'#0000FF',
	'#0033CC',
	'#0033FF',
	'#0066CC',
	'#0066FF',
	'#0099CC',
	'#0099FF',
	'#00CC00',
	'#00CC33',
	'#00CC66',
	'#00CC99',
	'#00CCCC',
	'#00CCFF',
	'#3300CC',
	'#3300FF',
	'#3333CC',
	'#3333FF',
	'#3366CC',
	'#3366FF',
	'#3399CC',
	'#3399FF',
	'#33CC00',
	'#33CC33',
	'#33CC66',
	'#33CC99',
	'#33CCCC',
	'#33CCFF',
	'#6600CC',
	'#6600FF',
	'#6633CC',
	'#6633FF',
	'#66CC00',
	'#66CC33',
	'#9900CC',
	'#9900FF',
	'#9933CC',
	'#9933FF',
	'#99CC00',
	'#99CC33',
	'#CC0000',
	'#CC0033',
	'#CC0066',
	'#CC0099',
	'#CC00CC',
	'#CC00FF',
	'#CC3300',
	'#CC3333',
	'#CC3366',
	'#CC3399',
	'#CC33CC',
	'#CC33FF',
	'#CC6600',
	'#CC6633',
	'#CC9900',
	'#CC9933',
	'#CCCC00',
	'#CCCC33',
	'#FF0000',
	'#FF0033',
	'#FF0066',
	'#FF0099',
	'#FF00CC',
	'#FF00FF',
	'#FF3300',
	'#FF3333',
	'#FF3366',
	'#FF3399',
	'#FF33CC',
	'#FF33FF',
	'#FF6600',
	'#FF6633',
	'#FF9900',
	'#FF9933',
	'#FFCC00',
	'#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

// eslint-disable-next-line complexity
function useColors() {
	// NB: In an Electron preload script, document will be defined but not fully
	// initialized. Since we know we're in Chrome, we'll just detect this case
	// explicitly
	if (typeof window !== 'undefined' && window.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
		return true;
	}

	// Internet Explorer and Edge do not support colors.
	if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
		return false;
	}

	// Is webkit? http://stackoverflow.com/a/16459606/376773
	// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
	return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
		// Is firebug? http://stackoverflow.com/a/398120/376773
		(typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
		// Is firefox >= v31?
		// https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
		// Double check webkit in userAgent just in case we are in a worker
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
	args[0] = (this.useColors ? '%c' : '') +
		this.namespace +
		(this.useColors ? ' %c' : ' ') +
		args[0] +
		(this.useColors ? '%c ' : ' ') +
		'+' + module.exports.humanize(this.diff);

	if (!this.useColors) {
		return;
	}

	const c = 'color: ' + this.color;
	args.splice(1, 0, c, 'color: inherit');

	// The final "%c" is somewhat tricky, because there could be other
	// arguments passed either before or after the %c, so we need to
	// figure out the correct index to insert the CSS into
	let index = 0;
	let lastC = 0;
	args[0].replace(/%[a-zA-Z%]/g, match => {
		if (match === '%%') {
			return;
		}
		index++;
		if (match === '%c') {
			// We only are interested in the *last* %c
			// (the user may have provided their own)
			lastC = index;
		}
	});

	args.splice(lastC, 0, c);
}

/**
 * Invokes `console.debug()` when available.
 * No-op when `console.debug` is not a "function".
 * If `console.debug` is not available, falls back
 * to `console.log`.
 *
 * @api public
 */
exports.log = console.debug || console.log || (() => {});

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */
function save(namespaces) {
	try {
		if (namespaces) {
			exports.storage.setItem('debug', namespaces);
		} else {
			exports.storage.removeItem('debug');
		}
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */
function load() {
	let r;
	try {
		r = exports.storage.getItem('debug');
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}

	// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
	if (!r && typeof process !== 'undefined' && 'env' in process) {
		r = process.env.DEBUG;
	}

	return r;
}

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
	try {
		// TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
		// The Browser also has localStorage in the global context.
		return localStorage;
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

module.exports = require('./common')(exports);

const {formatters} = module.exports;

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

formatters.j = function (v) {
	try {
		return JSON.stringify(v);
	} catch (error) {
		return '[UnexpectedJSONParseError]: ' + error.message;
	}
};

}).call(this)}).call(this,require('_process'))
},{"./common":59,"_process":13}],59:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 */

function setup(env) {
	createDebug.debug = createDebug;
	createDebug.default = createDebug;
	createDebug.coerce = coerce;
	createDebug.disable = disable;
	createDebug.enable = enable;
	createDebug.enabled = enabled;
	createDebug.humanize = require('ms');
	createDebug.destroy = destroy;

	Object.keys(env).forEach(key => {
		createDebug[key] = env[key];
	});

	/**
	* The currently active debug mode names, and names to skip.
	*/

	createDebug.names = [];
	createDebug.skips = [];

	/**
	* Map of special "%n" handling functions, for the debug "format" argument.
	*
	* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
	*/
	createDebug.formatters = {};

	/**
	* Selects a color for a debug namespace
	* @param {String} namespace The namespace string for the for the debug instance to be colored
	* @return {Number|String} An ANSI color code for the given namespace
	* @api private
	*/
	function selectColor(namespace) {
		let hash = 0;

		for (let i = 0; i < namespace.length; i++) {
			hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
			hash |= 0; // Convert to 32bit integer
		}

		return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
	}
	createDebug.selectColor = selectColor;

	/**
	* Create a debugger with the given `namespace`.
	*
	* @param {String} namespace
	* @return {Function}
	* @api public
	*/
	function createDebug(namespace) {
		let prevTime;
		let enableOverride = null;
		let namespacesCache;
		let enabledCache;

		function debug(...args) {
			// Disabled?
			if (!debug.enabled) {
				return;
			}

			const self = debug;

			// Set `diff` timestamp
			const curr = Number(new Date());
			const ms = curr - (prevTime || curr);
			self.diff = ms;
			self.prev = prevTime;
			self.curr = curr;
			prevTime = curr;

			args[0] = createDebug.coerce(args[0]);

			if (typeof args[0] !== 'string') {
				// Anything else let's inspect with %O
				args.unshift('%O');
			}

			// Apply any `formatters` transformations
			let index = 0;
			args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
				// If we encounter an escaped % then don't increase the array index
				if (match === '%%') {
					return '%';
				}
				index++;
				const formatter = createDebug.formatters[format];
				if (typeof formatter === 'function') {
					const val = args[index];
					match = formatter.call(self, val);

					// Now we need to remove `args[index]` since it's inlined in the `format`
					args.splice(index, 1);
					index--;
				}
				return match;
			});

			// Apply env-specific formatting (colors, etc.)
			createDebug.formatArgs.call(self, args);

			const logFn = self.log || createDebug.log;
			logFn.apply(self, args);
		}

		debug.namespace = namespace;
		debug.useColors = createDebug.useColors();
		debug.color = createDebug.selectColor(namespace);
		debug.extend = extend;
		debug.destroy = createDebug.destroy; // XXX Temporary. Will be removed in the next major release.

		Object.defineProperty(debug, 'enabled', {
			enumerable: true,
			configurable: false,
			get: () => {
				if (enableOverride !== null) {
					return enableOverride;
				}
				if (namespacesCache !== createDebug.namespaces) {
					namespacesCache = createDebug.namespaces;
					enabledCache = createDebug.enabled(namespace);
				}

				return enabledCache;
			},
			set: v => {
				enableOverride = v;
			}
		});

		// Env-specific initialization logic for debug instances
		if (typeof createDebug.init === 'function') {
			createDebug.init(debug);
		}

		return debug;
	}

	function extend(namespace, delimiter) {
		const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
		newDebug.log = this.log;
		return newDebug;
	}

	/**
	* Enables a debug mode by namespaces. This can include modes
	* separated by a colon and wildcards.
	*
	* @param {String} namespaces
	* @api public
	*/
	function enable(namespaces) {
		createDebug.save(namespaces);
		createDebug.namespaces = namespaces;

		createDebug.names = [];
		createDebug.skips = [];

		let i;
		const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
		const len = split.length;

		for (i = 0; i < len; i++) {
			if (!split[i]) {
				// ignore empty strings
				continue;
			}

			namespaces = split[i].replace(/\*/g, '.*?');

			if (namespaces[0] === '-') {
				createDebug.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
			} else {
				createDebug.names.push(new RegExp('^' + namespaces + '$'));
			}
		}
	}

	/**
	* Disable debug output.
	*
	* @return {String} namespaces
	* @api public
	*/
	function disable() {
		const namespaces = [
			...createDebug.names.map(toNamespace),
			...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
		].join(',');
		createDebug.enable('');
		return namespaces;
	}

	/**
	* Returns true if the given mode name is enabled, false otherwise.
	*
	* @param {String} name
	* @return {Boolean}
	* @api public
	*/
	function enabled(name) {
		if (name[name.length - 1] === '*') {
			return true;
		}

		let i;
		let len;

		for (i = 0, len = createDebug.skips.length; i < len; i++) {
			if (createDebug.skips[i].test(name)) {
				return false;
			}
		}

		for (i = 0, len = createDebug.names.length; i < len; i++) {
			if (createDebug.names[i].test(name)) {
				return true;
			}
		}

		return false;
	}

	/**
	* Convert regexp to namespace
	*
	* @param {RegExp} regxep
	* @return {String} namespace
	* @api private
	*/
	function toNamespace(regexp) {
		return regexp.toString()
			.substring(2, regexp.toString().length - 2)
			.replace(/\.\*\?$/, '*');
	}

	/**
	* Coerce `val`.
	*
	* @param {Mixed} val
	* @return {Mixed}
	* @api private
	*/
	function coerce(val) {
		if (val instanceof Error) {
			return val.stack || val.message;
		}
		return val;
	}

	/**
	* XXX DO NOT USE. This is a temporary stub function.
	* XXX It WILL be removed in the next major release.
	*/
	function destroy() {
		console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
	}

	createDebug.enable(createDebug.load());

	return createDebug;
}

module.exports = setup;

},{"ms":10}],60:[function(require,module,exports){
module.exports={
  "name": "puppeteer-core",
  "version": "12.0.1",
  "description": "A high-level API to control headless Chrome over the DevTools Protocol",
  "main": "./cjs-entry-core.js",
  "types": "lib/types.d.ts",
  "repository": "github:puppeteer/puppeteer",
  "engines": {
    "node": ">=10.18.1"
  },
  "scripts": {
    "test-browser": "wtr",
    "test-browser-watch": "wtr --watch",
    "unit": "npm run tsc-cjs && mocha --config mocha-config/puppeteer-unit-tests.js",
    "unit-debug": "npm run tsc-cjs && mocha --inspect-brk --config mocha-config/puppeteer-unit-tests.js",
    "unit-with-coverage": "cross-env COVERAGE=1 npm run unit",
    "assert-unit-coverage": "cross-env COVERAGE=1 mocha --config mocha-config/coverage-tests.js",
    "funit": "cross-env PUPPETEER_PRODUCT=firefox npm run unit",
    "test": "npm run tsc && npm run lint --silent && npm run unit-with-coverage && npm run test-browser",
    "prepare": "node typescript-if-required.js && husky install",
    "prepublishOnly": "npm run build",
    "dev-install": "npm run tsc && node install.js",
    "eslint": "([ \"$CI\" = true ] && eslint --ext js --ext ts --quiet -f codeframe . || eslint --ext js --ext ts .)",
    "eslint-fix": "eslint --ext js --ext ts --fix .",
    "commitlint": "commitlint --from=HEAD~1",
    "markdownlint": "prettier --check **/README.md docs/troubleshooting.md",
    "markdownlint-fix": "prettier --write **/README.md docs/troubleshooting.md",
    "lint": "npm run eslint && npm run build && npm run doc && npm run commitlint && npm run markdownlint",
    "doc": "node utils/doclint/cli.js",
    "clean-lib": "rimraf lib",
    "build": "npm run tsc && npm run generate-d-ts",
    "tsc": "npm run clean-lib && tsc --version && npm run tsc-cjs && npm run tsc-esm",
    "tsc-cjs": "tsc -b src/tsconfig.cjs.json",
    "tsc-esm": "tsc -b src/tsconfig.esm.json",
    "apply-next-version": "node utils/apply_next_version.js",
    "test-install": "scripts/test-install.sh",
    "clean-docs": "rimraf website/docs && rimraf docs-api-json",
    "generate-d-ts": "npm run clean-docs && api-extractor run --local --verbose && node inject-global-type-stubs.js",
    "generate-docs": "npm run generate-d-ts && api-documenter markdown -i docs-api-json -o website/docs && node utils/remove-tag.js",
    "ensure-correct-devtools-protocol-revision": "ts-node -s scripts/ensure-correct-devtools-protocol-package",
    "ensure-pinned-deps": "ts-node -s scripts/ensure-pinned-deps",
    "test-types-file": "ts-node -s scripts/test-ts-definition-files.ts",
    "release": "node utils/remove_version_suffix.js && standard-version --commit-all",
    "build-docs-production": "cd website && npm install && npm run build"
  },
  "files": [
    "lib/types.d.ts",
    "lib/**/*.d.ts",
    "lib/**/*.d.ts.map",
    "lib/**/*.js",
    "lib/**/*.js.map",
    "install.js",
    "typescript-if-required.js",
    "cjs-entry.js",
    "cjs-entry-core.js"
  ],
  "author": "The Chromium Authors",
  "license": "Apache-2.0",
  "dependencies": {
    "debug": "4.3.2",
    "devtools-protocol": "0.0.937139",
    "extract-zip": "2.0.1",
    "https-proxy-agent": "5.0.0",
    "node-fetch": "2.6.5",
    "pkg-dir": "4.2.0",
    "progress": "2.0.3",
    "proxy-from-env": "1.1.0",
    "rimraf": "3.0.2",
    "tar-fs": "2.1.1",
    "unbzip2-stream": "1.4.3",
    "ws": "8.2.3"
  },
  "devDependencies": {
    "@commitlint/cli": "13.2.0",
    "@commitlint/config-conventional": "13.2.0",
    "@microsoft/api-documenter": "7.13.65",
    "@microsoft/api-extractor": "7.18.15",
    "@types/debug": "4.1.7",
    "@types/mime": "2.0.3",
    "@types/mocha": "9.0.0",
    "@types/node": "16.10.9",
    "@types/proxy-from-env": "1.0.1",
    "@types/rimraf": "3.0.2",
    "@types/sinon": "10.0.4",
    "@types/tar-fs": "2.0.1",
    "@types/ws": "8.2.0",
    "@typescript-eslint/eslint-plugin": "4.23.0",
    "@typescript-eslint/parser": "4.33.0",
    "@web/test-runner": "0.13.18",
    "commonmark": "0.29.3",
    "cross-env": "7.0.3",
    "eslint": "7.32.0",
    "eslint-config-prettier": "8.3.0",
    "eslint-plugin-import": "2.22.1",
    "eslint-plugin-mocha": "9.0.0",
    "eslint-plugin-prettier": "4.0.0",
    "eslint-plugin-unicorn": "37.0.1",
    "esprima": "4.0.1",
    "expect": "25.2.7",
    "husky": "7.0.2",
    "jpeg-js": "0.3.7",
    "mime": "2.5.2",
    "minimist": "1.2.0",
    "mocha": "9.1.3",
    "ncp": "2.0.0",
    "pixelmatch": "5.2.1",
    "pngjs": "6.0.0",
    "prettier": "2.3.0",
    "sinon": "9.2.4",
    "source-map-support": "0.5.19",
    "standard-version": "9.3.2",
    "text-diff": "1.0.1",
    "ts-node": "10.4.0",
    "typescript": "4.4.4"
  }
}
},{}],61:[function(require,module,exports){
'use strict';

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var codes = {};

function createErrorType(code, message, Base) {
  if (!Base) {
    Base = Error;
  }

  function getMessage(arg1, arg2, arg3) {
    if (typeof message === 'string') {
      return message;
    } else {
      return message(arg1, arg2, arg3);
    }
  }

  var NodeError =
  /*#__PURE__*/
  function (_Base) {
    _inheritsLoose(NodeError, _Base);

    function NodeError(arg1, arg2, arg3) {
      return _Base.call(this, getMessage(arg1, arg2, arg3)) || this;
    }

    return NodeError;
  }(Base);

  NodeError.prototype.name = Base.name;
  NodeError.prototype.code = code;
  codes[code] = NodeError;
} // https://github.com/nodejs/node/blob/v10.8.0/lib/internal/errors.js


function oneOf(expected, thing) {
  if (Array.isArray(expected)) {
    var len = expected.length;
    expected = expected.map(function (i) {
      return String(i);
    });

    if (len > 2) {
      return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(', '), ", or ") + expected[len - 1];
    } else if (len === 2) {
      return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
    } else {
      return "of ".concat(thing, " ").concat(expected[0]);
    }
  } else {
    return "of ".concat(thing, " ").concat(String(expected));
  }
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith


function startsWith(str, search, pos) {
  return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith


function endsWith(str, search, this_len) {
  if (this_len === undefined || this_len > str.length) {
    this_len = str.length;
  }

  return str.substring(this_len - search.length, this_len) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes


function includes(str, search, start) {
  if (typeof start !== 'number') {
    start = 0;
  }

  if (start + search.length > str.length) {
    return false;
  } else {
    return str.indexOf(search, start) !== -1;
  }
}

createErrorType('ERR_INVALID_OPT_VALUE', function (name, value) {
  return 'The value "' + value + '" is invalid for option "' + name + '"';
}, TypeError);
createErrorType('ERR_INVALID_ARG_TYPE', function (name, expected, actual) {
  // determiner: 'must be' or 'must not be'
  var determiner;

  if (typeof expected === 'string' && startsWith(expected, 'not ')) {
    determiner = 'must not be';
    expected = expected.replace(/^not /, '');
  } else {
    determiner = 'must be';
  }

  var msg;

  if (endsWith(name, ' argument')) {
    // For cases like 'first argument'
    msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  } else {
    var type = includes(name, '.') ? 'property' : 'argument';
    msg = "The \"".concat(name, "\" ").concat(type, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  }

  msg += ". Received type ".concat(typeof actual);
  return msg;
}, TypeError);
createErrorType('ERR_STREAM_PUSH_AFTER_EOF', 'stream.push() after EOF');
createErrorType('ERR_METHOD_NOT_IMPLEMENTED', function (name) {
  return 'The ' + name + ' method is not implemented';
});
createErrorType('ERR_STREAM_PREMATURE_CLOSE', 'Premature close');
createErrorType('ERR_STREAM_DESTROYED', function (name) {
  return 'Cannot call ' + name + ' after a stream was destroyed';
});
createErrorType('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times');
createErrorType('ERR_STREAM_CANNOT_PIPE', 'Cannot pipe, not readable');
createErrorType('ERR_STREAM_WRITE_AFTER_END', 'write after end');
createErrorType('ERR_STREAM_NULL_VALUES', 'May not write null values to stream', TypeError);
createErrorType('ERR_UNKNOWN_ENCODING', function (arg) {
  return 'Unknown encoding: ' + arg;
}, TypeError);
createErrorType('ERR_STREAM_UNSHIFT_AFTER_END_EVENT', 'stream.unshift() after end event');
module.exports.codes = codes;

},{}],62:[function(require,module,exports){
(function (process){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.
'use strict';
/*<replacement>*/

var objectKeys = Object.keys || function (obj) {
  var keys = [];

  for (var key in obj) {
    keys.push(key);
  }

  return keys;
};
/*</replacement>*/


module.exports = Duplex;

var Readable = require('./_stream_readable');

var Writable = require('./_stream_writable');

require('inherits')(Duplex, Readable);

{
  // Allow the keys array to be GC'ed.
  var keys = objectKeys(Writable.prototype);

  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);
  Readable.call(this, options);
  Writable.call(this, options);
  this.allowHalfOpen = true;

  if (options) {
    if (options.readable === false) this.readable = false;
    if (options.writable === false) this.writable = false;

    if (options.allowHalfOpen === false) {
      this.allowHalfOpen = false;
      this.once('end', onend);
    }
  }
}

Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
});
Object.defineProperty(Duplex.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});
Object.defineProperty(Duplex.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
}); // the no-half-open enforcer

function onend() {
  // If the writable side ended, then we're ok.
  if (this._writableState.ended) return; // no more data can be written.
  // But allow more writes to happen in this tick.

  process.nextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

Object.defineProperty(Duplex.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }

    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    } // backward compatibility, the user is explicitly
    // managing destroyed


    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});
}).call(this)}).call(this,require('_process'))
},{"./_stream_readable":64,"./_stream_writable":66,"_process":13,"inherits":9}],63:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.
'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

require('inherits')(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);
  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":65,"inherits":9}],64:[function(require,module,exports){
(function (process,global){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
'use strict';

module.exports = Readable;
/*<replacement>*/

var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;
/*<replacement>*/

var EE = require('events').EventEmitter;

var EElistenerCount = function EElistenerCount(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/


var Stream = require('./internal/streams/stream');
/*</replacement>*/


var Buffer = require('buffer').Buffer;

var OurUint8Array = global.Uint8Array || function () {};

function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}

function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
/*<replacement>*/


var debugUtil = require('util');

var debug;

if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function debug() {};
}
/*</replacement>*/


var BufferList = require('./internal/streams/buffer_list');

var destroyImpl = require('./internal/streams/destroy');

var _require = require('./internal/streams/state'),
    getHighWaterMark = _require.getHighWaterMark;

var _require$codes = require('../errors').codes,
    ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
    ERR_STREAM_PUSH_AFTER_EOF = _require$codes.ERR_STREAM_PUSH_AFTER_EOF,
    ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
    ERR_STREAM_UNSHIFT_AFTER_END_EVENT = _require$codes.ERR_STREAM_UNSHIFT_AFTER_END_EVENT; // Lazy loaded to improve the startup performance.


var StringDecoder;
var createReadableStreamAsyncIterator;
var from;

require('inherits')(Readable, Stream);

var errorOrDestroy = destroyImpl.errorOrDestroy;
var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn); // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.

  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (Array.isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}

function ReadableState(options, stream, isDuplex) {
  Duplex = Duplex || require('./_stream_duplex');
  options = options || {}; // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.

  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex; // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away

  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode; // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"

  this.highWaterMark = getHighWaterMark(this, options, 'readableHighWaterMark', isDuplex); // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()

  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false; // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.

  this.sync = true; // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.

  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;
  this.paused = true; // Should close be emitted on destroy. Defaults to true.

  this.emitClose = options.emitClose !== false; // Should .destroy() be called after 'end' (and potentially 'finish')

  this.autoDestroy = !!options.autoDestroy; // has it been destroyed

  this.destroyed = false; // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.

  this.defaultEncoding = options.defaultEncoding || 'utf8'; // the number of writers that are awaiting a drain event in .pipe()s

  this.awaitDrain = 0; // if true, a maybeReadMore has been scheduled

  this.readingMore = false;
  this.decoder = null;
  this.encoding = null;

  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');
  if (!(this instanceof Readable)) return new Readable(options); // Checking for a Stream.Duplex instance is faster here instead of inside
  // the ReadableState constructor, at least with V8 6.5

  var isDuplex = this instanceof Duplex;
  this._readableState = new ReadableState(options, this, isDuplex); // legacy

  this.readable = true;

  if (options) {
    if (typeof options.read === 'function') this._read = options.read;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }

  Stream.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined) {
      return false;
    }

    return this._readableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    } // backward compatibility, the user is explicitly
    // managing destroyed


    this._readableState.destroyed = value;
  }
});
Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;

Readable.prototype._destroy = function (err, cb) {
  cb(err);
}; // Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.


Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;

  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;

      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }

      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }

  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
}; // Unshift should *always* be something directly out of read()


Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  debug('readableAddChunk', chunk);
  var state = stream._readableState;

  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);

    if (er) {
      errorOrDestroy(stream, er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }

      if (addToFront) {
        if (state.endEmitted) errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
      } else if (state.destroyed) {
        return false;
      } else {
        state.reading = false;

        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
      maybeReadMore(stream, state);
    }
  } // We can push more data if we are below the highWaterMark.
  // Also, if we have no data yet, we can stand some more bytes.
  // This is to work around cases where hwm=0, such as the repl.


  return !state.ended && (state.length < state.highWaterMark || state.length === 0);
}

function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    state.awaitDrain = 0;
    stream.emit('data', chunk);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);
    if (state.needReadable) emitReadable(stream);
  }

  maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
  var er;

  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer', 'Uint8Array'], chunk);
  }

  return er;
}

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
}; // backwards compatibility.


Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  var decoder = new StringDecoder(enc);
  this._readableState.decoder = decoder; // If setEncoding(null), decoder.encoding equals utf8

  this._readableState.encoding = this._readableState.decoder.encoding; // Iterate over current buffer to convert already stored Buffers:

  var p = this._readableState.buffer.head;
  var content = '';

  while (p !== null) {
    content += decoder.write(p.data);
    p = p.next;
  }

  this._readableState.buffer.clear();

  if (content !== '') this._readableState.buffer.push(content);
  this._readableState.length = content.length;
  return this;
}; // Don't raise the hwm > 1GB


var MAX_HWM = 0x40000000;

function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    // TODO(ronag): Throw ERR_VALUE_OUT_OF_RANGE.
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }

  return n;
} // This function is designed to be inlinable, so please take care when making
// changes to the function body.


function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;

  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  } // If we're asking for more than the current hwm, then raise the hwm.


  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n; // Don't have enough

  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }

  return state.length;
} // you can override either this method, or the async _read(n) below.


Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;
  if (n !== 0) state.emittedReadable = false; // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.

  if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state); // if we've ended, and we're now clear, then finish it up.

  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  } // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.
  // if we need a readable event, then we need to do some reading.


  var doRead = state.needReadable;
  debug('need readable', doRead); // if we currently have less than the highWaterMark, then also read some

  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  } // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.


  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true; // if the length is currently zero, then we *need* a readable event.

    if (state.length === 0) state.needReadable = true; // call internal read method

    this._read(state.highWaterMark);

    state.sync = false; // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.

    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = state.length <= state.highWaterMark;
    n = 0;
  } else {
    state.length -= n;
    state.awaitDrain = 0;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true; // If we tried to read() past the EOF, then emit end on the next tick.

    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);
  return ret;
};

function onEofChunk(stream, state) {
  debug('onEofChunk');
  if (state.ended) return;

  if (state.decoder) {
    var chunk = state.decoder.end();

    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }

  state.ended = true;

  if (state.sync) {
    // if we are sync, wait until next tick to emit the data.
    // Otherwise we risk emitting data in the flow()
    // the readable code triggers during a read() call
    emitReadable(stream);
  } else {
    // emit 'readable' now to make sure it gets picked up.
    state.needReadable = false;

    if (!state.emittedReadable) {
      state.emittedReadable = true;
      emitReadable_(stream);
    }
  }
} // Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.


function emitReadable(stream) {
  var state = stream._readableState;
  debug('emitReadable', state.needReadable, state.emittedReadable);
  state.needReadable = false;

  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    process.nextTick(emitReadable_, stream);
  }
}

function emitReadable_(stream) {
  var state = stream._readableState;
  debug('emitReadable_', state.destroyed, state.length, state.ended);

  if (!state.destroyed && (state.length || state.ended)) {
    stream.emit('readable');
    state.emittedReadable = false;
  } // The stream needs another readable event if
  // 1. It is not flowing, as the flow mechanism will take
  //    care of it.
  // 2. It is not ended.
  // 3. It is below the highWaterMark, so we can schedule
  //    another readable later.


  state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
  flow(stream);
} // at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.


function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  // Attempt to read more data if we should.
  //
  // The conditions for reading more data are (one of):
  // - Not enough data buffered (state.length < state.highWaterMark). The loop
  //   is responsible for filling the buffer with enough data if such data
  //   is available. If highWaterMark is 0 and we are not in the flowing mode
  //   we should _not_ attempt to buffer any extra data. We'll get more data
  //   when the stream consumer calls read() instead.
  // - No data in the buffer, and the stream is in flowing mode. In this mode
  //   the loop below is responsible for ensuring read() is called. Failing to
  //   call read here would abort the flow and there's no other mechanism for
  //   continuing the flow if the stream consumer has just subscribed to the
  //   'data' event.
  //
  // In addition to the above conditions to keep reading data, the following
  // conditions prevent the data from being read:
  // - The stream has ended (state.ended).
  // - There is already a pending 'read' operation (state.reading). This is a
  //   case where the the stream has called the implementation defined _read()
  //   method, but they are processing the call asynchronously and have _not_
  //   called push() with new data. In this case we skip performing more
  //   read()s. The execution ends in this method again after the _read() ends
  //   up calling push() with more data.
  while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
    var len = state.length;
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length) // didn't get any data, stop spinning.
      break;
  }

  state.readingMore = false;
} // abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.


Readable.prototype._read = function (n) {
  errorOrDestroy(this, new ERR_METHOD_NOT_IMPLEMENTED('_read()'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;

    case 1:
      state.pipes = [state.pipes, dest];
      break;

    default:
      state.pipes.push(dest);
      break;
  }

  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);
  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) process.nextTick(endFn);else src.once('end', endFn);
  dest.on('unpipe', onunpipe);

  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');

    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  } // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.


  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);
  var cleanedUp = false;

  function cleanup() {
    debug('cleanup'); // cleanup event handlers once the pipe is broken

    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);
    cleanedUp = true; // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.

    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  src.on('data', ondata);

  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    debug('dest.write', ret);

    if (ret === false) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', state.awaitDrain);
        state.awaitDrain++;
      }

      src.pause();
    }
  } // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.


  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) errorOrDestroy(dest, er);
  } // Make sure our error handler is attached before userland ones.


  prependListener(dest, 'error', onerror); // Both close and finish should trigger unpipe, but only once.

  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }

  dest.once('close', onclose);

  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }

  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  } // tell the dest that it's being piped to


  dest.emit('pipe', src); // start the flow if it hasn't been started already.

  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function pipeOnDrainFunctionResult() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;

    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = {
    hasUnpiped: false
  }; // if we're not piping anywhere, then do nothing.

  if (state.pipesCount === 0) return this; // just one destination.  most common case.

  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;
    if (!dest) dest = state.pipes; // got a match.

    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  } // slow case. multiple pipe destinations.


  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this, {
        hasUnpiped: false
      });
    }

    return this;
  } // try to find the right one.


  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;
  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];
  dest.emit('unpipe', this, unpipeInfo);
  return this;
}; // set up data events if they are asked for
// Ensure readable listeners eventually get something


Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);
  var state = this._readableState;

  if (ev === 'data') {
    // update readableListening so that resume() may be a no-op
    // a few lines down. This is needed to support once('readable').
    state.readableListening = this.listenerCount('readable') > 0; // Try start flowing on next tick if stream isn't explicitly paused

    if (state.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.flowing = false;
      state.emittedReadable = false;
      debug('on readable', state.length, state.reading);

      if (state.length) {
        emitReadable(this);
      } else if (!state.reading) {
        process.nextTick(nReadingNextTick, this);
      }
    }
  }

  return res;
};

Readable.prototype.addListener = Readable.prototype.on;

Readable.prototype.removeListener = function (ev, fn) {
  var res = Stream.prototype.removeListener.call(this, ev, fn);

  if (ev === 'readable') {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }

  return res;
};

Readable.prototype.removeAllListeners = function (ev) {
  var res = Stream.prototype.removeAllListeners.apply(this, arguments);

  if (ev === 'readable' || ev === undefined) {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }

  return res;
};

function updateReadableListening(self) {
  var state = self._readableState;
  state.readableListening = self.listenerCount('readable') > 0;

  if (state.resumeScheduled && !state.paused) {
    // flowing needs to be set to true now, otherwise
    // the upcoming resume will not flow.
    state.flowing = true; // crude way to check if we should resume
  } else if (self.listenerCount('data') > 0) {
    self.resume();
  }
}

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
} // pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.


Readable.prototype.resume = function () {
  var state = this._readableState;

  if (!state.flowing) {
    debug('resume'); // we flow only if there is no one listening
    // for readable, but we still have to call
    // resume()

    state.flowing = !state.readableListening;
    resume(this, state);
  }

  state.paused = false;
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  debug('resume', state.reading);

  if (!state.reading) {
    stream.read(0);
  }

  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);

  if (this._readableState.flowing !== false) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }

  this._readableState.paused = true;
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);

  while (state.flowing && stream.read() !== null) {
    ;
  }
} // wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.


Readable.prototype.wrap = function (stream) {
  var _this = this;

  var state = this._readableState;
  var paused = false;
  stream.on('end', function () {
    debug('wrapped end');

    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }

    _this.push(null);
  });
  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk); // don't skip over falsy values in objectMode

    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = _this.push(chunk);

    if (!ret) {
      paused = true;
      stream.pause();
    }
  }); // proxy all the other methods.
  // important when wrapping filters and duplexes.

  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function methodWrap(method) {
        return function methodWrapReturnFunction() {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  } // proxy certain important events.


  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  } // when we try to consume some more bytes, simply unpause the
  // underlying stream.


  this._read = function (n) {
    debug('wrapped _read', n);

    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return this;
};

if (typeof Symbol === 'function') {
  Readable.prototype[Symbol.asyncIterator] = function () {
    if (createReadableStreamAsyncIterator === undefined) {
      createReadableStreamAsyncIterator = require('./internal/streams/async_iterator');
    }

    return createReadableStreamAsyncIterator(this);
  };
}

Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.highWaterMark;
  }
});
Object.defineProperty(Readable.prototype, 'readableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState && this._readableState.buffer;
  }
});
Object.defineProperty(Readable.prototype, 'readableFlowing', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.flowing;
  },
  set: function set(state) {
    if (this._readableState) {
      this._readableState.flowing = state;
    }
  }
}); // exposed for testing purposes only.

Readable._fromList = fromList;
Object.defineProperty(Readable.prototype, 'readableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.length;
  }
}); // Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.

function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;
  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.first();else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = state.buffer.consume(n, state.decoder);
  }
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;
  debug('endReadable', state.endEmitted);

  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  debug('endReadableNT', state.endEmitted, state.length); // Check that we didn't get one last unshift.

  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');

    if (state.autoDestroy) {
      // In case of duplex streams we need a way to detect
      // if the writable side is ready for autoDestroy as well
      var wState = stream._writableState;

      if (!wState || wState.autoDestroy && wState.finished) {
        stream.destroy();
      }
    }
  }
}

if (typeof Symbol === 'function') {
  Readable.from = function (iterable, opts) {
    if (from === undefined) {
      from = require('./internal/streams/from');
    }

    return from(Readable, iterable, opts);
  };
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }

  return -1;
}
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../errors":61,"./_stream_duplex":62,"./internal/streams/async_iterator":67,"./internal/streams/buffer_list":68,"./internal/streams/destroy":69,"./internal/streams/from":71,"./internal/streams/state":73,"./internal/streams/stream":74,"_process":13,"buffer":6,"events":7,"inherits":9,"string_decoder/":77,"util":4}],65:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.
'use strict';

module.exports = Transform;

var _require$codes = require('../errors').codes,
    ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
    ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
    ERR_TRANSFORM_ALREADY_TRANSFORMING = _require$codes.ERR_TRANSFORM_ALREADY_TRANSFORMING,
    ERR_TRANSFORM_WITH_LENGTH_0 = _require$codes.ERR_TRANSFORM_WITH_LENGTH_0;

var Duplex = require('./_stream_duplex');

require('inherits')(Transform, Duplex);

function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;
  var cb = ts.writecb;

  if (cb === null) {
    return this.emit('error', new ERR_MULTIPLE_CALLBACK());
  }

  ts.writechunk = null;
  ts.writecb = null;
  if (data != null) // single equals check for both `null` and `undefined`
    this.push(data);
  cb(er);
  var rs = this._readableState;
  rs.reading = false;

  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);
  Duplex.call(this, options);
  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  }; // start out asking for a readable event once data is transformed.

  this._readableState.needReadable = true; // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.

  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;
    if (typeof options.flush === 'function') this._flush = options.flush;
  } // When the writable side finishes, then flush out anything remaining.


  this.on('prefinish', prefinish);
}

function prefinish() {
  var _this = this;

  if (typeof this._flush === 'function' && !this._readableState.destroyed) {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
}; // This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.


Transform.prototype._transform = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_transform()'));
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;

  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
}; // Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.


Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && !ts.transforming) {
    ts.transforming = true;

    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

Transform.prototype._destroy = function (err, cb) {
  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
  });
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);
  if (data != null) // single equals check for both `null` and `undefined`
    stream.push(data); // TODO(BridgeAR): Write a test for these two error cases
  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided

  if (stream._writableState.length) throw new ERR_TRANSFORM_WITH_LENGTH_0();
  if (stream._transformState.transforming) throw new ERR_TRANSFORM_ALREADY_TRANSFORMING();
  return stream.push(null);
}
},{"../errors":61,"./_stream_duplex":62,"inherits":9}],66:[function(require,module,exports){
(function (process,global){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.
'use strict';

module.exports = Writable;
/* <replacement> */

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
} // It seems a linked list but it is not
// there will be only 2 of these for each stream


function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;

  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/


var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;
/*<replacement>*/

var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/

var Stream = require('./internal/streams/stream');
/*</replacement>*/


var Buffer = require('buffer').Buffer;

var OurUint8Array = global.Uint8Array || function () {};

function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}

function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

var destroyImpl = require('./internal/streams/destroy');

var _require = require('./internal/streams/state'),
    getHighWaterMark = _require.getHighWaterMark;

var _require$codes = require('../errors').codes,
    ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
    ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
    ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
    ERR_STREAM_CANNOT_PIPE = _require$codes.ERR_STREAM_CANNOT_PIPE,
    ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED,
    ERR_STREAM_NULL_VALUES = _require$codes.ERR_STREAM_NULL_VALUES,
    ERR_STREAM_WRITE_AFTER_END = _require$codes.ERR_STREAM_WRITE_AFTER_END,
    ERR_UNKNOWN_ENCODING = _require$codes.ERR_UNKNOWN_ENCODING;

var errorOrDestroy = destroyImpl.errorOrDestroy;

require('inherits')(Writable, Stream);

function nop() {}

function WritableState(options, stream, isDuplex) {
  Duplex = Duplex || require('./_stream_duplex');
  options = options || {}; // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream,
  // e.g. options.readableObjectMode vs. options.writableObjectMode, etc.

  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex; // object stream flag to indicate whether or not this stream
  // contains buffers or objects.

  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode; // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()

  this.highWaterMark = getHighWaterMark(this, options, 'writableHighWaterMark', isDuplex); // if _final has been called

  this.finalCalled = false; // drain event flag.

  this.needDrain = false; // at the start of calling end()

  this.ending = false; // when end() has been called, and returned

  this.ended = false; // when 'finish' is emitted

  this.finished = false; // has it been destroyed

  this.destroyed = false; // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.

  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode; // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.

  this.defaultEncoding = options.defaultEncoding || 'utf8'; // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.

  this.length = 0; // a flag to see when we're in the middle of a write.

  this.writing = false; // when true all writes will be buffered until .uncork() call

  this.corked = 0; // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.

  this.sync = true; // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.

  this.bufferProcessing = false; // the callback that's passed to _write(chunk,cb)

  this.onwrite = function (er) {
    onwrite(stream, er);
  }; // the callback that the user supplies to write(chunk,encoding,cb)


  this.writecb = null; // the amount that is being written when _write is called.

  this.writelen = 0;
  this.bufferedRequest = null;
  this.lastBufferedRequest = null; // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted

  this.pendingcb = 0; // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams

  this.prefinished = false; // True if the error was already emitted and should not be thrown again

  this.errorEmitted = false; // Should close be emitted on destroy. Defaults to true.

  this.emitClose = options.emitClose !== false; // Should .destroy() be called after 'finish' (and potentially 'end')

  this.autoDestroy = !!options.autoDestroy; // count buffered requests

  this.bufferedRequestCount = 0; // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two

  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];

  while (current) {
    out.push(current);
    current = current.next;
  }

  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function writableStateBufferGetter() {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})(); // Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.


var realHasInstance;

if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function value(object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;
      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function realHasInstance(object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex'); // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.
  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the WritableState constructor, at least with V8 6.5

  var isDuplex = this instanceof Duplex;
  if (!isDuplex && !realHasInstance.call(Writable, this)) return new Writable(options);
  this._writableState = new WritableState(options, this, isDuplex); // legacy.

  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;
    if (typeof options.writev === 'function') this._writev = options.writev;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
    if (typeof options.final === 'function') this._final = options.final;
  }

  Stream.call(this);
} // Otherwise people can pipe Writable streams, which is just wrong.


Writable.prototype.pipe = function () {
  errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
};

function writeAfterEnd(stream, cb) {
  var er = new ERR_STREAM_WRITE_AFTER_END(); // TODO: defer error events consistently everywhere, not just the cb

  errorOrDestroy(stream, er);
  process.nextTick(cb, er);
} // Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.


function validChunk(stream, state, chunk, cb) {
  var er;

  if (chunk === null) {
    er = new ERR_STREAM_NULL_VALUES();
  } else if (typeof chunk !== 'string' && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer'], chunk);
  }

  if (er) {
    errorOrDestroy(stream, er);
    process.nextTick(cb, er);
    return false;
  }

  return true;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  var isBuf = !state.objectMode && _isUint8Array(chunk);

  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;
  if (typeof cb !== 'function') cb = nop;
  if (state.ending) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }
  return ret;
};

Writable.prototype.cork = function () {
  this._writableState.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;
    if (!state.writing && !state.corked && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new ERR_UNKNOWN_ENCODING(encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

Object.defineProperty(Writable.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }

  return chunk;
}

Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
}); // if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.

function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);

    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }

  var len = state.objectMode ? 1 : chunk.length;
  state.length += len;
  var ret = state.length < state.highWaterMark; // we must ensure that previous needDrain will not be reset to false.

  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };

    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }

    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (state.destroyed) state.onwrite(new ERR_STREAM_DESTROYED('write'));else if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;

  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    process.nextTick(cb, er); // this can emit finish, and it will always happen
    // after error

    process.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er); // this can emit finish, but finish must
    // always follow error

    finishMaybe(stream, state);
  }
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;
  if (typeof cb !== 'function') throw new ERR_MULTIPLE_CALLBACK();
  onwriteStateUpdate(state);
  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state) || stream.destroyed;

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      process.nextTick(afterWrite, stream, state, finished, cb);
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
} // Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.


function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
} // if there's something in the buffer waiting, then process it


function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;
    var count = 0;
    var allBuffers = true;

    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }

    buffer.allBuffers = allBuffers;
    doWrite(stream, state, true, state.length, buffer, '', holder.finish); // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite

    state.pendingcb++;
    state.lastBufferedRequest = null;

    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }

    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;
      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--; // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.

      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_write()'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding); // .end() fully uncorks

  if (state.corked) {
    state.corked = 1;
    this.uncork();
  } // ignore unnecessary end() calls.


  if (!state.ending) endWritable(this, state, cb);
  return this;
};

Object.defineProperty(Writable.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
});

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}

function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;

    if (err) {
      errorOrDestroy(stream, err);
    }

    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}

function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function' && !state.destroyed) {
      state.pendingcb++;
      state.finalCalled = true;
      process.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);

  if (need) {
    prefinish(stream, state);

    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');

      if (state.autoDestroy) {
        // In case of duplex streams we need a way to detect
        // if the readable side is ready for autoDestroy as well
        var rState = stream._readableState;

        if (!rState || rState.autoDestroy && rState.endEmitted) {
          stream.destroy();
        }
      }
    }
  }

  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);

  if (cb) {
    if (state.finished) process.nextTick(cb);else stream.once('finish', cb);
  }

  state.ended = true;
  stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;

  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  } // reuse the free corkReq.


  state.corkedRequestsFree.next = corkReq;
}

Object.defineProperty(Writable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._writableState === undefined) {
      return false;
    }

    return this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    } // backward compatibility, the user is explicitly
    // managing destroyed


    this._writableState.destroyed = value;
  }
});
Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;

Writable.prototype._destroy = function (err, cb) {
  cb(err);
};
}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../errors":61,"./_stream_duplex":62,"./internal/streams/destroy":69,"./internal/streams/state":73,"./internal/streams/stream":74,"_process":13,"buffer":6,"inherits":9,"util-deprecate":78}],67:[function(require,module,exports){
(function (process){(function (){
'use strict';

var _Object$setPrototypeO;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var finished = require('./end-of-stream');

var kLastResolve = Symbol('lastResolve');
var kLastReject = Symbol('lastReject');
var kError = Symbol('error');
var kEnded = Symbol('ended');
var kLastPromise = Symbol('lastPromise');
var kHandlePromise = Symbol('handlePromise');
var kStream = Symbol('stream');

function createIterResult(value, done) {
  return {
    value: value,
    done: done
  };
}

function readAndResolve(iter) {
  var resolve = iter[kLastResolve];

  if (resolve !== null) {
    var data = iter[kStream].read(); // we defer if data is null
    // we can be expecting either 'end' or
    // 'error'

    if (data !== null) {
      iter[kLastPromise] = null;
      iter[kLastResolve] = null;
      iter[kLastReject] = null;
      resolve(createIterResult(data, false));
    }
  }
}

function onReadable(iter) {
  // we wait for the next tick, because it might
  // emit an error with process.nextTick
  process.nextTick(readAndResolve, iter);
}

function wrapForNext(lastPromise, iter) {
  return function (resolve, reject) {
    lastPromise.then(function () {
      if (iter[kEnded]) {
        resolve(createIterResult(undefined, true));
        return;
      }

      iter[kHandlePromise](resolve, reject);
    }, reject);
  };
}

var AsyncIteratorPrototype = Object.getPrototypeOf(function () {});
var ReadableStreamAsyncIteratorPrototype = Object.setPrototypeOf((_Object$setPrototypeO = {
  get stream() {
    return this[kStream];
  },

  next: function next() {
    var _this = this;

    // if we have detected an error in the meanwhile
    // reject straight away
    var error = this[kError];

    if (error !== null) {
      return Promise.reject(error);
    }

    if (this[kEnded]) {
      return Promise.resolve(createIterResult(undefined, true));
    }

    if (this[kStream].destroyed) {
      // We need to defer via nextTick because if .destroy(err) is
      // called, the error will be emitted via nextTick, and
      // we cannot guarantee that there is no error lingering around
      // waiting to be emitted.
      return new Promise(function (resolve, reject) {
        process.nextTick(function () {
          if (_this[kError]) {
            reject(_this[kError]);
          } else {
            resolve(createIterResult(undefined, true));
          }
        });
      });
    } // if we have multiple next() calls
    // we will wait for the previous Promise to finish
    // this logic is optimized to support for await loops,
    // where next() is only called once at a time


    var lastPromise = this[kLastPromise];
    var promise;

    if (lastPromise) {
      promise = new Promise(wrapForNext(lastPromise, this));
    } else {
      // fast path needed to support multiple this.push()
      // without triggering the next() queue
      var data = this[kStream].read();

      if (data !== null) {
        return Promise.resolve(createIterResult(data, false));
      }

      promise = new Promise(this[kHandlePromise]);
    }

    this[kLastPromise] = promise;
    return promise;
  }
}, _defineProperty(_Object$setPrototypeO, Symbol.asyncIterator, function () {
  return this;
}), _defineProperty(_Object$setPrototypeO, "return", function _return() {
  var _this2 = this;

  // destroy(err, cb) is a private API
  // we can guarantee we have that here, because we control the
  // Readable class this is attached to
  return new Promise(function (resolve, reject) {
    _this2[kStream].destroy(null, function (err) {
      if (err) {
        reject(err);
        return;
      }

      resolve(createIterResult(undefined, true));
    });
  });
}), _Object$setPrototypeO), AsyncIteratorPrototype);

var createReadableStreamAsyncIterator = function createReadableStreamAsyncIterator(stream) {
  var _Object$create;

  var iterator = Object.create(ReadableStreamAsyncIteratorPrototype, (_Object$create = {}, _defineProperty(_Object$create, kStream, {
    value: stream,
    writable: true
  }), _defineProperty(_Object$create, kLastResolve, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kLastReject, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kError, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kEnded, {
    value: stream._readableState.endEmitted,
    writable: true
  }), _defineProperty(_Object$create, kHandlePromise, {
    value: function value(resolve, reject) {
      var data = iterator[kStream].read();

      if (data) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        resolve(createIterResult(data, false));
      } else {
        iterator[kLastResolve] = resolve;
        iterator[kLastReject] = reject;
      }
    },
    writable: true
  }), _Object$create));
  iterator[kLastPromise] = null;
  finished(stream, function (err) {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      var reject = iterator[kLastReject]; // reject if we are waiting for data in the Promise
      // returned by next() and store the error

      if (reject !== null) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        reject(err);
      }

      iterator[kError] = err;
      return;
    }

    var resolve = iterator[kLastResolve];

    if (resolve !== null) {
      iterator[kLastPromise] = null;
      iterator[kLastResolve] = null;
      iterator[kLastReject] = null;
      resolve(createIterResult(undefined, true));
    }

    iterator[kEnded] = true;
  });
  stream.on('readable', onReadable.bind(null, iterator));
  return iterator;
};

module.exports = createReadableStreamAsyncIterator;
}).call(this)}).call(this,require('_process'))
},{"./end-of-stream":70,"_process":13}],68:[function(require,module,exports){
'use strict';

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var _require = require('buffer'),
    Buffer = _require.Buffer;

var _require2 = require('util'),
    inspect = _require2.inspect;

var custom = inspect && inspect.custom || 'inspect';

function copyBuffer(src, target, offset) {
  Buffer.prototype.copy.call(src, target, offset);
}

module.exports =
/*#__PURE__*/
function () {
  function BufferList() {
    _classCallCheck(this, BufferList);

    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  _createClass(BufferList, [{
    key: "push",
    value: function push(v) {
      var entry = {
        data: v,
        next: null
      };
      if (this.length > 0) this.tail.next = entry;else this.head = entry;
      this.tail = entry;
      ++this.length;
    }
  }, {
    key: "unshift",
    value: function unshift(v) {
      var entry = {
        data: v,
        next: this.head
      };
      if (this.length === 0) this.tail = entry;
      this.head = entry;
      ++this.length;
    }
  }, {
    key: "shift",
    value: function shift() {
      if (this.length === 0) return;
      var ret = this.head.data;
      if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
      --this.length;
      return ret;
    }
  }, {
    key: "clear",
    value: function clear() {
      this.head = this.tail = null;
      this.length = 0;
    }
  }, {
    key: "join",
    value: function join(s) {
      if (this.length === 0) return '';
      var p = this.head;
      var ret = '' + p.data;

      while (p = p.next) {
        ret += s + p.data;
      }

      return ret;
    }
  }, {
    key: "concat",
    value: function concat(n) {
      if (this.length === 0) return Buffer.alloc(0);
      var ret = Buffer.allocUnsafe(n >>> 0);
      var p = this.head;
      var i = 0;

      while (p) {
        copyBuffer(p.data, ret, i);
        i += p.data.length;
        p = p.next;
      }

      return ret;
    } // Consumes a specified amount of bytes or characters from the buffered data.

  }, {
    key: "consume",
    value: function consume(n, hasStrings) {
      var ret;

      if (n < this.head.data.length) {
        // `slice` is the same for buffers and strings.
        ret = this.head.data.slice(0, n);
        this.head.data = this.head.data.slice(n);
      } else if (n === this.head.data.length) {
        // First chunk is a perfect match.
        ret = this.shift();
      } else {
        // Result spans more than one buffer.
        ret = hasStrings ? this._getString(n) : this._getBuffer(n);
      }

      return ret;
    }
  }, {
    key: "first",
    value: function first() {
      return this.head.data;
    } // Consumes a specified amount of characters from the buffered data.

  }, {
    key: "_getString",
    value: function _getString(n) {
      var p = this.head;
      var c = 1;
      var ret = p.data;
      n -= ret.length;

      while (p = p.next) {
        var str = p.data;
        var nb = n > str.length ? str.length : n;
        if (nb === str.length) ret += str;else ret += str.slice(0, n);
        n -= nb;

        if (n === 0) {
          if (nb === str.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = str.slice(nb);
          }

          break;
        }

        ++c;
      }

      this.length -= c;
      return ret;
    } // Consumes a specified amount of bytes from the buffered data.

  }, {
    key: "_getBuffer",
    value: function _getBuffer(n) {
      var ret = Buffer.allocUnsafe(n);
      var p = this.head;
      var c = 1;
      p.data.copy(ret);
      n -= p.data.length;

      while (p = p.next) {
        var buf = p.data;
        var nb = n > buf.length ? buf.length : n;
        buf.copy(ret, ret.length - n, 0, nb);
        n -= nb;

        if (n === 0) {
          if (nb === buf.length) {
            ++c;
            if (p.next) this.head = p.next;else this.head = this.tail = null;
          } else {
            this.head = p;
            p.data = buf.slice(nb);
          }

          break;
        }

        ++c;
      }

      this.length -= c;
      return ret;
    } // Make sure the linked list only shows the minimal necessary information.

  }, {
    key: custom,
    value: function value(_, options) {
      return inspect(this, _objectSpread({}, options, {
        // Only inspect one level.
        depth: 0,
        // It should not recurse.
        customInspect: false
      }));
    }
  }]);

  return BufferList;
}();
},{"buffer":6,"util":4}],69:[function(require,module,exports){
(function (process){(function (){
'use strict'; // undocumented cb() API, needed for core, not for public API

function destroy(err, cb) {
  var _this = this;

  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;

  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err) {
      if (!this._writableState) {
        process.nextTick(emitErrorNT, this, err);
      } else if (!this._writableState.errorEmitted) {
        this._writableState.errorEmitted = true;
        process.nextTick(emitErrorNT, this, err);
      }
    }

    return this;
  } // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks


  if (this._readableState) {
    this._readableState.destroyed = true;
  } // if this is a duplex stream mark the writable part as destroyed as well


  if (this._writableState) {
    this._writableState.destroyed = true;
  }

  this._destroy(err || null, function (err) {
    if (!cb && err) {
      if (!_this._writableState) {
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else if (!_this._writableState.errorEmitted) {
        _this._writableState.errorEmitted = true;
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else {
        process.nextTick(emitCloseNT, _this);
      }
    } else if (cb) {
      process.nextTick(emitCloseNT, _this);
      cb(err);
    } else {
      process.nextTick(emitCloseNT, _this);
    }
  });

  return this;
}

function emitErrorAndCloseNT(self, err) {
  emitErrorNT(self, err);
  emitCloseNT(self);
}

function emitCloseNT(self) {
  if (self._writableState && !self._writableState.emitClose) return;
  if (self._readableState && !self._readableState.emitClose) return;
  self.emit('close');
}

function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }

  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finalCalled = false;
    this._writableState.prefinished = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}

function emitErrorNT(self, err) {
  self.emit('error', err);
}

function errorOrDestroy(stream, err) {
  // We have tests that rely on errors being emitted
  // in the same tick, so changing this is semver major.
  // For now when you opt-in to autoDestroy we allow
  // the error to be emitted nextTick. In a future
  // semver major update we should change the default to this.
  var rState = stream._readableState;
  var wState = stream._writableState;
  if (rState && rState.autoDestroy || wState && wState.autoDestroy) stream.destroy(err);else stream.emit('error', err);
}

module.exports = {
  destroy: destroy,
  undestroy: undestroy,
  errorOrDestroy: errorOrDestroy
};
}).call(this)}).call(this,require('_process'))
},{"_process":13}],70:[function(require,module,exports){
// Ported from https://github.com/mafintosh/end-of-stream with
// permission from the author, Mathias Buus (@mafintosh).
'use strict';

var ERR_STREAM_PREMATURE_CLOSE = require('../../../errors').codes.ERR_STREAM_PREMATURE_CLOSE;

function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    callback.apply(this, args);
  };
}

function noop() {}

function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}

function eos(stream, opts, callback) {
  if (typeof opts === 'function') return eos(stream, null, opts);
  if (!opts) opts = {};
  callback = once(callback || noop);
  var readable = opts.readable || opts.readable !== false && stream.readable;
  var writable = opts.writable || opts.writable !== false && stream.writable;

  var onlegacyfinish = function onlegacyfinish() {
    if (!stream.writable) onfinish();
  };

  var writableEnded = stream._writableState && stream._writableState.finished;

  var onfinish = function onfinish() {
    writable = false;
    writableEnded = true;
    if (!readable) callback.call(stream);
  };

  var readableEnded = stream._readableState && stream._readableState.endEmitted;

  var onend = function onend() {
    readable = false;
    readableEnded = true;
    if (!writable) callback.call(stream);
  };

  var onerror = function onerror(err) {
    callback.call(stream, err);
  };

  var onclose = function onclose() {
    var err;

    if (readable && !readableEnded) {
      if (!stream._readableState || !stream._readableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }

    if (writable && !writableEnded) {
      if (!stream._writableState || !stream._writableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }
  };

  var onrequest = function onrequest() {
    stream.req.on('finish', onfinish);
  };

  if (isRequest(stream)) {
    stream.on('complete', onfinish);
    stream.on('abort', onclose);
    if (stream.req) onrequest();else stream.on('request', onrequest);
  } else if (writable && !stream._writableState) {
    // legacy streams
    stream.on('end', onlegacyfinish);
    stream.on('close', onlegacyfinish);
  }

  stream.on('end', onend);
  stream.on('finish', onfinish);
  if (opts.error !== false) stream.on('error', onerror);
  stream.on('close', onclose);
  return function () {
    stream.removeListener('complete', onfinish);
    stream.removeListener('abort', onclose);
    stream.removeListener('request', onrequest);
    if (stream.req) stream.req.removeListener('finish', onfinish);
    stream.removeListener('end', onlegacyfinish);
    stream.removeListener('close', onlegacyfinish);
    stream.removeListener('finish', onfinish);
    stream.removeListener('end', onend);
    stream.removeListener('error', onerror);
    stream.removeListener('close', onclose);
  };
}

module.exports = eos;
},{"../../../errors":61}],71:[function(require,module,exports){
module.exports = function () {
  throw new Error('Readable.from is not available in the browser')
};

},{}],72:[function(require,module,exports){
// Ported from https://github.com/mafintosh/pump with
// permission from the author, Mathias Buus (@mafintosh).
'use strict';

var eos;

function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    callback.apply(void 0, arguments);
  };
}

var _require$codes = require('../../../errors').codes,
    ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS,
    ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED;

function noop(err) {
  // Rethrow the error if it exists to avoid swallowing it
  if (err) throw err;
}

function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}

function destroyer(stream, reading, writing, callback) {
  callback = once(callback);
  var closed = false;
  stream.on('close', function () {
    closed = true;
  });
  if (eos === undefined) eos = require('./end-of-stream');
  eos(stream, {
    readable: reading,
    writable: writing
  }, function (err) {
    if (err) return callback(err);
    closed = true;
    callback();
  });
  var destroyed = false;
  return function (err) {
    if (closed) return;
    if (destroyed) return;
    destroyed = true; // request.destroy just do .end - .abort is what we want

    if (isRequest(stream)) return stream.abort();
    if (typeof stream.destroy === 'function') return stream.destroy();
    callback(err || new ERR_STREAM_DESTROYED('pipe'));
  };
}

function call(fn) {
  fn();
}

function pipe(from, to) {
  return from.pipe(to);
}

function popCallback(streams) {
  if (!streams.length) return noop;
  if (typeof streams[streams.length - 1] !== 'function') return noop;
  return streams.pop();
}

function pipeline() {
  for (var _len = arguments.length, streams = new Array(_len), _key = 0; _key < _len; _key++) {
    streams[_key] = arguments[_key];
  }

  var callback = popCallback(streams);
  if (Array.isArray(streams[0])) streams = streams[0];

  if (streams.length < 2) {
    throw new ERR_MISSING_ARGS('streams');
  }

  var error;
  var destroys = streams.map(function (stream, i) {
    var reading = i < streams.length - 1;
    var writing = i > 0;
    return destroyer(stream, reading, writing, function (err) {
      if (!error) error = err;
      if (err) destroys.forEach(call);
      if (reading) return;
      destroys.forEach(call);
      callback(error);
    });
  });
  return streams.reduce(pipe);
}

module.exports = pipeline;
},{"../../../errors":61,"./end-of-stream":70}],73:[function(require,module,exports){
'use strict';

var ERR_INVALID_OPT_VALUE = require('../../../errors').codes.ERR_INVALID_OPT_VALUE;

function highWaterMarkFrom(options, isDuplex, duplexKey) {
  return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
}

function getHighWaterMark(state, options, duplexKey, isDuplex) {
  var hwm = highWaterMarkFrom(options, isDuplex, duplexKey);

  if (hwm != null) {
    if (!(isFinite(hwm) && Math.floor(hwm) === hwm) || hwm < 0) {
      var name = isDuplex ? duplexKey : 'highWaterMark';
      throw new ERR_INVALID_OPT_VALUE(name, hwm);
    }

    return Math.floor(hwm);
  } // Default value


  return state.objectMode ? 16 : 16 * 1024;
}

module.exports = {
  getHighWaterMark: getHighWaterMark
};
},{"../../../errors":61}],74:[function(require,module,exports){
module.exports = require('events').EventEmitter;

},{"events":7}],75:[function(require,module,exports){
/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.prototype = Object.create(Buffer.prototype)

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":6}],76:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/lib/_stream_readable.js');
Stream.Writable = require('readable-stream/lib/_stream_writable.js');
Stream.Duplex = require('readable-stream/lib/_stream_duplex.js');
Stream.Transform = require('readable-stream/lib/_stream_transform.js');
Stream.PassThrough = require('readable-stream/lib/_stream_passthrough.js');
Stream.finished = require('readable-stream/lib/internal/streams/end-of-stream.js')
Stream.pipeline = require('readable-stream/lib/internal/streams/pipeline.js')

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":7,"inherits":9,"readable-stream/lib/_stream_duplex.js":62,"readable-stream/lib/_stream_passthrough.js":63,"readable-stream/lib/_stream_readable.js":64,"readable-stream/lib/_stream_transform.js":65,"readable-stream/lib/_stream_writable.js":66,"readable-stream/lib/internal/streams/end-of-stream.js":70,"readable-stream/lib/internal/streams/pipeline.js":72}],77:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
/*</replacement>*/

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte. If an invalid byte is detected, -2 is returned.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return byte >> 6 === 0x02 ? -1 : -2;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd';
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd';
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd';
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character is added when ending on a partial
// character.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd';
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":75}],78:[function(require,module,exports){
(function (global){(function (){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],79:[function(require,module,exports){
'use strict';

module.exports = function () {
  throw new Error(
    'ws does not work in the browser. Browser clients must use the native ' +
      'WebSocket object'
  );
};

},{}]},{},[1]);
