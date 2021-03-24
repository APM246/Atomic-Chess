// Utility function that takes 2 objects and combines their keys giving preference to the options
function assignDefaults(options, defaults) {
    // Works even when options or defaults is null - { ...null } === {}
    return { ...defaults, ...options }
}

// Given a css selector (#id, .class) returns the first HTML element corresponding to the selector
function getElement(selector) {
    return document.querySelector(selector)
}

// Throws if condition is not satisfied
function assert(condition, message) {
    if (!condition) {
        throw new Error(message)
    }
}

// Returns a promise that resolves after a given number of milliseconds
function wait(milliseconds) {
    let promiseResolve = null
    const promise = new Promise((resolve, reject) => promiseResolve = resolve);
    setTimeout(() => promiseResolve(), milliseconds);
    return promise;
}
