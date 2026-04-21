// ==UserScript==
// @name         网页能力扩展
// @namespace    https://91官方.com/
// @version      1.2
// @description  做到一些不可思议的事
// @author       LWF
// @match        *://as5l.github.io/*
// @connect      *
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    const pendingRequests = new Map();

    document.addEventListener('BILI_GM_REQUEST', function(event) {
        const data = event.detail;
        if (!data || data.type !== 'GM_PROXY_REQUEST') return;
        
        const reqObj = GM_xmlhttpRequest({
            method: data.method || 'GET',
            url: data.url,
            headers: data.headers || {},
            data: data.data,
            responseType: data.responseType,
            onload: res => sendResponse(data.requestId, 'onload', res),
            onerror: res => sendResponse(data.requestId, 'onerror', res)
        });
        pendingRequests.set(data.requestId, reqObj);
    });

    document.addEventListener('BILI_GM_ABORT', function(event) {
        const data = event.detail;
        if (!data || !data.requestId) return;
        const reqObj = pendingRequests.get(data.requestId);
        if (reqObj && typeof reqObj.abort === 'function') {
            reqObj.abort();
            pendingRequests.delete(data.requestId);
        }
    });

    function sendResponse(reqId, eventType, response) {
        const resData = { status: response.status };
        if (response.responseType === 'arraybuffer' && response.response) {
            const blob = new Blob([response.response]);
            resData.blobUrl = URL.createObjectURL(blob);
        } else if (response.responseType === 'json' && response.responseText) {
            try { resData.response = JSON.parse(response.responseText); } 
            catch(e) { resData.response = response.responseText; }
        } else {
            resData.response = response.response;
        }

        document.dispatchEvent(new CustomEvent('BILI_GM_RESPONSE', {
            detail: { type: 'GM_PROXY_RESPONSE', requestId: reqId, eventType: eventType, response: resData }
        }));
        pendingRequests.delete(reqId);
    }
})();
