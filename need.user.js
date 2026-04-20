// ==UserScript==
// @name         网页能力扩展
// @namespace    https://91官方.com/
// @version      1.1
// @description  让网页做到一些不可思议的功能
// @author       LWF
// @match        *://as5l.github.io/*
// @connect      *
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    
    const pendingRequests = new Map();
    const REQUEST_PREFIX = 'GM_PROXY_';
    
    window.addEventListener('message', function(event) {
        if (event.source !== window) return;
        
        const data = event.data;
        if (!data || !data.type || !data.type.startsWith(REQUEST_PREFIX)) return;
        
        switch(data.type) {
            case 'GM_PROXY_REQUEST':
                handleRequest(data, event);
                break;
            case 'GM_PROXY_ABORT':
                handleAbort(data);
                break;
        }
    });
    
    function handleRequest(data, event) {
        const requestId = data.requestId;
        
        const gmDetails = {
            method: data.method || 'GET',
            url: data.url,
            headers: data.headers || {},
            data: data.data,
            binary: data.binary,
            timeout: data.timeout,
            responseType: data.responseType,
            overrideMimeType: data.overrideMimeType,
            anonymous: data.anonymous,
            user: data.user,
            password: data.password
        };
        ['onload', 'onerror', 'ontimeout', 'onprogress', 'onreadystatechange'].forEach(evt => {
            if (data[evt]) {
                gmDetails[evt] = function(response) {
                    sendResponse(requestId, evt, response, data.responseType);
                };
            }
        });
        const requestObj = GM_xmlhttpRequest(gmDetails);
        pendingRequests.set(requestId, requestObj);
        
        window.postMessage({
            type: 'GM_PROXY_READY',
            requestId: requestId
        }, '*');
        
        function sendResponse(reqId, eventType, response, reqResponseType) {
            const responseData = {
                type: 'GM_PROXY_RESPONSE',
                requestId: reqId,
                eventType: eventType,
                response: {
                    status: response.status,
                    statusText: response.statusText,
                    finalUrl: response.finalUrl,
                    readyState: response.readyState,
                    responseHeaders: response.responseHeaders,
                    responseType: response.responseType
                }
            };
            if (reqResponseType !== 'arraybuffer' && reqResponseType !== 'blob') {
                responseData.response.responseText = response.responseText;
            }
            
            if (response.responseType === 'json' && response.responseText) {
                try {
                    responseData.response.response = JSON.parse(response.responseText);
                } catch(e) {
                    responseData.response.response = response.responseText;
                }
            } else {
                responseData.response.response = response.response;
            }
            
            window.postMessage(responseData, '*');
            if (['onload', 'onerror', 'ontimeout', 'onabort'].includes(eventType)) {
                pendingRequests.delete(reqId);
            }
        }
    }
    
    function handleAbort(data) {
        const requestObj = pendingRequests.get(data.requestId);
        if (requestObj && typeof requestObj.abort === 'function') {
            requestObj.abort();
            pendingRequests.delete(data.requestId);
            
            window.postMessage({
                type: 'GM_PROXY_ABORTED',
                requestId: data.requestId
            }, '*');
        }
    }
})();