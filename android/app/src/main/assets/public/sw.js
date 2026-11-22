/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "25669248bb6c3dda6f82bfe91d3ceca3"
  }, {
    "url": "pwa-512x512.png",
    "revision": "25495a452921c75546f6c5682dec5e83"
  }, {
    "url": "pwa-192x192.png",
    "revision": "048fc31a864e4bcadbcc34719c60e630"
  }, {
    "url": "index.html",
    "revision": "3c8b908388cd062a50feb4f706df6741"
  }, {
    "url": "icon.svg",
    "revision": "201e4d5f52b642f8057c038e3b21582c"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "ecf0d444e3f5d819e205f41d2d07f404"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/index-RXlDcQbB.js",
    "revision": null
  }, {
    "url": "assets/index-Bz6fCZBI.css",
    "revision": null
  }, {
    "url": "assets/aistudio/image_cd6d00c9.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "ecf0d444e3f5d819e205f41d2d07f404"
  }, {
    "url": "icon.svg",
    "revision": "201e4d5f52b642f8057c038e3b21582c"
  }, {
    "url": "pwa-192x192.png",
    "revision": "048fc31a864e4bcadbcc34719c60e630"
  }, {
    "url": "pwa-512x512.png",
    "revision": "25495a452921c75546f6c5682dec5e83"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "25669248bb6c3dda6f82bfe91d3ceca3"
  }, {
    "url": "manifest.webmanifest",
    "revision": "4cdf0f9dc4974a044abd3696016fbd78"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
