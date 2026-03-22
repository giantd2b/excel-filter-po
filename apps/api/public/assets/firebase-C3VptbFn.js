const la=()=>{};var Mr={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rs=function(i){const e=[];let t=0;for(let r=0;r<i.length;r++){let o=i.charCodeAt(r);o<128?e[t++]=o:o<2048?(e[t++]=o>>6|192,e[t++]=o&63|128):(o&64512)===55296&&r+1<i.length&&(i.charCodeAt(r+1)&64512)===56320?(o=65536+((o&1023)<<10)+(i.charCodeAt(++r)&1023),e[t++]=o>>18|240,e[t++]=o>>12&63|128,e[t++]=o>>6&63|128,e[t++]=o&63|128):(e[t++]=o>>12|224,e[t++]=o>>6&63|128,e[t++]=o&63|128)}return e},ua=function(i){const e=[];let t=0,r=0;for(;t<i.length;){const o=i[t++];if(o<128)e[r++]=String.fromCharCode(o);else if(o>191&&o<224){const c=i[t++];e[r++]=String.fromCharCode((o&31)<<6|c&63)}else if(o>239&&o<365){const c=i[t++],h=i[t++],y=i[t++],E=((o&7)<<18|(c&63)<<12|(h&63)<<6|y&63)-65536;e[r++]=String.fromCharCode(55296+(E>>10)),e[r++]=String.fromCharCode(56320+(E&1023))}else{const c=i[t++],h=i[t++];e[r++]=String.fromCharCode((o&15)<<12|(c&63)<<6|h&63)}}return e.join("")},ks={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(i,e){if(!Array.isArray(i))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let o=0;o<i.length;o+=3){const c=i[o],h=o+1<i.length,y=h?i[o+1]:0,E=o+2<i.length,v=E?i[o+2]:0,b=c>>2,A=(c&3)<<4|y>>4;let S=(y&15)<<2|v>>6,x=v&63;E||(x=64,h||(S=64)),r.push(t[b],t[A],t[S],t[x])}return r.join("")},encodeString(i,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(i):this.encodeByteArray(Rs(i),e)},decodeString(i,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(i):ua(this.decodeStringToByteArray(i,e))},decodeStringToByteArray(i,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let o=0;o<i.length;){const c=t[i.charAt(o++)],y=o<i.length?t[i.charAt(o)]:0;++o;const v=o<i.length?t[i.charAt(o)]:64;++o;const A=o<i.length?t[i.charAt(o)]:64;if(++o,c==null||y==null||v==null||A==null)throw new da;const S=c<<2|y>>4;if(r.push(S),v!==64){const x=y<<4&240|v>>2;if(r.push(x),A!==64){const L=v<<6&192|A;r.push(L)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let i=0;i<this.ENCODED_VALS.length;i++)this.byteToCharMap_[i]=this.ENCODED_VALS.charAt(i),this.charToByteMap_[this.byteToCharMap_[i]]=i,this.byteToCharMapWebSafe_[i]=this.ENCODED_VALS_WEBSAFE.charAt(i),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]]=i,i>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)]=i,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)]=i)}}};class da extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const fa=function(i){const e=Rs(i);return ks.encodeByteArray(e,!0)},_n=function(i){return fa(i).replace(/\./g,"")},Os=function(i){try{return ks.decodeString(i,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pa(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ga=()=>pa().__FIREBASE_DEFAULTS__,ma=()=>{if(typeof process>"u"||typeof Mr>"u")return;const i=Mr.__FIREBASE_DEFAULTS__;if(i)return JSON.parse(i)},_a=()=>{if(typeof document>"u")return;let i;try{i=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=i&&Os(i[1]);return e&&JSON.parse(e)},Ii=()=>{try{return la()||ga()||ma()||_a()}catch(i){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${i}`);return}},Ns=i=>{var e,t;return(t=(e=Ii())==null?void 0:e.emulatorHosts)==null?void 0:t[i]},ya=i=>{const e=Ns(i);if(!e)return;const t=e.lastIndexOf(":");if(t<=0||t+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const r=parseInt(e.substring(t+1),10);return e[0]==="["?[e.substring(1,t-1),r]:[e.substring(0,t),r]},Ds=()=>{var i;return(i=Ii())==null?void 0:i.config},Ls=i=>{var e;return(e=Ii())==null?void 0:e[`_${i}`]};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ia{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,r)=>{t?this.reject(t):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,r))}}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ht(i){try{return(i.startsWith("http://")||i.startsWith("https://")?new URL(i).hostname:i).endsWith(".cloudworkstations.dev")}catch{return!1}}async function Ms(i){return(await fetch(i,{credentials:"include"})).ok}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wa(i,e){if(i.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},r=e||"demo-project",o=i.iat||0,c=i.sub||i.user_id;if(!c)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const h={iss:`https://securetoken.google.com/${r}`,aud:r,iat:o,exp:o+3600,auth_time:o,sub:c,user_id:c,firebase:{sign_in_provider:"custom",identities:{}},...i};return[_n(JSON.stringify(t)),_n(JSON.stringify(h)),""].join(".")}const Nt={};function Ea(){const i={prod:[],emulator:[]};for(const e of Object.keys(Nt))Nt[e]?i.emulator.push(e):i.prod.push(e);return i}function va(i){let e=document.getElementById(i),t=!1;return e||(e=document.createElement("div"),e.setAttribute("id",i),t=!0),{created:t,element:e}}let Ur=!1;function Us(i,e){if(typeof window>"u"||typeof document>"u"||!Ht(window.location.host)||Nt[i]===e||Nt[i]||Ur)return;Nt[i]=e;function t(S){return`__firebase__banner__${S}`}const r="__firebase__banner",c=Ea().prod.length>0;function h(){const S=document.getElementById(r);S&&S.remove()}function y(S){S.style.display="flex",S.style.background="#7faaf0",S.style.position="fixed",S.style.bottom="5px",S.style.left="5px",S.style.padding=".5em",S.style.borderRadius="5px",S.style.alignItems="center"}function E(S,x){S.setAttribute("width","24"),S.setAttribute("id",x),S.setAttribute("height","24"),S.setAttribute("viewBox","0 0 24 24"),S.setAttribute("fill","none"),S.style.marginLeft="-6px"}function v(){const S=document.createElement("span");return S.style.cursor="pointer",S.style.marginLeft="16px",S.style.fontSize="24px",S.innerHTML=" &times;",S.onclick=()=>{Ur=!0,h()},S}function b(S,x){S.setAttribute("id",x),S.innerText="Learn more",S.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",S.setAttribute("target","__blank"),S.style.paddingLeft="5px",S.style.textDecoration="underline"}function A(){const S=va(r),x=t("text"),L=document.getElementById(x)||document.createElement("span"),F=t("learnmore"),U=document.getElementById(F)||document.createElement("a"),J=t("preprendIcon"),X=document.getElementById(J)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(S.created){const Y=S.element;y(Y),b(U,F);const Ie=v();E(X,J),Y.append(X,L,U,Ie),document.body.appendChild(Y)}c?(L.innerText="Preview backend disconnected.",X.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):(X.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,L.innerText="Preview backend running in this workspace."),L.setAttribute("id",x)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",A):A()}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function q(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function Ta(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(q())}function Sa(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function Aa(){const i=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof i=="object"&&i.id!==void 0}function ba(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function Ca(){const i=q();return i.indexOf("MSIE ")>=0||i.indexOf("Trident/")>=0}function Pa(){try{return typeof indexedDB=="object"}catch{return!1}}function Ra(){return new Promise((i,e)=>{try{let t=!0;const r="validate-browser-context-for-indexeddb-analytics-module",o=self.indexedDB.open(r);o.onsuccess=()=>{o.result.close(),t||self.indexedDB.deleteDatabase(r),i(!0)},o.onupgradeneeded=()=>{t=!1},o.onerror=()=>{var c;e(((c=o.error)==null?void 0:c.message)||"")}}catch(t){e(t)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ka="FirebaseError";class _e extends Error{constructor(e,t,r){super(t),this.code=e,this.customData=r,this.name=ka,Object.setPrototypeOf(this,_e.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,$t.prototype.create)}}class $t{constructor(e,t,r){this.service=e,this.serviceName=t,this.errors=r}create(e,...t){const r=t[0]||{},o=`${this.service}/${e}`,c=this.errors[e],h=c?Oa(c,r):"Error",y=`${this.serviceName}: ${h} (${o}).`;return new _e(o,y,r)}}function Oa(i,e){return i.replace(Na,(t,r)=>{const o=e[r];return o!=null?String(o):`<${r}?>`})}const Na=/\{\$([^}]+)}/g;function Da(i){for(const e in i)if(Object.prototype.hasOwnProperty.call(i,e))return!1;return!0}function Ke(i,e){if(i===e)return!0;const t=Object.keys(i),r=Object.keys(e);for(const o of t){if(!r.includes(o))return!1;const c=i[o],h=e[o];if(xr(c)&&xr(h)){if(!Ke(c,h))return!1}else if(c!==h)return!1}for(const o of r)if(!t.includes(o))return!1;return!0}function xr(i){return i!==null&&typeof i=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Wt(i){const e=[];for(const[t,r]of Object.entries(i))Array.isArray(r)?r.forEach(o=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(o))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}function kt(i){const e={};return i.replace(/^\?/,"").split("&").forEach(r=>{if(r){const[o,c]=r.split("=");e[decodeURIComponent(o)]=decodeURIComponent(c)}}),e}function Ot(i){const e=i.indexOf("?");if(!e)return"";const t=i.indexOf("#",e);return i.substring(e,t>0?t:void 0)}function La(i,e){const t=new Ma(i,e);return t.subscribe.bind(t)}class Ma{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,r){let o;if(e===void 0&&t===void 0&&r===void 0)throw new Error("Missing Observer.");Ua(e,["next","error","complete"])?o=e:o={next:e,error:t,complete:r},o.next===void 0&&(o.next=ti),o.error===void 0&&(o.error=ti),o.complete===void 0&&(o.complete=ti);const c=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?o.error(this.finalError):o.complete()}catch{}}),this.observers.push(o),c}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(r){typeof console<"u"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function Ua(i,e){if(typeof i!="object"||i===null)return!1;for(const t of e)if(t in i&&typeof i[t]=="function")return!0;return!1}function ti(){}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ye(i){return i&&i._delegate?i._delegate:i}class Je{constructor(e,t,r){this.name=e,this.instanceFactory=t,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $e="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xa{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const r=new Ia;if(this.instancesDeferred.set(t,r),this.isInitialized(t)||this.shouldAutoInitialize())try{const o=this.getOrInitializeService({instanceIdentifier:t});o&&r.resolve(o)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),r=(e==null?void 0:e.optional)??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(o){if(r)return null;throw o}else{if(r)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(Fa(e))try{this.getOrInitializeService({instanceIdentifier:$e})}catch{}for(const[t,r]of this.instancesDeferred.entries()){const o=this.normalizeInstanceIdentifier(t);try{const c=this.getOrInitializeService({instanceIdentifier:o});r.resolve(c)}catch{}}}}clearInstance(e=$e){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=$e){return this.instances.has(e)}getOptions(e=$e){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const o=this.getOrInitializeService({instanceIdentifier:r,options:t});for(const[c,h]of this.instancesDeferred.entries()){const y=this.normalizeInstanceIdentifier(c);r===y&&h.resolve(o)}return o}onInit(e,t){const r=this.normalizeInstanceIdentifier(t),o=this.onInitCallbacks.get(r)??new Set;o.add(e),this.onInitCallbacks.set(r,o);const c=this.instances.get(r);return c&&e(c,r),()=>{o.delete(e)}}invokeOnInitCallbacks(e,t){const r=this.onInitCallbacks.get(t);if(r)for(const o of r)try{o(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:Va(e),options:t}),this.instances.set(e,r),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=$e){return this.component?this.component.multipleInstances?e:$e:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function Va(i){return i===$e?void 0:i}function Fa(i){return i.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ja{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new xa(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var N;(function(i){i[i.DEBUG=0]="DEBUG",i[i.VERBOSE=1]="VERBOSE",i[i.INFO=2]="INFO",i[i.WARN=3]="WARN",i[i.ERROR=4]="ERROR",i[i.SILENT=5]="SILENT"})(N||(N={}));const Ba={debug:N.DEBUG,verbose:N.VERBOSE,info:N.INFO,warn:N.WARN,error:N.ERROR,silent:N.SILENT},Ha=N.INFO,$a={[N.DEBUG]:"log",[N.VERBOSE]:"log",[N.INFO]:"info",[N.WARN]:"warn",[N.ERROR]:"error"},Wa=(i,e,...t)=>{if(e<i.logLevel)return;const r=new Date().toISOString(),o=$a[e];if(o)console[o](`[${r}]  ${i.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class wi{constructor(e){this.name=e,this._logLevel=Ha,this._logHandler=Wa,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in N))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?Ba[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,N.DEBUG,...e),this._logHandler(this,N.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,N.VERBOSE,...e),this._logHandler(this,N.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,N.INFO,...e),this._logHandler(this,N.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,N.WARN,...e),this._logHandler(this,N.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,N.ERROR,...e),this._logHandler(this,N.ERROR,...e)}}const za=(i,e)=>e.some(t=>i instanceof t);let Vr,Fr;function Ga(){return Vr||(Vr=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function qa(){return Fr||(Fr=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const xs=new WeakMap,li=new WeakMap,Vs=new WeakMap,ni=new WeakMap,Ei=new WeakMap;function Ka(i){const e=new Promise((t,r)=>{const o=()=>{i.removeEventListener("success",c),i.removeEventListener("error",h)},c=()=>{t(Ne(i.result)),o()},h=()=>{r(i.error),o()};i.addEventListener("success",c),i.addEventListener("error",h)});return e.then(t=>{t instanceof IDBCursor&&xs.set(t,i)}).catch(()=>{}),Ei.set(e,i),e}function Ja(i){if(li.has(i))return;const e=new Promise((t,r)=>{const o=()=>{i.removeEventListener("complete",c),i.removeEventListener("error",h),i.removeEventListener("abort",h)},c=()=>{t(),o()},h=()=>{r(i.error||new DOMException("AbortError","AbortError")),o()};i.addEventListener("complete",c),i.addEventListener("error",h),i.addEventListener("abort",h)});li.set(i,e)}let ui={get(i,e,t){if(i instanceof IDBTransaction){if(e==="done")return li.get(i);if(e==="objectStoreNames")return i.objectStoreNames||Vs.get(i);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return Ne(i[e])},set(i,e,t){return i[e]=t,!0},has(i,e){return i instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in i}};function Xa(i){ui=i(ui)}function Ya(i){return i===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const r=i.call(ii(this),e,...t);return Vs.set(r,e.sort?e.sort():[e]),Ne(r)}:qa().includes(i)?function(...e){return i.apply(ii(this),e),Ne(xs.get(this))}:function(...e){return Ne(i.apply(ii(this),e))}}function Qa(i){return typeof i=="function"?Ya(i):(i instanceof IDBTransaction&&Ja(i),za(i,Ga())?new Proxy(i,ui):i)}function Ne(i){if(i instanceof IDBRequest)return Ka(i);if(ni.has(i))return ni.get(i);const e=Qa(i);return e!==i&&(ni.set(i,e),Ei.set(e,i)),e}const ii=i=>Ei.get(i);function Za(i,e,{blocked:t,upgrade:r,blocking:o,terminated:c}={}){const h=indexedDB.open(i,e),y=Ne(h);return r&&h.addEventListener("upgradeneeded",E=>{r(Ne(h.result),E.oldVersion,E.newVersion,Ne(h.transaction),E)}),t&&h.addEventListener("blocked",E=>t(E.oldVersion,E.newVersion,E)),y.then(E=>{c&&E.addEventListener("close",()=>c()),o&&E.addEventListener("versionchange",v=>o(v.oldVersion,v.newVersion,v))}).catch(()=>{}),y}const ec=["get","getKey","getAll","getAllKeys","count"],tc=["put","add","delete","clear"],ri=new Map;function jr(i,e){if(!(i instanceof IDBDatabase&&!(e in i)&&typeof e=="string"))return;if(ri.get(e))return ri.get(e);const t=e.replace(/FromIndex$/,""),r=e!==t,o=tc.includes(t);if(!(t in(r?IDBIndex:IDBObjectStore).prototype)||!(o||ec.includes(t)))return;const c=async function(h,...y){const E=this.transaction(h,o?"readwrite":"readonly");let v=E.store;return r&&(v=v.index(y.shift())),(await Promise.all([v[t](...y),o&&E.done]))[0]};return ri.set(e,c),c}Xa(i=>({...i,get:(e,t,r)=>jr(e,t)||i.get(e,t,r),has:(e,t)=>!!jr(e,t)||i.has(e,t)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nc{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(ic(t)){const r=t.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(t=>t).join(" ")}}function ic(i){const e=i.getComponent();return(e==null?void 0:e.type)==="VERSION"}const di="@firebase/app",Br="0.14.6";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ge=new wi("@firebase/app"),rc="@firebase/app-compat",sc="@firebase/analytics-compat",oc="@firebase/analytics",ac="@firebase/app-check-compat",cc="@firebase/app-check",hc="@firebase/auth",lc="@firebase/auth-compat",uc="@firebase/database",dc="@firebase/data-connect",fc="@firebase/database-compat",pc="@firebase/functions",gc="@firebase/functions-compat",mc="@firebase/installations",_c="@firebase/installations-compat",yc="@firebase/messaging",Ic="@firebase/messaging-compat",wc="@firebase/performance",Ec="@firebase/performance-compat",vc="@firebase/remote-config",Tc="@firebase/remote-config-compat",Sc="@firebase/storage",Ac="@firebase/storage-compat",bc="@firebase/firestore",Cc="@firebase/ai",Pc="@firebase/firestore-compat",Rc="firebase",kc="12.6.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fi="[DEFAULT]",Oc={[di]:"fire-core",[rc]:"fire-core-compat",[oc]:"fire-analytics",[sc]:"fire-analytics-compat",[cc]:"fire-app-check",[ac]:"fire-app-check-compat",[hc]:"fire-auth",[lc]:"fire-auth-compat",[uc]:"fire-rtdb",[dc]:"fire-data-connect",[fc]:"fire-rtdb-compat",[pc]:"fire-fn",[gc]:"fire-fn-compat",[mc]:"fire-iid",[_c]:"fire-iid-compat",[yc]:"fire-fcm",[Ic]:"fire-fcm-compat",[wc]:"fire-perf",[Ec]:"fire-perf-compat",[vc]:"fire-rc",[Tc]:"fire-rc-compat",[Sc]:"fire-gcs",[Ac]:"fire-gcs-compat",[bc]:"fire-fst",[Pc]:"fire-fst-compat",[Cc]:"fire-vertex","fire-js":"fire-js",[Rc]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xt=new Map,Nc=new Map,pi=new Map;function Hr(i,e){try{i.container.addComponent(e)}catch(t){ge.debug(`Component ${e.name} failed to register with FirebaseApp ${i.name}`,t)}}function ct(i){const e=i.name;if(pi.has(e))return ge.debug(`There were multiple attempts to register component ${e}.`),!1;pi.set(e,i);for(const t of xt.values())Hr(t,i);for(const t of Nc.values())Hr(t,i);return!0}function vi(i,e){const t=i.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),i.container.getProvider(e)}function te(i){return i==null?!1:i.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Dc={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},De=new $t("app","Firebase",Dc);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lc{constructor(e,t,r){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new Je("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw De.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ut=kc;function Mc(i,e={}){let t=i;typeof e!="object"&&(e={name:e});const r={name:fi,automaticDataCollectionEnabled:!0,...e},o=r.name;if(typeof o!="string"||!o)throw De.create("bad-app-name",{appName:String(o)});if(t||(t=Ds()),!t)throw De.create("no-options");const c=xt.get(o);if(c){if(Ke(t,c.options)&&Ke(r,c.config))return c;throw De.create("duplicate-app",{appName:o})}const h=new ja(o);for(const E of pi.values())h.addComponent(E);const y=new Lc(t,r,h);return xt.set(o,y),y}function Fs(i=fi){const e=xt.get(i);if(!e&&i===fi&&Ds())return Mc();if(!e)throw De.create("no-app",{appName:i});return e}function Mu(){return Array.from(xt.values())}function Le(i,e,t){let r=Oc[i]??i;t&&(r+=`-${t}`);const o=r.match(/\s|\//),c=e.match(/\s|\//);if(o||c){const h=[`Unable to register library "${r}" with version "${e}":`];o&&h.push(`library name "${r}" contains illegal characters (whitespace or "/")`),o&&c&&h.push("and"),c&&h.push(`version name "${e}" contains illegal characters (whitespace or "/")`),ge.warn(h.join(" "));return}ct(new Je(`${r}-version`,()=>({library:r,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Uc="firebase-heartbeat-database",xc=1,Vt="firebase-heartbeat-store";let si=null;function js(){return si||(si=Za(Uc,xc,{upgrade:(i,e)=>{switch(e){case 0:try{i.createObjectStore(Vt)}catch(t){console.warn(t)}}}}).catch(i=>{throw De.create("idb-open",{originalErrorMessage:i.message})})),si}async function Vc(i){try{const t=(await js()).transaction(Vt),r=await t.objectStore(Vt).get(Bs(i));return await t.done,r}catch(e){if(e instanceof _e)ge.warn(e.message);else{const t=De.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});ge.warn(t.message)}}}async function $r(i,e){try{const r=(await js()).transaction(Vt,"readwrite");await r.objectStore(Vt).put(e,Bs(i)),await r.done}catch(t){if(t instanceof _e)ge.warn(t.message);else{const r=De.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});ge.warn(r.message)}}}function Bs(i){return`${i.name}!${i.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fc=1024,jc=30;class Bc{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new $c(t),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,t;try{const o=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),c=Wr();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)==null?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===c||this._heartbeatsCache.heartbeats.some(h=>h.date===c))return;if(this._heartbeatsCache.heartbeats.push({date:c,agent:o}),this._heartbeatsCache.heartbeats.length>jc){const h=Wc(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(h,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(r){ge.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=Wr(),{heartbeatsToSend:r,unsentEntries:o}=Hc(this._heartbeatsCache.heartbeats),c=_n(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=t,o.length>0?(this._heartbeatsCache.heartbeats=o,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),c}catch(t){return ge.warn(t),""}}}function Wr(){return new Date().toISOString().substring(0,10)}function Hc(i,e=Fc){const t=[];let r=i.slice();for(const o of i){const c=t.find(h=>h.agent===o.agent);if(c){if(c.dates.push(o.date),zr(t)>e){c.dates.pop();break}}else if(t.push({agent:o.agent,dates:[o.date]}),zr(t)>e){t.pop();break}r=r.slice(1)}return{heartbeatsToSend:t,unsentEntries:r}}class $c{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Pa()?Ra().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await Vc(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return $r(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const r=await this.read();return $r(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??r.lastSentHeartbeatDate,heartbeats:[...r.heartbeats,...e.heartbeats]})}else return}}function zr(i){return _n(JSON.stringify({version:2,heartbeats:i})).length}function Wc(i){if(i.length===0)return-1;let e=0,t=i[0].date;for(let r=1;r<i.length;r++)i[r].date<t&&(t=i[r].date,e=r);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zc(i){ct(new Je("platform-logger",e=>new nc(e),"PRIVATE")),ct(new Je("heartbeat",e=>new Bc(e),"PRIVATE")),Le(di,Br,i),Le(di,Br,"esm2020"),Le("fire-js","")}zc("");function Hs(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const Gc=Hs,$s=new $t("auth","Firebase",Hs());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yn=new wi("@firebase/auth");function qc(i,...e){yn.logLevel<=N.WARN&&yn.warn(`Auth (${ut}): ${i}`,...e)}function dn(i,...e){yn.logLevel<=N.ERROR&&yn.error(`Auth (${ut}): ${i}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function re(i,...e){throw Ti(i,...e)}function le(i,...e){return Ti(i,...e)}function Ws(i,e,t){const r={...Gc(),[e]:t};return new $t("auth","Firebase",r).create(e,{appName:i.name})}function Me(i){return Ws(i,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function Ti(i,...e){if(typeof i!="string"){const t=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=i.name),i._errorFactory.create(t,...r)}return $s.create(i,...e)}function C(i,e,...t){if(!i)throw Ti(e,...t)}function fe(i){const e="INTERNAL ASSERTION FAILED: "+i;throw dn(e),new Error(e)}function me(i,e){i||fe(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function gi(){var i;return typeof self<"u"&&((i=self.location)==null?void 0:i.href)||""}function Kc(){return Gr()==="http:"||Gr()==="https:"}function Gr(){var i;return typeof self<"u"&&((i=self.location)==null?void 0:i.protocol)||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Jc(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(Kc()||Aa()||"connection"in navigator)?navigator.onLine:!0}function Xc(){if(typeof navigator>"u")return null;const i=navigator;return i.languages&&i.languages[0]||i.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zt{constructor(e,t){this.shortDelay=e,this.longDelay=t,me(t>e,"Short delay should be less than long delay!"),this.isMobile=Ta()||ba()}get(){return Jc()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Si(i,e){me(i.emulator,"Emulator should always be set here");const{url:t}=i.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zs{static initialize(e,t,r){this.fetchImpl=e,t&&(this.headersImpl=t),r&&(this.responseImpl=r)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;fe("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;fe("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;fe("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Yc={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Qc=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],Zc=new zt(3e4,6e4);function Qe(i,e){return i.tenantId&&!e.tenantId?{...e,tenantId:i.tenantId}:e}async function xe(i,e,t,r,o={}){return Gs(i,o,async()=>{let c={},h={};r&&(e==="GET"?h=r:c={body:JSON.stringify(r)});const y=Wt({key:i.config.apiKey,...h}).slice(1),E=await i._getAdditionalHeaders();E["Content-Type"]="application/json",i.languageCode&&(E["X-Firebase-Locale"]=i.languageCode);const v={method:e,headers:E,...c};return Sa()||(v.referrerPolicy="no-referrer"),i.emulatorConfig&&Ht(i.emulatorConfig.host)&&(v.credentials="include"),zs.fetch()(await qs(i,i.config.apiHost,t,y),v)})}async function Gs(i,e,t){i._canInitEmulator=!1;const r={...Yc,...e};try{const o=new th(i),c=await Promise.race([t(),o.promise]);o.clearNetworkTimeout();const h=await c.json();if("needConfirmation"in h)throw hn(i,"account-exists-with-different-credential",h);if(c.ok&&!("errorMessage"in h))return h;{const y=c.ok?h.errorMessage:h.error.message,[E,v]=y.split(" : ");if(E==="FEDERATED_USER_ID_ALREADY_LINKED")throw hn(i,"credential-already-in-use",h);if(E==="EMAIL_EXISTS")throw hn(i,"email-already-in-use",h);if(E==="USER_DISABLED")throw hn(i,"user-disabled",h);const b=r[E]||E.toLowerCase().replace(/[_\s]+/g,"-");if(v)throw Ws(i,b,v);re(i,b)}}catch(o){if(o instanceof _e)throw o;re(i,"network-request-failed",{message:String(o)})}}async function An(i,e,t,r,o={}){const c=await xe(i,e,t,r,o);return"mfaPendingCredential"in c&&re(i,"multi-factor-auth-required",{_serverResponse:c}),c}async function qs(i,e,t,r){const o=`${e}${t}?${r}`,c=i,h=c.config.emulator?Si(i.config,o):`${i.config.apiScheme}://${o}`;return Qc.includes(t)&&(await c._persistenceManagerAvailable,c._getPersistenceType()==="COOKIE")?c._getPersistence()._getFinalTarget(h).toString():h}function eh(i){switch(i){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class th{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,r)=>{this.timer=setTimeout(()=>r(le(this.auth,"network-request-failed")),Zc.get())})}}function hn(i,e,t){const r={appName:i.name};t.email&&(r.email=t.email),t.phoneNumber&&(r.phoneNumber=t.phoneNumber);const o=le(i,e,r);return o.customData._tokenResponse=t,o}function qr(i){return i!==void 0&&i.enterprise!==void 0}class nh{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return eh(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}async function ih(i,e){return xe(i,"GET","/v2/recaptchaConfig",Qe(i,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function rh(i,e){return xe(i,"POST","/v1/accounts:delete",e)}async function In(i,e){return xe(i,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Dt(i){if(i)try{const e=new Date(Number(i));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function sh(i,e=!1){const t=ye(i),r=await t.getIdToken(e),o=Ai(r);C(o&&o.exp&&o.auth_time&&o.iat,t.auth,"internal-error");const c=typeof o.firebase=="object"?o.firebase:void 0,h=c==null?void 0:c.sign_in_provider;return{claims:o,token:r,authTime:Dt(oi(o.auth_time)),issuedAtTime:Dt(oi(o.iat)),expirationTime:Dt(oi(o.exp)),signInProvider:h||null,signInSecondFactor:(c==null?void 0:c.sign_in_second_factor)||null}}function oi(i){return Number(i)*1e3}function Ai(i){const[e,t,r]=i.split(".");if(e===void 0||t===void 0||r===void 0)return dn("JWT malformed, contained fewer than 3 sections"),null;try{const o=Os(t);return o?JSON.parse(o):(dn("Failed to decode base64 JWT payload"),null)}catch(o){return dn("Caught error parsing JWT payload as JSON",o==null?void 0:o.toString()),null}}function Kr(i){const e=Ai(i);return C(e,"internal-error"),C(typeof e.exp<"u","internal-error"),C(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ft(i,e,t=!1){if(t)return e;try{return await e}catch(r){throw r instanceof _e&&oh(r)&&i.auth.currentUser===i&&await i.auth.signOut(),r}}function oh({code:i}){return i==="auth/user-disabled"||i==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ah{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;const r=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,r)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mi{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=Dt(this.lastLoginAt),this.creationTime=Dt(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function wn(i){var A;const e=i.auth,t=await i.getIdToken(),r=await Ft(i,In(e,{idToken:t}));C(r==null?void 0:r.users.length,e,"internal-error");const o=r.users[0];i._notifyReloadListener(o);const c=(A=o.providerUserInfo)!=null&&A.length?Ks(o.providerUserInfo):[],h=hh(i.providerData,c),y=i.isAnonymous,E=!(i.email&&o.passwordHash)&&!(h!=null&&h.length),v=y?E:!1,b={uid:o.localId,displayName:o.displayName||null,photoURL:o.photoUrl||null,email:o.email||null,emailVerified:o.emailVerified||!1,phoneNumber:o.phoneNumber||null,tenantId:o.tenantId||null,providerData:h,metadata:new mi(o.createdAt,o.lastLoginAt),isAnonymous:v};Object.assign(i,b)}async function ch(i){const e=ye(i);await wn(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function hh(i,e){return[...i.filter(r=>!e.some(o=>o.providerId===r.providerId)),...e]}function Ks(i){return i.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function lh(i,e){const t=await Gs(i,{},async()=>{const r=Wt({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:o,apiKey:c}=i.config,h=await qs(i,o,"/v1/token",`key=${c}`),y=await i._getAdditionalHeaders();y["Content-Type"]="application/x-www-form-urlencoded";const E={method:"POST",headers:y,body:r};return i.emulatorConfig&&Ht(i.emulatorConfig.host)&&(E.credentials="include"),zs.fetch()(h,E)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function uh(i,e){return xe(i,"POST","/v2/accounts:revokeToken",Qe(i,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rt{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){C(e.idToken,"internal-error"),C(typeof e.idToken<"u","internal-error"),C(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):Kr(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){C(e.length!==0,"internal-error");const t=Kr(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(C(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:r,refreshToken:o,expiresIn:c}=await lh(e,t);this.updateTokensAndExpiration(r,o,Number(c))}updateTokensAndExpiration(e,t,r){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,t){const{refreshToken:r,accessToken:o,expirationTime:c}=t,h=new rt;return r&&(C(typeof r=="string","internal-error",{appName:e}),h.refreshToken=r),o&&(C(typeof o=="string","internal-error",{appName:e}),h.accessToken=o),c&&(C(typeof c=="number","internal-error",{appName:e}),h.expirationTime=c),h}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new rt,this.toJSON())}_performRefresh(){return fe("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ce(i,e){C(typeof i=="string"||typeof i>"u","internal-error",{appName:e})}class ne{constructor({uid:e,auth:t,stsTokenManager:r,...o}){this.providerId="firebase",this.proactiveRefresh=new ah(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=r,this.accessToken=r.accessToken,this.displayName=o.displayName||null,this.email=o.email||null,this.emailVerified=o.emailVerified||!1,this.phoneNumber=o.phoneNumber||null,this.photoURL=o.photoURL||null,this.isAnonymous=o.isAnonymous||!1,this.tenantId=o.tenantId||null,this.providerData=o.providerData?[...o.providerData]:[],this.metadata=new mi(o.createdAt||void 0,o.lastLoginAt||void 0)}async getIdToken(e){const t=await Ft(this,this.stsTokenManager.getToken(this.auth,e));return C(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return sh(this,e)}reload(){return ch(this)}_assign(e){this!==e&&(C(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new ne({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){C(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),t&&await wn(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(te(this.auth.app))return Promise.reject(Me(this.auth));const e=await this.getIdToken();return await Ft(this,rh(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const r=t.displayName??void 0,o=t.email??void 0,c=t.phoneNumber??void 0,h=t.photoURL??void 0,y=t.tenantId??void 0,E=t._redirectEventId??void 0,v=t.createdAt??void 0,b=t.lastLoginAt??void 0,{uid:A,emailVerified:S,isAnonymous:x,providerData:L,stsTokenManager:F}=t;C(A&&F,e,"internal-error");const U=rt.fromJSON(this.name,F);C(typeof A=="string",e,"internal-error"),Ce(r,e.name),Ce(o,e.name),C(typeof S=="boolean",e,"internal-error"),C(typeof x=="boolean",e,"internal-error"),Ce(c,e.name),Ce(h,e.name),Ce(y,e.name),Ce(E,e.name),Ce(v,e.name),Ce(b,e.name);const J=new ne({uid:A,auth:e,email:o,emailVerified:S,displayName:r,isAnonymous:x,photoURL:h,phoneNumber:c,tenantId:y,stsTokenManager:U,createdAt:v,lastLoginAt:b});return L&&Array.isArray(L)&&(J.providerData=L.map(X=>({...X}))),E&&(J._redirectEventId=E),J}static async _fromIdTokenResponse(e,t,r=!1){const o=new rt;o.updateFromServerResponse(t);const c=new ne({uid:t.localId,auth:e,stsTokenManager:o,isAnonymous:r});return await wn(c),c}static async _fromGetAccountInfoResponse(e,t,r){const o=t.users[0];C(o.localId!==void 0,"internal-error");const c=o.providerUserInfo!==void 0?Ks(o.providerUserInfo):[],h=!(o.email&&o.passwordHash)&&!(c!=null&&c.length),y=new rt;y.updateFromIdToken(r);const E=new ne({uid:o.localId,auth:e,stsTokenManager:y,isAnonymous:h}),v={uid:o.localId,displayName:o.displayName||null,photoURL:o.photoUrl||null,email:o.email||null,emailVerified:o.emailVerified||!1,phoneNumber:o.phoneNumber||null,tenantId:o.tenantId||null,providerData:c,metadata:new mi(o.createdAt,o.lastLoginAt),isAnonymous:!(o.email&&o.passwordHash)&&!(c!=null&&c.length)};return Object.assign(E,v),E}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Jr=new Map;function pe(i){me(i instanceof Function,"Expected a class definition");let e=Jr.get(i);return e?(me(e instanceof i,"Instance stored in cache mismatched with class"),e):(e=new i,Jr.set(i,e),e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Js{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}Js.type="NONE";const Xr=Js;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function fn(i,e,t){return`firebase:${i}:${e}:${t}`}class st{constructor(e,t,r){this.persistence=e,this.auth=t,this.userKey=r;const{config:o,name:c}=this.auth;this.fullUserKey=fn(this.userKey,o.apiKey,c),this.fullPersistenceKey=fn("persistence",o.apiKey,c),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await In(this.auth,{idToken:e}).catch(()=>{});return t?ne._fromGetAccountInfoResponse(this.auth,t,e):null}return ne._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,r="authUser"){if(!t.length)return new st(pe(Xr),e,r);const o=(await Promise.all(t.map(async v=>{if(await v._isAvailable())return v}))).filter(v=>v);let c=o[0]||pe(Xr);const h=fn(r,e.config.apiKey,e.name);let y=null;for(const v of t)try{const b=await v._get(h);if(b){let A;if(typeof b=="string"){const S=await In(e,{idToken:b}).catch(()=>{});if(!S)break;A=await ne._fromGetAccountInfoResponse(e,S,b)}else A=ne._fromJSON(e,b);v!==c&&(y=A),c=v;break}}catch{}const E=o.filter(v=>v._shouldAllowMigration);return!c._shouldAllowMigration||!E.length?new st(c,e,r):(c=E[0],y&&await c._set(h,y.toJSON()),await Promise.all(t.map(async v=>{if(v!==c)try{await v._remove(h)}catch{}})),new st(c,e,r))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Yr(i){const e=i.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(Zs(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(Xs(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(to(e))return"Blackberry";if(no(e))return"Webos";if(Ys(e))return"Safari";if((e.includes("chrome/")||Qs(e))&&!e.includes("edge/"))return"Chrome";if(eo(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=i.match(t);if((r==null?void 0:r.length)===2)return r[1]}return"Other"}function Xs(i=q()){return/firefox\//i.test(i)}function Ys(i=q()){const e=i.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function Qs(i=q()){return/crios\//i.test(i)}function Zs(i=q()){return/iemobile/i.test(i)}function eo(i=q()){return/android/i.test(i)}function to(i=q()){return/blackberry/i.test(i)}function no(i=q()){return/webos/i.test(i)}function bi(i=q()){return/iphone|ipad|ipod/i.test(i)||/macintosh/i.test(i)&&/mobile/i.test(i)}function dh(i=q()){var e;return bi(i)&&!!((e=window.navigator)!=null&&e.standalone)}function fh(){return Ca()&&document.documentMode===10}function io(i=q()){return bi(i)||eo(i)||no(i)||to(i)||/windows phone/i.test(i)||Zs(i)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ro(i,e=[]){let t;switch(i){case"Browser":t=Yr(q());break;case"Worker":t=`${Yr(q())}-${i}`;break;default:t=i}const r=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${ut}/${r}`}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ph{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const r=c=>new Promise((h,y)=>{try{const E=e(c);h(E)}catch(E){y(E)}});r.onAbort=t,this.queue.push(r);const o=this.queue.length-1;return()=>{this.queue[o]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const r of this.queue)await r(e),r.onAbort&&t.push(r.onAbort)}catch(r){t.reverse();for(const o of t)try{o()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r==null?void 0:r.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function gh(i,e={}){return xe(i,"GET","/v2/passwordPolicy",Qe(i,e))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const mh=6;class _h{constructor(e){var r;const t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??mh,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=((r=e.allowedNonAlphanumericCharacters)==null?void 0:r.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const r=this.customStrengthOptions.minPasswordLength,o=this.customStrengthOptions.maxPasswordLength;r&&(t.meetsMinPasswordLength=e.length>=r),o&&(t.meetsMaxPasswordLength=e.length<=o)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let r;for(let o=0;o<e.length;o++)r=e.charAt(o),this.updatePasswordCharacterOptionsStatuses(t,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,t,r,o,c){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=o)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=c))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yh{constructor(e,t,r,o){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=r,this.config=o,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Qr(this),this.idTokenSubscription=new Qr(this),this.beforeStateQueue=new ph(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=$s,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=o.sdkClientVersion,this._persistenceManagerAvailable=new Promise(c=>this._resolvePersistenceManagerAvailable=c)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=pe(t)),this._initializationPromise=this.queue(async()=>{var r,o,c;if(!this._deleted&&(this.persistenceManager=await st.create(this,e),(r=this._resolvePersistenceManagerAvailable)==null||r.call(this),!this._deleted)){if((o=this._popupRedirectResolver)!=null&&o._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=((c=this.currentUser)==null?void 0:c.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await In(this,{idToken:e}),r=await ne._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(r)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var c;if(te(this.app)){const h=this.app.settings.authIdToken;return h?new Promise(y=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(h).then(y,y))}):this.directlySetCurrentUser(null)}const t=await this.assertedPersistence.getCurrentUser();let r=t,o=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const h=(c=this.redirectUser)==null?void 0:c._redirectEventId,y=r==null?void 0:r._redirectEventId,E=await this.tryRedirectSignIn(e);(!h||h===y)&&(E!=null&&E.user)&&(r=E.user,o=!0)}if(!r)return this.directlySetCurrentUser(null);if(!r._redirectEventId){if(o)try{await this.beforeStateQueue.runMiddleware(r)}catch(h){r=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(h))}return r?this.reloadAndSetCurrentUserOrClear(r):this.directlySetCurrentUser(null)}return C(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===r._redirectEventId?this.directlySetCurrentUser(r):this.reloadAndSetCurrentUserOrClear(r)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await wn(e)}catch(t){if((t==null?void 0:t.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=Xc()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(te(this.app))return Promise.reject(Me(this));const t=e?ye(e):null;return t&&C(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&C(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return te(this.app)?Promise.reject(Me(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return te(this.app)?Promise.reject(Me(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(pe(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await gh(this),t=new _h(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new $t("auth","Firebase",e())}onAuthStateChanged(e,t,r){return this.registerStateListener(this.authStateSubscription,e,t,r)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,r){return this.registerStateListener(this.idTokenSubscription,e,t,r)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const r=this.onAuthStateChanged(()=>{r(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(r.tenantId=this.tenantId),await uh(this,r)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)==null?void 0:e.toJSON()}}async _setRedirectUser(e,t){const r=await this.getOrInitRedirectPersistenceManager(t);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&pe(e)||this._popupRedirectResolver;C(t,this,"argument-error"),this.redirectPersistenceManager=await st.create(this,[pe(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,r;return this._isInitialized&&await this.queue(async()=>{}),((t=this._currentUser)==null?void 0:t._redirectEventId)===e?this._currentUser:((r=this.redirectUser)==null?void 0:r._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=((t=this.currentUser)==null?void 0:t.uid)??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,r,o){if(this._deleted)return()=>{};const c=typeof t=="function"?t:t.next.bind(t);let h=!1;const y=this._isInitialized?Promise.resolve():this._initializationPromise;if(C(y,this,"internal-error"),y.then(()=>{h||c(this.currentUser)}),typeof t=="function"){const E=e.addObserver(t,r,o);return()=>{h=!0,E()}}else{const E=e.addObserver(t);return()=>{h=!0,E()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return C(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=ro(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var o;const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const t=await((o=this.heartbeatServiceProvider.getImmediate({optional:!0}))==null?void 0:o.getHeartbeatsHeader());t&&(e["X-Firebase-Client"]=t);const r=await this._getAppCheckToken();return r&&(e["X-Firebase-AppCheck"]=r),e}async _getAppCheckToken(){var t;if(te(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await((t=this.appCheckServiceProvider.getImmediate({optional:!0}))==null?void 0:t.getToken());return e!=null&&e.error&&qc(`Error while retrieving App Check token: ${e.error}`),e==null?void 0:e.token}}function dt(i){return ye(i)}class Qr{constructor(e){this.auth=e,this.observer=null,this.addObserver=La(t=>this.observer=t)}get next(){return C(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let bn={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function Ih(i){bn=i}function so(i){return bn.loadJS(i)}function wh(){return bn.recaptchaEnterpriseScript}function Eh(){return bn.gapiScript}function vh(i){return`__${i}${Math.floor(Math.random()*1e6)}`}class Th{constructor(){this.enterprise=new Sh}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class Sh{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}const Ah="recaptcha-enterprise",oo="NO_RECAPTCHA";class bh{constructor(e){this.type=Ah,this.auth=dt(e)}async verify(e="verify",t=!1){async function r(c){if(!t){if(c.tenantId==null&&c._agentRecaptchaConfig!=null)return c._agentRecaptchaConfig.siteKey;if(c.tenantId!=null&&c._tenantRecaptchaConfigs[c.tenantId]!==void 0)return c._tenantRecaptchaConfigs[c.tenantId].siteKey}return new Promise(async(h,y)=>{ih(c,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(E=>{if(E.recaptchaKey===void 0)y(new Error("recaptcha Enterprise site key undefined"));else{const v=new nh(E);return c.tenantId==null?c._agentRecaptchaConfig=v:c._tenantRecaptchaConfigs[c.tenantId]=v,h(v.siteKey)}}).catch(E=>{y(E)})})}function o(c,h,y){const E=window.grecaptcha;qr(E)?E.enterprise.ready(()=>{E.enterprise.execute(c,{action:e}).then(v=>{h(v)}).catch(()=>{h(oo)})}):y(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new Th().execute("siteKey",{action:"verify"}):new Promise((c,h)=>{r(this.auth).then(y=>{if(!t&&qr(window.grecaptcha))o(y,c,h);else{if(typeof window>"u"){h(new Error("RecaptchaVerifier is only supported in browser"));return}let E=wh();E.length!==0&&(E+=y),so(E).then(()=>{o(y,c,h)}).catch(v=>{h(v)})}}).catch(y=>{h(y)})})}}async function Zr(i,e,t,r=!1,o=!1){const c=new bh(i);let h;if(o)h=oo;else try{h=await c.verify(t)}catch{h=await c.verify(t,!0)}const y={...e};if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in y){const E=y.phoneEnrollmentInfo.phoneNumber,v=y.phoneEnrollmentInfo.recaptchaToken;Object.assign(y,{phoneEnrollmentInfo:{phoneNumber:E,recaptchaToken:v,captchaResponse:h,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in y){const E=y.phoneSignInInfo.recaptchaToken;Object.assign(y,{phoneSignInInfo:{recaptchaToken:E,captchaResponse:h,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return y}return r?Object.assign(y,{captchaResp:h}):Object.assign(y,{captchaResponse:h}),Object.assign(y,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(y,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),y}async function es(i,e,t,r,o){var c;if((c=i._getRecaptchaConfig())!=null&&c.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const h=await Zr(i,e,t,t==="getOobCode");return r(i,h)}else return r(i,e).catch(async h=>{if(h.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const y=await Zr(i,e,t,t==="getOobCode");return r(i,y)}else return Promise.reject(h)})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ch(i,e){const t=vi(i,"auth");if(t.isInitialized()){const o=t.getImmediate(),c=t.getOptions();if(Ke(c,e??{}))return o;re(o,"already-initialized")}return t.initialize({options:e})}function Ph(i,e){const t=(e==null?void 0:e.persistence)||[],r=(Array.isArray(t)?t:[t]).map(pe);e!=null&&e.errorMap&&i._updateErrorMap(e.errorMap),i._initializeWithPersistence(r,e==null?void 0:e.popupRedirectResolver)}function Rh(i,e,t){const r=dt(i);C(/^https?:\/\//.test(e),r,"invalid-emulator-scheme");const o=!1,c=ao(e),{host:h,port:y}=kh(e),E=y===null?"":`:${y}`,v={url:`${c}//${h}${E}/`},b=Object.freeze({host:h,port:y,protocol:c.replace(":",""),options:Object.freeze({disableWarnings:o})});if(!r._canInitEmulator){C(r.config.emulator&&r.emulatorConfig,r,"emulator-config-failed"),C(Ke(v,r.config.emulator)&&Ke(b,r.emulatorConfig),r,"emulator-config-failed");return}r.config.emulator=v,r.emulatorConfig=b,r.settings.appVerificationDisabledForTesting=!0,Ht(h)?(Ms(`${c}//${h}${E}`),Us("Auth",!0)):Oh()}function ao(i){const e=i.indexOf(":");return e<0?"":i.substr(0,e+1)}function kh(i){const e=ao(i),t=/(\/\/)?([^?#/]+)/.exec(i.substr(e.length));if(!t)return{host:"",port:null};const r=t[2].split("@").pop()||"",o=/^(\[[^\]]+\])(:|$)/.exec(r);if(o){const c=o[1];return{host:c,port:ts(r.substr(c.length+1))}}else{const[c,h]=r.split(":");return{host:c,port:ts(h)}}}function ts(i){if(!i)return null;const e=Number(i);return isNaN(e)?null:e}function Oh(){function i(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",i):i())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ci{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return fe("not implemented")}_getIdTokenResponse(e){return fe("not implemented")}_linkToIdToken(e,t){return fe("not implemented")}_getReauthenticationResolver(e){return fe("not implemented")}}async function Nh(i,e){return xe(i,"POST","/v1/accounts:signUp",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Dh(i,e){return An(i,"POST","/v1/accounts:signInWithPassword",Qe(i,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Lh(i,e){return An(i,"POST","/v1/accounts:signInWithEmailLink",Qe(i,e))}async function Mh(i,e){return An(i,"POST","/v1/accounts:signInWithEmailLink",Qe(i,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jt extends Ci{constructor(e,t,r,o=null){super("password",r),this._email=e,this._password=t,this._tenantId=o}static _fromEmailAndPassword(e,t){return new jt(e,t,"password")}static _fromEmailAndCode(e,t,r=null){return new jt(e,t,"emailLink",r)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;if(t!=null&&t.email&&(t!=null&&t.password)){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return es(e,t,"signInWithPassword",Dh);case"emailLink":return Lh(e,{email:this._email,oobCode:this._password});default:re(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":const r={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return es(e,r,"signUpPassword",Nh);case"emailLink":return Mh(e,{idToken:t,email:this._email,oobCode:this._password});default:re(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ot(i,e){return An(i,"POST","/v1/accounts:signInWithIdp",Qe(i,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Uh="http://localhost";class Xe extends Ci{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new Xe(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):re("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:o,...c}=t;if(!r||!o)return null;const h=new Xe(r,o);return h.idToken=c.idToken||void 0,h.accessToken=c.accessToken||void 0,h.secret=c.secret,h.nonce=c.nonce,h.pendingToken=c.pendingToken||null,h}_getIdTokenResponse(e){const t=this.buildRequest();return ot(e,t)}_linkToIdToken(e,t){const r=this.buildRequest();return r.idToken=t,ot(e,r)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,ot(e,t)}buildRequest(){const e={requestUri:Uh,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=Wt(t)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xh(i){switch(i){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function Vh(i){const e=kt(Ot(i)).link,t=e?kt(Ot(e)).deep_link_id:null,r=kt(Ot(i)).deep_link_id;return(r?kt(Ot(r)).link:null)||r||t||e||i}class Pi{constructor(e){const t=kt(Ot(e)),r=t.apiKey??null,o=t.oobCode??null,c=xh(t.mode??null);C(r&&o&&c,"argument-error"),this.apiKey=r,this.operation=c,this.code=o,this.continueUrl=t.continueUrl??null,this.languageCode=t.lang??null,this.tenantId=t.tenantId??null}static parseLink(e){const t=Vh(e);try{return new Pi(t)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ft{constructor(){this.providerId=ft.PROVIDER_ID}static credential(e,t){return jt._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){const r=Pi.parseLink(t);return C(r,"argument-error"),jt._fromEmailAndCode(e,r.code,r.tenantId)}}ft.PROVIDER_ID="password";ft.EMAIL_PASSWORD_SIGN_IN_METHOD="password";ft.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class co{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gt extends co{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pe extends Gt{constructor(){super("facebook.com")}static credential(e){return Xe._fromParams({providerId:Pe.PROVIDER_ID,signInMethod:Pe.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Pe.credentialFromTaggedObject(e)}static credentialFromError(e){return Pe.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Pe.credential(e.oauthAccessToken)}catch{return null}}}Pe.FACEBOOK_SIGN_IN_METHOD="facebook.com";Pe.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Re extends Gt{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Xe._fromParams({providerId:Re.PROVIDER_ID,signInMethod:Re.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return Re.credentialFromTaggedObject(e)}static credentialFromError(e){return Re.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:r}=e;if(!t&&!r)return null;try{return Re.credential(t,r)}catch{return null}}}Re.GOOGLE_SIGN_IN_METHOD="google.com";Re.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ke extends Gt{constructor(){super("github.com")}static credential(e){return Xe._fromParams({providerId:ke.PROVIDER_ID,signInMethod:ke.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return ke.credentialFromTaggedObject(e)}static credentialFromError(e){return ke.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return ke.credential(e.oauthAccessToken)}catch{return null}}}ke.GITHUB_SIGN_IN_METHOD="github.com";ke.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Oe extends Gt{constructor(){super("twitter.com")}static credential(e,t){return Xe._fromParams({providerId:Oe.PROVIDER_ID,signInMethod:Oe.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return Oe.credentialFromTaggedObject(e)}static credentialFromError(e){return Oe.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:r}=e;if(!t||!r)return null;try{return Oe.credential(t,r)}catch{return null}}}Oe.TWITTER_SIGN_IN_METHOD="twitter.com";Oe.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ht{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,r,o=!1){const c=await ne._fromIdTokenResponse(e,r,o),h=ns(r);return new ht({user:c,providerId:h,_tokenResponse:r,operationType:t})}static async _forOperation(e,t,r){await e._updateTokensIfNecessary(r,!0);const o=ns(r);return new ht({user:e,providerId:o,_tokenResponse:r,operationType:t})}}function ns(i){return i.providerId?i.providerId:"phoneNumber"in i?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class En extends _e{constructor(e,t,r,o){super(t.code,t.message),this.operationType=r,this.user=o,Object.setPrototypeOf(this,En.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,t,r,o){return new En(e,t,r,o)}}function ho(i,e,t,r){return(e==="reauthenticate"?t._getReauthenticationResolver(i):t._getIdTokenResponse(i)).catch(c=>{throw c.code==="auth/multi-factor-auth-required"?En._fromErrorAndOperation(i,c,e,r):c})}async function Fh(i,e,t=!1){const r=await Ft(i,e._linkToIdToken(i.auth,await i.getIdToken()),t);return ht._forOperation(i,"link",r)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function jh(i,e,t=!1){const{auth:r}=i;if(te(r.app))return Promise.reject(Me(r));const o="reauthenticate";try{const c=await Ft(i,ho(r,o,e,i),t);C(c.idToken,r,"internal-error");const h=Ai(c.idToken);C(h,r,"internal-error");const{sub:y}=h;return C(i.uid===y,r,"user-mismatch"),ht._forOperation(i,o,c)}catch(c){throw(c==null?void 0:c.code)==="auth/user-not-found"&&re(r,"user-mismatch"),c}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function lo(i,e,t=!1){if(te(i.app))return Promise.reject(Me(i));const r="signIn",o=await ho(i,r,e),c=await ht._fromIdTokenResponse(i,r,o);return t||await i._updateCurrentUser(c.user),c}async function Bh(i,e){return lo(dt(i),e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Hh(i){const e=dt(i);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}function Uu(i,e,t){return te(i.app)?Promise.reject(Me(i)):Bh(ye(i),ft.credential(e,t)).catch(async r=>{throw r.code==="auth/password-does-not-meet-requirements"&&Hh(i),r})}function $h(i,e,t,r){return ye(i).onIdTokenChanged(e,t,r)}function Wh(i,e,t){return ye(i).beforeAuthStateChanged(e,t)}function xu(i,e,t,r){return ye(i).onAuthStateChanged(e,t,r)}function Vu(i){return ye(i).signOut()}const vn="__sak";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uo{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(vn,"1"),this.storage.removeItem(vn),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zh=1e3,Gh=10;class fo extends uo{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=io(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const r=this.storage.getItem(t),o=this.localCache[t];r!==o&&e(t,o,r)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((h,y,E)=>{this.notifyListeners(h,E)});return}const r=e.key;t?this.detachListener():this.stopPolling();const o=()=>{const h=this.storage.getItem(r);!t&&this.localCache[r]===h||this.notifyListeners(r,h)},c=this.storage.getItem(r);fh()&&c!==e.newValue&&e.newValue!==e.oldValue?setTimeout(o,Gh):o()}notifyListeners(e,t){this.localCache[e]=t;const r=this.listeners[e];if(r)for(const o of Array.from(r))o(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:r}),!0)})},zh)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}fo.type="LOCAL";const qh=fo;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class po extends uo{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}po.type="SESSION";const go=po;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Kh(i){return Promise.all(i.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cn{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(o=>o.isListeningto(e));if(t)return t;const r=new Cn(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:r,eventType:o,data:c}=t.data,h=this.handlersMap[o];if(!(h!=null&&h.size))return;t.ports[0].postMessage({status:"ack",eventId:r,eventType:o});const y=Array.from(h).map(async v=>v(t.origin,c)),E=await Kh(y);t.ports[0].postMessage({status:"done",eventId:r,eventType:o,response:E})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}Cn.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ri(i="",e=10){let t="";for(let r=0;r<e;r++)t+=Math.floor(Math.random()*10);return i+t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jh{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,r=50){const o=typeof MessageChannel<"u"?new MessageChannel:null;if(!o)throw new Error("connection_unavailable");let c,h;return new Promise((y,E)=>{const v=Ri("",20);o.port1.start();const b=setTimeout(()=>{E(new Error("unsupported_event"))},r);h={messageChannel:o,onMessage(A){const S=A;if(S.data.eventId===v)switch(S.data.status){case"ack":clearTimeout(b),c=setTimeout(()=>{E(new Error("timeout"))},3e3);break;case"done":clearTimeout(c),y(S.data.response);break;default:clearTimeout(b),clearTimeout(c),E(new Error("invalid_response"));break}}},this.handlers.add(h),o.port1.addEventListener("message",h.onMessage),this.target.postMessage({eventType:e,eventId:v,data:t},[o.port2])}).finally(()=>{h&&this.removeMessageHandler(h)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ue(){return window}function Xh(i){ue().location.href=i}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function mo(){return typeof ue().WorkerGlobalScope<"u"&&typeof ue().importScripts=="function"}async function Yh(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function Qh(){var i;return((i=navigator==null?void 0:navigator.serviceWorker)==null?void 0:i.controller)||null}function Zh(){return mo()?self:null}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _o="firebaseLocalStorageDb",el=1,Tn="firebaseLocalStorage",yo="fbase_key";class qt{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function Pn(i,e){return i.transaction([Tn],e?"readwrite":"readonly").objectStore(Tn)}function tl(){const i=indexedDB.deleteDatabase(_o);return new qt(i).toPromise()}function _i(){const i=indexedDB.open(_o,el);return new Promise((e,t)=>{i.addEventListener("error",()=>{t(i.error)}),i.addEventListener("upgradeneeded",()=>{const r=i.result;try{r.createObjectStore(Tn,{keyPath:yo})}catch(o){t(o)}}),i.addEventListener("success",async()=>{const r=i.result;r.objectStoreNames.contains(Tn)?e(r):(r.close(),await tl(),e(await _i()))})})}async function is(i,e,t){const r=Pn(i,!0).put({[yo]:e,value:t});return new qt(r).toPromise()}async function nl(i,e){const t=Pn(i,!1).get(e),r=await new qt(t).toPromise();return r===void 0?null:r.value}function rs(i,e){const t=Pn(i,!0).delete(e);return new qt(t).toPromise()}const il=800,rl=3;class Io{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await _i(),this.db)}async _withRetries(e){let t=0;for(;;)try{const r=await this._openDb();return await e(r)}catch(r){if(t++>rl)throw r;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return mo()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=Cn._getInstance(Zh()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var t,r;if(this.activeServiceWorker=await Yh(),!this.activeServiceWorker)return;this.sender=new Jh(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&(t=e[0])!=null&&t.fulfilled&&(r=e[0])!=null&&r.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||Qh()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await _i();return await is(e,vn,"1"),await rs(e,vn),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(r=>is(r,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(r=>nl(r,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>rs(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(o=>{const c=Pn(o,!1).getAll();return new qt(c).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],r=new Set;if(e.length!==0)for(const{fbase_key:o,value:c}of e)r.add(o),JSON.stringify(this.localCache[o])!==JSON.stringify(c)&&(this.notifyListeners(o,c),t.push(o));for(const o of Object.keys(this.localCache))this.localCache[o]&&!r.has(o)&&(this.notifyListeners(o,null),t.push(o));return t}notifyListeners(e,t){this.localCache[e]=t;const r=this.listeners[e];if(r)for(const o of Array.from(r))o(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),il)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}Io.type="LOCAL";const sl=Io;new zt(3e4,6e4);/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ol(i,e){return e?pe(e):(C(i._popupRedirectResolver,i,"argument-error"),i._popupRedirectResolver)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ki extends Ci{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return ot(e,this._buildIdpRequest())}_linkToIdToken(e,t){return ot(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return ot(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function al(i){return lo(i.auth,new ki(i),i.bypassAuthState)}function cl(i){const{auth:e,user:t}=i;return C(t,e,"internal-error"),jh(t,new ki(i),i.bypassAuthState)}async function hl(i){const{auth:e,user:t}=i;return C(t,e,"internal-error"),Fh(t,new ki(i),i.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wo{constructor(e,t,r,o,c=!1){this.auth=e,this.resolver=r,this.user=o,this.bypassAuthState=c,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:r,postBody:o,tenantId:c,error:h,type:y}=e;if(h){this.reject(h);return}const E={auth:this.auth,requestUri:t,sessionId:r,tenantId:c||void 0,postBody:o||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(y)(E))}catch(v){this.reject(v)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return al;case"linkViaPopup":case"linkViaRedirect":return hl;case"reauthViaPopup":case"reauthViaRedirect":return cl;default:re(this.auth,"internal-error")}}resolve(e){me(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){me(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ll=new zt(2e3,1e4);class it extends wo{constructor(e,t,r,o,c){super(e,t,o,c),this.provider=r,this.authWindow=null,this.pollId=null,it.currentPopupAction&&it.currentPopupAction.cancel(),it.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return C(e,this.auth,"internal-error"),e}async onExecution(){me(this.filter.length===1,"Popup operations only handle one event");const e=Ri();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(le(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)==null?void 0:e.associatedEvent)||null}cancel(){this.reject(le(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,it.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,r;if((r=(t=this.authWindow)==null?void 0:t.window)!=null&&r.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(le(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,ll.get())};e()}}it.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ul="pendingRedirect",pn=new Map;class dl extends wo{constructor(e,t,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,r),this.eventId=null}async execute(){let e=pn.get(this.auth._key());if(!e){try{const r=await fl(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(t){e=()=>Promise.reject(t)}pn.set(this.auth._key(),e)}return this.bypassAuthState||pn.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function fl(i,e){const t=ml(e),r=gl(i);if(!await r._isAvailable())return!1;const o=await r._get(t)==="true";return await r._remove(t),o}function pl(i,e){pn.set(i._key(),e)}function gl(i){return pe(i._redirectPersistence)}function ml(i){return fn(ul,i.config.apiKey,i.name)}async function _l(i,e,t=!1){if(te(i.app))return Promise.reject(Me(i));const r=dt(i),o=ol(r,e),h=await new dl(r,o,t).execute();return h&&!t&&(delete h.user._redirectEventId,await r._persistUserIfCurrent(h.user),await r._setRedirectUser(null,e)),h}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yl=600*1e3;class Il{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(t=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!wl(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var r;if(e.error&&!Eo(e)){const o=((r=e.error.code)==null?void 0:r.split("auth/")[1])||"internal-error";t.onError(le(this.auth,o))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const r=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=yl&&this.cachedEventUids.clear(),this.cachedEventUids.has(ss(e))}saveEventToCache(e){this.cachedEventUids.add(ss(e)),this.lastProcessedEventTime=Date.now()}}function ss(i){return[i.type,i.eventId,i.sessionId,i.tenantId].filter(e=>e).join("-")}function Eo({type:i,error:e}){return i==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function wl(i){switch(i.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return Eo(i);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function El(i,e={}){return xe(i,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vl=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,Tl=/^https?/;async function Sl(i){if(i.config.emulator)return;const{authorizedDomains:e}=await El(i);for(const t of e)try{if(Al(t))return}catch{}re(i,"unauthorized-domain")}function Al(i){const e=gi(),{protocol:t,hostname:r}=new URL(e);if(i.startsWith("chrome-extension://")){const h=new URL(i);return h.hostname===""&&r===""?t==="chrome-extension:"&&i.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&h.hostname===r}if(!Tl.test(t))return!1;if(vl.test(i))return r===i;const o=i.replace(/\./g,"\\.");return new RegExp("^(.+\\."+o+"|"+o+")$","i").test(r)}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bl=new zt(3e4,6e4);function os(){const i=ue().___jsl;if(i!=null&&i.H){for(const e of Object.keys(i.H))if(i.H[e].r=i.H[e].r||[],i.H[e].L=i.H[e].L||[],i.H[e].r=[...i.H[e].L],i.CP)for(let t=0;t<i.CP.length;t++)i.CP[t]=null}}function Cl(i){return new Promise((e,t)=>{var o,c,h;function r(){os(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{os(),t(le(i,"network-request-failed"))},timeout:bl.get()})}if((c=(o=ue().gapi)==null?void 0:o.iframes)!=null&&c.Iframe)e(gapi.iframes.getContext());else if((h=ue().gapi)!=null&&h.load)r();else{const y=vh("iframefcb");return ue()[y]=()=>{gapi.load?r():t(le(i,"network-request-failed"))},so(`${Eh()}?onload=${y}`).catch(E=>t(E))}}).catch(e=>{throw gn=null,e})}let gn=null;function Pl(i){return gn=gn||Cl(i),gn}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rl=new zt(5e3,15e3),kl="__/auth/iframe",Ol="emulator/auth/iframe",Nl={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},Dl=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function Ll(i){const e=i.config;C(e.authDomain,i,"auth-domain-config-required");const t=e.emulator?Si(e,Ol):`https://${i.config.authDomain}/${kl}`,r={apiKey:e.apiKey,appName:i.name,v:ut},o=Dl.get(i.config.apiHost);o&&(r.eid=o);const c=i._getFrameworks();return c.length&&(r.fw=c.join(",")),`${t}?${Wt(r).slice(1)}`}async function Ml(i){const e=await Pl(i),t=ue().gapi;return C(t,i,"internal-error"),e.open({where:document.body,url:Ll(i),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:Nl,dontclear:!0},r=>new Promise(async(o,c)=>{await r.restyle({setHideOnLeave:!1});const h=le(i,"network-request-failed"),y=ue().setTimeout(()=>{c(h)},Rl.get());function E(){ue().clearTimeout(y),o(r)}r.ping(E).then(E,()=>{c(h)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ul={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},xl=500,Vl=600,Fl="_blank",jl="http://localhost";class as{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function Bl(i,e,t,r=xl,o=Vl){const c=Math.max((window.screen.availHeight-o)/2,0).toString(),h=Math.max((window.screen.availWidth-r)/2,0).toString();let y="";const E={...Ul,width:r.toString(),height:o.toString(),top:c,left:h},v=q().toLowerCase();t&&(y=Qs(v)?Fl:t),Xs(v)&&(e=e||jl,E.scrollbars="yes");const b=Object.entries(E).reduce((S,[x,L])=>`${S}${x}=${L},`,"");if(dh(v)&&y!=="_self")return Hl(e||"",y),new as(null);const A=window.open(e||"",y,b);C(A,i,"popup-blocked");try{A.focus()}catch{}return new as(A)}function Hl(i,e){const t=document.createElement("a");t.href=i,t.target=e;const r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(r)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $l="__/auth/handler",Wl="emulator/auth/handler",zl=encodeURIComponent("fac");async function cs(i,e,t,r,o,c){C(i.config.authDomain,i,"auth-domain-config-required"),C(i.config.apiKey,i,"invalid-api-key");const h={apiKey:i.config.apiKey,appName:i.name,authType:t,redirectUrl:r,v:ut,eventId:o};if(e instanceof co){e.setDefaultLanguage(i.languageCode),h.providerId=e.providerId||"",Da(e.getCustomParameters())||(h.customParameters=JSON.stringify(e.getCustomParameters()));for(const[b,A]of Object.entries({}))h[b]=A}if(e instanceof Gt){const b=e.getScopes().filter(A=>A!=="");b.length>0&&(h.scopes=b.join(","))}i.tenantId&&(h.tid=i.tenantId);const y=h;for(const b of Object.keys(y))y[b]===void 0&&delete y[b];const E=await i._getAppCheckToken(),v=E?`#${zl}=${encodeURIComponent(E)}`:"";return`${Gl(i)}?${Wt(y).slice(1)}${v}`}function Gl({config:i}){return i.emulator?Si(i,Wl):`https://${i.authDomain}/${$l}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ai="webStorageSupport";class ql{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=go,this._completeRedirectFn=_l,this._overrideRedirectResult=pl}async _openPopup(e,t,r,o){var h;me((h=this.eventManagers[e._key()])==null?void 0:h.manager,"_initialize() not called before _openPopup()");const c=await cs(e,t,r,gi(),o);return Bl(e,c,Ri())}async _openRedirect(e,t,r,o){await this._originValidation(e);const c=await cs(e,t,r,gi(),o);return Xh(c),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:o,promise:c}=this.eventManagers[t];return o?Promise.resolve(o):(me(c,"If manager is not set, promise should be"),c)}const r=this.initAndGetManager(e);return this.eventManagers[t]={promise:r},r.catch(()=>{delete this.eventManagers[t]}),r}async initAndGetManager(e){const t=await Ml(e),r=new Il(e);return t.register("authEvent",o=>(C(o==null?void 0:o.authEvent,e,"invalid-auth-event"),{status:r.onEvent(o.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=t,r}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(ai,{type:ai},o=>{var h;const c=(h=o==null?void 0:o[0])==null?void 0:h[ai];c!==void 0&&t(!!c),re(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=Sl(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return io()||Ys()||bi()}}const Kl=ql;var hs="@firebase/auth",ls="1.12.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jl{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)==null?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(r=>{e((r==null?void 0:r.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){C(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Xl(i){switch(i){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function Yl(i){ct(new Je("auth",(e,{options:t})=>{const r=e.getProvider("app").getImmediate(),o=e.getProvider("heartbeat"),c=e.getProvider("app-check-internal"),{apiKey:h,authDomain:y}=r.options;C(h&&!h.includes(":"),"invalid-api-key",{appName:r.name});const E={apiKey:h,authDomain:y,clientPlatform:i,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:ro(i)},v=new yh(r,o,c,E);return Ph(v,t),v},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,r)=>{e.getProvider("auth-internal").initialize()})),ct(new Je("auth-internal",e=>{const t=dt(e.getProvider("auth").getImmediate());return(r=>new Jl(r))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),Le(hs,ls,Xl(i)),Le(hs,ls,"esm2020")}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ql=300,Zl=Ls("authIdTokenMaxAge")||Ql;let us=null;const eu=i=>async e=>{const t=e&&await e.getIdTokenResult(),r=t&&(new Date().getTime()-Date.parse(t.issuedAtTime))/1e3;if(r&&r>Zl)return;const o=t==null?void 0:t.token;us!==o&&(us=o,await fetch(i,{method:o?"POST":"DELETE",headers:o?{Authorization:`Bearer ${o}`}:{}}))};function Fu(i=Fs()){const e=vi(i,"auth");if(e.isInitialized())return e.getImmediate();const t=Ch(i,{popupRedirectResolver:Kl,persistence:[sl,qh,go]}),r=Ls("authTokenSyncURL");if(r&&typeof isSecureContext=="boolean"&&isSecureContext){const c=new URL(r,location.origin);if(location.origin===c.origin){const h=eu(c.toString());Wh(t,h,()=>h(t.currentUser)),$h(t,y=>h(y))}}const o=Ns("auth");return o&&Rh(t,`http://${o}`),t}function tu(){var i;return((i=document.getElementsByTagName("head"))==null?void 0:i[0])??document}Ih({loadJS(i){return new Promise((e,t)=>{const r=document.createElement("script");r.setAttribute("src",i),r.onload=e,r.onerror=o=>{const c=le("internal-error");c.customData=o,t(c)},r.type="text/javascript",r.charset="UTF-8",tu().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});Yl("Browser");var nu="firebase",iu="12.7.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Le(nu,iu,"app");var ds=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Oi;(function(){var i;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(g,u){function f(){}f.prototype=u.prototype,g.F=u.prototype,g.prototype=new f,g.prototype.constructor=g,g.D=function(m,p,I){for(var d=Array(arguments.length-2),K=2;K<arguments.length;K++)d[K-2]=arguments[K];return u.prototype[p].apply(m,d)}}function t(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(r,t),r.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function o(g,u,f){f||(f=0);const m=Array(16);if(typeof u=="string")for(var p=0;p<16;++p)m[p]=u.charCodeAt(f++)|u.charCodeAt(f++)<<8|u.charCodeAt(f++)<<16|u.charCodeAt(f++)<<24;else for(p=0;p<16;++p)m[p]=u[f++]|u[f++]<<8|u[f++]<<16|u[f++]<<24;u=g.g[0],f=g.g[1],p=g.g[2];let I=g.g[3],d;d=u+(I^f&(p^I))+m[0]+3614090360&4294967295,u=f+(d<<7&4294967295|d>>>25),d=I+(p^u&(f^p))+m[1]+3905402710&4294967295,I=u+(d<<12&4294967295|d>>>20),d=p+(f^I&(u^f))+m[2]+606105819&4294967295,p=I+(d<<17&4294967295|d>>>15),d=f+(u^p&(I^u))+m[3]+3250441966&4294967295,f=p+(d<<22&4294967295|d>>>10),d=u+(I^f&(p^I))+m[4]+4118548399&4294967295,u=f+(d<<7&4294967295|d>>>25),d=I+(p^u&(f^p))+m[5]+1200080426&4294967295,I=u+(d<<12&4294967295|d>>>20),d=p+(f^I&(u^f))+m[6]+2821735955&4294967295,p=I+(d<<17&4294967295|d>>>15),d=f+(u^p&(I^u))+m[7]+4249261313&4294967295,f=p+(d<<22&4294967295|d>>>10),d=u+(I^f&(p^I))+m[8]+1770035416&4294967295,u=f+(d<<7&4294967295|d>>>25),d=I+(p^u&(f^p))+m[9]+2336552879&4294967295,I=u+(d<<12&4294967295|d>>>20),d=p+(f^I&(u^f))+m[10]+4294925233&4294967295,p=I+(d<<17&4294967295|d>>>15),d=f+(u^p&(I^u))+m[11]+2304563134&4294967295,f=p+(d<<22&4294967295|d>>>10),d=u+(I^f&(p^I))+m[12]+1804603682&4294967295,u=f+(d<<7&4294967295|d>>>25),d=I+(p^u&(f^p))+m[13]+4254626195&4294967295,I=u+(d<<12&4294967295|d>>>20),d=p+(f^I&(u^f))+m[14]+2792965006&4294967295,p=I+(d<<17&4294967295|d>>>15),d=f+(u^p&(I^u))+m[15]+1236535329&4294967295,f=p+(d<<22&4294967295|d>>>10),d=u+(p^I&(f^p))+m[1]+4129170786&4294967295,u=f+(d<<5&4294967295|d>>>27),d=I+(f^p&(u^f))+m[6]+3225465664&4294967295,I=u+(d<<9&4294967295|d>>>23),d=p+(u^f&(I^u))+m[11]+643717713&4294967295,p=I+(d<<14&4294967295|d>>>18),d=f+(I^u&(p^I))+m[0]+3921069994&4294967295,f=p+(d<<20&4294967295|d>>>12),d=u+(p^I&(f^p))+m[5]+3593408605&4294967295,u=f+(d<<5&4294967295|d>>>27),d=I+(f^p&(u^f))+m[10]+38016083&4294967295,I=u+(d<<9&4294967295|d>>>23),d=p+(u^f&(I^u))+m[15]+3634488961&4294967295,p=I+(d<<14&4294967295|d>>>18),d=f+(I^u&(p^I))+m[4]+3889429448&4294967295,f=p+(d<<20&4294967295|d>>>12),d=u+(p^I&(f^p))+m[9]+568446438&4294967295,u=f+(d<<5&4294967295|d>>>27),d=I+(f^p&(u^f))+m[14]+3275163606&4294967295,I=u+(d<<9&4294967295|d>>>23),d=p+(u^f&(I^u))+m[3]+4107603335&4294967295,p=I+(d<<14&4294967295|d>>>18),d=f+(I^u&(p^I))+m[8]+1163531501&4294967295,f=p+(d<<20&4294967295|d>>>12),d=u+(p^I&(f^p))+m[13]+2850285829&4294967295,u=f+(d<<5&4294967295|d>>>27),d=I+(f^p&(u^f))+m[2]+4243563512&4294967295,I=u+(d<<9&4294967295|d>>>23),d=p+(u^f&(I^u))+m[7]+1735328473&4294967295,p=I+(d<<14&4294967295|d>>>18),d=f+(I^u&(p^I))+m[12]+2368359562&4294967295,f=p+(d<<20&4294967295|d>>>12),d=u+(f^p^I)+m[5]+4294588738&4294967295,u=f+(d<<4&4294967295|d>>>28),d=I+(u^f^p)+m[8]+2272392833&4294967295,I=u+(d<<11&4294967295|d>>>21),d=p+(I^u^f)+m[11]+1839030562&4294967295,p=I+(d<<16&4294967295|d>>>16),d=f+(p^I^u)+m[14]+4259657740&4294967295,f=p+(d<<23&4294967295|d>>>9),d=u+(f^p^I)+m[1]+2763975236&4294967295,u=f+(d<<4&4294967295|d>>>28),d=I+(u^f^p)+m[4]+1272893353&4294967295,I=u+(d<<11&4294967295|d>>>21),d=p+(I^u^f)+m[7]+4139469664&4294967295,p=I+(d<<16&4294967295|d>>>16),d=f+(p^I^u)+m[10]+3200236656&4294967295,f=p+(d<<23&4294967295|d>>>9),d=u+(f^p^I)+m[13]+681279174&4294967295,u=f+(d<<4&4294967295|d>>>28),d=I+(u^f^p)+m[0]+3936430074&4294967295,I=u+(d<<11&4294967295|d>>>21),d=p+(I^u^f)+m[3]+3572445317&4294967295,p=I+(d<<16&4294967295|d>>>16),d=f+(p^I^u)+m[6]+76029189&4294967295,f=p+(d<<23&4294967295|d>>>9),d=u+(f^p^I)+m[9]+3654602809&4294967295,u=f+(d<<4&4294967295|d>>>28),d=I+(u^f^p)+m[12]+3873151461&4294967295,I=u+(d<<11&4294967295|d>>>21),d=p+(I^u^f)+m[15]+530742520&4294967295,p=I+(d<<16&4294967295|d>>>16),d=f+(p^I^u)+m[2]+3299628645&4294967295,f=p+(d<<23&4294967295|d>>>9),d=u+(p^(f|~I))+m[0]+4096336452&4294967295,u=f+(d<<6&4294967295|d>>>26),d=I+(f^(u|~p))+m[7]+1126891415&4294967295,I=u+(d<<10&4294967295|d>>>22),d=p+(u^(I|~f))+m[14]+2878612391&4294967295,p=I+(d<<15&4294967295|d>>>17),d=f+(I^(p|~u))+m[5]+4237533241&4294967295,f=p+(d<<21&4294967295|d>>>11),d=u+(p^(f|~I))+m[12]+1700485571&4294967295,u=f+(d<<6&4294967295|d>>>26),d=I+(f^(u|~p))+m[3]+2399980690&4294967295,I=u+(d<<10&4294967295|d>>>22),d=p+(u^(I|~f))+m[10]+4293915773&4294967295,p=I+(d<<15&4294967295|d>>>17),d=f+(I^(p|~u))+m[1]+2240044497&4294967295,f=p+(d<<21&4294967295|d>>>11),d=u+(p^(f|~I))+m[8]+1873313359&4294967295,u=f+(d<<6&4294967295|d>>>26),d=I+(f^(u|~p))+m[15]+4264355552&4294967295,I=u+(d<<10&4294967295|d>>>22),d=p+(u^(I|~f))+m[6]+2734768916&4294967295,p=I+(d<<15&4294967295|d>>>17),d=f+(I^(p|~u))+m[13]+1309151649&4294967295,f=p+(d<<21&4294967295|d>>>11),d=u+(p^(f|~I))+m[4]+4149444226&4294967295,u=f+(d<<6&4294967295|d>>>26),d=I+(f^(u|~p))+m[11]+3174756917&4294967295,I=u+(d<<10&4294967295|d>>>22),d=p+(u^(I|~f))+m[2]+718787259&4294967295,p=I+(d<<15&4294967295|d>>>17),d=f+(I^(p|~u))+m[9]+3951481745&4294967295,g.g[0]=g.g[0]+u&4294967295,g.g[1]=g.g[1]+(p+(d<<21&4294967295|d>>>11))&4294967295,g.g[2]=g.g[2]+p&4294967295,g.g[3]=g.g[3]+I&4294967295}r.prototype.v=function(g,u){u===void 0&&(u=g.length);const f=u-this.blockSize,m=this.C;let p=this.h,I=0;for(;I<u;){if(p==0)for(;I<=f;)o(this,g,I),I+=this.blockSize;if(typeof g=="string"){for(;I<u;)if(m[p++]=g.charCodeAt(I++),p==this.blockSize){o(this,m),p=0;break}}else for(;I<u;)if(m[p++]=g[I++],p==this.blockSize){o(this,m),p=0;break}}this.h=p,this.o+=u},r.prototype.A=function(){var g=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);g[0]=128;for(var u=1;u<g.length-8;++u)g[u]=0;u=this.o*8;for(var f=g.length-8;f<g.length;++f)g[f]=u&255,u/=256;for(this.v(g),g=Array(16),u=0,f=0;f<4;++f)for(let m=0;m<32;m+=8)g[u++]=this.g[f]>>>m&255;return g};function c(g,u){var f=y;return Object.prototype.hasOwnProperty.call(f,g)?f[g]:f[g]=u(g)}function h(g,u){this.h=u;const f=[];let m=!0;for(let p=g.length-1;p>=0;p--){const I=g[p]|0;m&&I==u||(f[p]=I,m=!1)}this.g=f}var y={};function E(g){return-128<=g&&g<128?c(g,function(u){return new h([u|0],u<0?-1:0)}):new h([g|0],g<0?-1:0)}function v(g){if(isNaN(g)||!isFinite(g))return A;if(g<0)return U(v(-g));const u=[];let f=1;for(let m=0;g>=f;m++)u[m]=g/f|0,f*=4294967296;return new h(u,0)}function b(g,u){if(g.length==0)throw Error("number format error: empty string");if(u=u||10,u<2||36<u)throw Error("radix out of range: "+u);if(g.charAt(0)=="-")return U(b(g.substring(1),u));if(g.indexOf("-")>=0)throw Error('number format error: interior "-" character');const f=v(Math.pow(u,8));let m=A;for(let I=0;I<g.length;I+=8){var p=Math.min(8,g.length-I);const d=parseInt(g.substring(I,I+p),u);p<8?(p=v(Math.pow(u,p)),m=m.j(p).add(v(d))):(m=m.j(f),m=m.add(v(d)))}return m}var A=E(0),S=E(1),x=E(16777216);i=h.prototype,i.m=function(){if(F(this))return-U(this).m();let g=0,u=1;for(let f=0;f<this.g.length;f++){const m=this.i(f);g+=(m>=0?m:4294967296+m)*u,u*=4294967296}return g},i.toString=function(g){if(g=g||10,g<2||36<g)throw Error("radix out of range: "+g);if(L(this))return"0";if(F(this))return"-"+U(this).toString(g);const u=v(Math.pow(g,6));var f=this;let m="";for(;;){const p=Ie(f,u).g;f=J(f,p.j(u));let I=((f.g.length>0?f.g[0]:f.h)>>>0).toString(g);if(f=p,L(f))return I+m;for(;I.length<6;)I="0"+I;m=I+m}},i.i=function(g){return g<0?0:g<this.g.length?this.g[g]:this.h};function L(g){if(g.h!=0)return!1;for(let u=0;u<g.g.length;u++)if(g.g[u]!=0)return!1;return!0}function F(g){return g.h==-1}i.l=function(g){return g=J(this,g),F(g)?-1:L(g)?0:1};function U(g){const u=g.g.length,f=[];for(let m=0;m<u;m++)f[m]=~g.g[m];return new h(f,~g.h).add(S)}i.abs=function(){return F(this)?U(this):this},i.add=function(g){const u=Math.max(this.g.length,g.g.length),f=[];let m=0;for(let p=0;p<=u;p++){let I=m+(this.i(p)&65535)+(g.i(p)&65535),d=(I>>>16)+(this.i(p)>>>16)+(g.i(p)>>>16);m=d>>>16,I&=65535,d&=65535,f[p]=d<<16|I}return new h(f,f[f.length-1]&-2147483648?-1:0)};function J(g,u){return g.add(U(u))}i.j=function(g){if(L(this)||L(g))return A;if(F(this))return F(g)?U(this).j(U(g)):U(U(this).j(g));if(F(g))return U(this.j(U(g)));if(this.l(x)<0&&g.l(x)<0)return v(this.m()*g.m());const u=this.g.length+g.g.length,f=[];for(var m=0;m<2*u;m++)f[m]=0;for(m=0;m<this.g.length;m++)for(let p=0;p<g.g.length;p++){const I=this.i(m)>>>16,d=this.i(m)&65535,K=g.i(p)>>>16,Ve=g.i(p)&65535;f[2*m+2*p]+=d*Ve,X(f,2*m+2*p),f[2*m+2*p+1]+=I*Ve,X(f,2*m+2*p+1),f[2*m+2*p+1]+=d*K,X(f,2*m+2*p+1),f[2*m+2*p+2]+=I*K,X(f,2*m+2*p+2)}for(g=0;g<u;g++)f[g]=f[2*g+1]<<16|f[2*g];for(g=u;g<2*u;g++)f[g]=0;return new h(f,0)};function X(g,u){for(;(g[u]&65535)!=g[u];)g[u+1]+=g[u]>>>16,g[u]&=65535,u++}function Y(g,u){this.g=g,this.h=u}function Ie(g,u){if(L(u))throw Error("division by zero");if(L(g))return new Y(A,A);if(F(g))return u=Ie(U(g),u),new Y(U(u.g),U(u.h));if(F(u))return u=Ie(g,U(u)),new Y(U(u.g),u.h);if(g.g.length>30){if(F(g)||F(u))throw Error("slowDivide_ only works with positive integers.");for(var f=S,m=u;m.l(g)<=0;)f=we(f),m=we(m);var p=Q(f,1),I=Q(m,1);for(m=Q(m,2),f=Q(f,2);!L(m);){var d=I.add(m);d.l(g)<=0&&(p=p.add(f),I=d),m=Q(m,1),f=Q(f,1)}return u=J(g,p.j(u)),new Y(p,u)}for(p=A;g.l(u)>=0;){for(f=Math.max(1,Math.floor(g.m()/u.m())),m=Math.ceil(Math.log(f)/Math.LN2),m=m<=48?1:Math.pow(2,m-48),I=v(f),d=I.j(u);F(d)||d.l(g)>0;)f-=m,I=v(f),d=I.j(u);L(I)&&(I=S),p=p.add(I),g=J(g,d)}return new Y(p,g)}i.B=function(g){return Ie(this,g).h},i.and=function(g){const u=Math.max(this.g.length,g.g.length),f=[];for(let m=0;m<u;m++)f[m]=this.i(m)&g.i(m);return new h(f,this.h&g.h)},i.or=function(g){const u=Math.max(this.g.length,g.g.length),f=[];for(let m=0;m<u;m++)f[m]=this.i(m)|g.i(m);return new h(f,this.h|g.h)},i.xor=function(g){const u=Math.max(this.g.length,g.g.length),f=[];for(let m=0;m<u;m++)f[m]=this.i(m)^g.i(m);return new h(f,this.h^g.h)};function we(g){const u=g.g.length+1,f=[];for(let m=0;m<u;m++)f[m]=g.i(m)<<1|g.i(m-1)>>>31;return new h(f,g.h)}function Q(g,u){const f=u>>5;u%=32;const m=g.g.length-f,p=[];for(let I=0;I<m;I++)p[I]=u>0?g.i(I+f)>>>u|g.i(I+f+1)<<32-u:g.i(I+f);return new h(p,g.h)}r.prototype.digest=r.prototype.A,r.prototype.reset=r.prototype.u,r.prototype.update=r.prototype.v,h.prototype.add=h.prototype.add,h.prototype.multiply=h.prototype.j,h.prototype.modulo=h.prototype.B,h.prototype.compare=h.prototype.l,h.prototype.toNumber=h.prototype.m,h.prototype.toString=h.prototype.toString,h.prototype.getBits=h.prototype.i,h.fromNumber=v,h.fromString=b,Oi=h}).apply(typeof ds<"u"?ds:typeof self<"u"?self:typeof window<"u"?window:{});var ln=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};(function(){var i,e=Object.defineProperty;function t(n){n=[typeof globalThis=="object"&&globalThis,n,typeof window=="object"&&window,typeof self=="object"&&self,typeof ln=="object"&&ln];for(var s=0;s<n.length;++s){var a=n[s];if(a&&a.Math==Math)return a}throw Error("Cannot find global object")}var r=t(this);function o(n,s){if(s)e:{var a=r;n=n.split(".");for(var l=0;l<n.length-1;l++){var _=n[l];if(!(_ in a))break e;a=a[_]}n=n[n.length-1],l=a[n],s=s(l),s!=l&&s!=null&&e(a,n,{configurable:!0,writable:!0,value:s})}}o("Symbol.dispose",function(n){return n||Symbol("Symbol.dispose")}),o("Array.prototype.values",function(n){return n||function(){return this[Symbol.iterator]()}}),o("Object.entries",function(n){return n||function(s){var a=[],l;for(l in s)Object.prototype.hasOwnProperty.call(s,l)&&a.push([l,s[l]]);return a}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var c=c||{},h=this||self;function y(n){var s=typeof n;return s=="object"&&n!=null||s=="function"}function E(n,s,a){return n.call.apply(n.bind,arguments)}function v(n,s,a){return v=E,v.apply(null,arguments)}function b(n,s){var a=Array.prototype.slice.call(arguments,1);return function(){var l=a.slice();return l.push.apply(l,arguments),n.apply(this,l)}}function A(n,s){function a(){}a.prototype=s.prototype,n.Z=s.prototype,n.prototype=new a,n.prototype.constructor=n,n.Ob=function(l,_,w){for(var T=Array(arguments.length-2),P=2;P<arguments.length;P++)T[P-2]=arguments[P];return s.prototype[_].apply(l,T)}}var S=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?n=>n&&AsyncContext.Snapshot.wrap(n):n=>n;function x(n){const s=n.length;if(s>0){const a=Array(s);for(let l=0;l<s;l++)a[l]=n[l];return a}return[]}function L(n,s){for(let l=1;l<arguments.length;l++){const _=arguments[l];var a=typeof _;if(a=a!="object"?a:_?Array.isArray(_)?"array":a:"null",a=="array"||a=="object"&&typeof _.length=="number"){a=n.length||0;const w=_.length||0;n.length=a+w;for(let T=0;T<w;T++)n[a+T]=_[T]}else n.push(_)}}class F{constructor(s,a){this.i=s,this.j=a,this.h=0,this.g=null}get(){let s;return this.h>0?(this.h--,s=this.g,this.g=s.next,s.next=null):s=this.i(),s}}function U(n){h.setTimeout(()=>{throw n},0)}function J(){var n=g;let s=null;return n.g&&(s=n.g,n.g=n.g.next,n.g||(n.h=null),s.next=null),s}class X{constructor(){this.h=this.g=null}add(s,a){const l=Y.get();l.set(s,a),this.h?this.h.next=l:this.g=l,this.h=l}}var Y=new F(()=>new Ie,n=>n.reset());class Ie{constructor(){this.next=this.g=this.h=null}set(s,a){this.h=s,this.g=a,this.next=null}reset(){this.next=this.g=this.h=null}}let we,Q=!1,g=new X,u=()=>{const n=Promise.resolve(void 0);we=()=>{n.then(f)}};function f(){for(var n;n=J();){try{n.h.call(n.g)}catch(a){U(a)}var s=Y;s.j(n),s.h<100&&(s.h++,n.next=s.g,s.g=n)}Q=!1}function m(){this.u=this.u,this.C=this.C}m.prototype.u=!1,m.prototype.dispose=function(){this.u||(this.u=!0,this.N())},m.prototype[Symbol.dispose]=function(){this.dispose()},m.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function p(n,s){this.type=n,this.g=this.target=s,this.defaultPrevented=!1}p.prototype.h=function(){this.defaultPrevented=!0};var I=(function(){if(!h.addEventListener||!Object.defineProperty)return!1;var n=!1,s=Object.defineProperty({},"passive",{get:function(){n=!0}});try{const a=()=>{};h.addEventListener("test",a,s),h.removeEventListener("test",a,s)}catch{}return n})();function d(n){return/^[\s\xa0]*$/.test(n)}function K(n,s){p.call(this,n?n.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,n&&this.init(n,s)}A(K,p),K.prototype.init=function(n,s){const a=this.type=n.type,l=n.changedTouches&&n.changedTouches.length?n.changedTouches[0]:null;this.target=n.target||n.srcElement,this.g=s,s=n.relatedTarget,s||(a=="mouseover"?s=n.fromElement:a=="mouseout"&&(s=n.toElement)),this.relatedTarget=s,l?(this.clientX=l.clientX!==void 0?l.clientX:l.pageX,this.clientY=l.clientY!==void 0?l.clientY:l.pageY,this.screenX=l.screenX||0,this.screenY=l.screenY||0):(this.clientX=n.clientX!==void 0?n.clientX:n.pageX,this.clientY=n.clientY!==void 0?n.clientY:n.pageY,this.screenX=n.screenX||0,this.screenY=n.screenY||0),this.button=n.button,this.key=n.key||"",this.ctrlKey=n.ctrlKey,this.altKey=n.altKey,this.shiftKey=n.shiftKey,this.metaKey=n.metaKey,this.pointerId=n.pointerId||0,this.pointerType=n.pointerType,this.state=n.state,this.i=n,n.defaultPrevented&&K.Z.h.call(this)},K.prototype.h=function(){K.Z.h.call(this);const n=this.i;n.preventDefault?n.preventDefault():n.returnValue=!1};var Ve="closure_listenable_"+(Math.random()*1e6|0),ko=0;function Oo(n,s,a,l,_){this.listener=n,this.proxy=null,this.src=s,this.type=a,this.capture=!!l,this.ha=_,this.key=++ko,this.da=this.fa=!1}function Xt(n){n.da=!0,n.listener=null,n.proxy=null,n.src=null,n.ha=null}function Yt(n,s,a){for(const l in n)s.call(a,n[l],l,n)}function No(n,s){for(const a in n)s.call(void 0,n[a],a,n)}function Ui(n){const s={};for(const a in n)s[a]=n[a];return s}const xi="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function Vi(n,s){let a,l;for(let _=1;_<arguments.length;_++){l=arguments[_];for(a in l)n[a]=l[a];for(let w=0;w<xi.length;w++)a=xi[w],Object.prototype.hasOwnProperty.call(l,a)&&(n[a]=l[a])}}function Qt(n){this.src=n,this.g={},this.h=0}Qt.prototype.add=function(n,s,a,l,_){const w=n.toString();n=this.g[w],n||(n=this.g[w]=[],this.h++);const T=kn(n,s,l,_);return T>-1?(s=n[T],a||(s.fa=!1)):(s=new Oo(s,this.src,w,!!l,_),s.fa=a,n.push(s)),s};function Rn(n,s){const a=s.type;if(a in n.g){var l=n.g[a],_=Array.prototype.indexOf.call(l,s,void 0),w;(w=_>=0)&&Array.prototype.splice.call(l,_,1),w&&(Xt(s),n.g[a].length==0&&(delete n.g[a],n.h--))}}function kn(n,s,a,l){for(let _=0;_<n.length;++_){const w=n[_];if(!w.da&&w.listener==s&&w.capture==!!a&&w.ha==l)return _}return-1}var On="closure_lm_"+(Math.random()*1e6|0),Nn={};function Fi(n,s,a,l,_){if(Array.isArray(s)){for(let w=0;w<s.length;w++)Fi(n,s[w],a,l,_);return null}return a=Hi(a),n&&n[Ve]?n.J(s,a,y(l)?!!l.capture:!1,_):Do(n,s,a,!1,l,_)}function Do(n,s,a,l,_,w){if(!s)throw Error("Invalid event type");const T=y(_)?!!_.capture:!!_;let P=Ln(n);if(P||(n[On]=P=new Qt(n)),a=P.add(s,a,l,T,w),a.proxy)return a;if(l=Lo(),a.proxy=l,l.src=n,l.listener=a,n.addEventListener)I||(_=T),_===void 0&&(_=!1),n.addEventListener(s.toString(),l,_);else if(n.attachEvent)n.attachEvent(Bi(s.toString()),l);else if(n.addListener&&n.removeListener)n.addListener(l);else throw Error("addEventListener and attachEvent are unavailable.");return a}function Lo(){function n(a){return s.call(n.src,n.listener,a)}const s=Mo;return n}function ji(n,s,a,l,_){if(Array.isArray(s))for(var w=0;w<s.length;w++)ji(n,s[w],a,l,_);else l=y(l)?!!l.capture:!!l,a=Hi(a),n&&n[Ve]?(n=n.i,w=String(s).toString(),w in n.g&&(s=n.g[w],a=kn(s,a,l,_),a>-1&&(Xt(s[a]),Array.prototype.splice.call(s,a,1),s.length==0&&(delete n.g[w],n.h--)))):n&&(n=Ln(n))&&(s=n.g[s.toString()],n=-1,s&&(n=kn(s,a,l,_)),(a=n>-1?s[n]:null)&&Dn(a))}function Dn(n){if(typeof n!="number"&&n&&!n.da){var s=n.src;if(s&&s[Ve])Rn(s.i,n);else{var a=n.type,l=n.proxy;s.removeEventListener?s.removeEventListener(a,l,n.capture):s.detachEvent?s.detachEvent(Bi(a),l):s.addListener&&s.removeListener&&s.removeListener(l),(a=Ln(s))?(Rn(a,n),a.h==0&&(a.src=null,s[On]=null)):Xt(n)}}}function Bi(n){return n in Nn?Nn[n]:Nn[n]="on"+n}function Mo(n,s){if(n.da)n=!0;else{s=new K(s,this);const a=n.listener,l=n.ha||n.src;n.fa&&Dn(n),n=a.call(l,s)}return n}function Ln(n){return n=n[On],n instanceof Qt?n:null}var Mn="__closure_events_fn_"+(Math.random()*1e9>>>0);function Hi(n){return typeof n=="function"?n:(n[Mn]||(n[Mn]=function(s){return n.handleEvent(s)}),n[Mn])}function $(){m.call(this),this.i=new Qt(this),this.M=this,this.G=null}A($,m),$.prototype[Ve]=!0,$.prototype.removeEventListener=function(n,s,a,l){ji(this,n,s,a,l)};function W(n,s){var a,l=n.G;if(l)for(a=[];l;l=l.G)a.push(l);if(n=n.M,l=s.type||s,typeof s=="string")s=new p(s,n);else if(s instanceof p)s.target=s.target||n;else{var _=s;s=new p(l,n),Vi(s,_)}_=!0;let w,T;if(a)for(T=a.length-1;T>=0;T--)w=s.g=a[T],_=Zt(w,l,!0,s)&&_;if(w=s.g=n,_=Zt(w,l,!0,s)&&_,_=Zt(w,l,!1,s)&&_,a)for(T=0;T<a.length;T++)w=s.g=a[T],_=Zt(w,l,!1,s)&&_}$.prototype.N=function(){if($.Z.N.call(this),this.i){var n=this.i;for(const s in n.g){const a=n.g[s];for(let l=0;l<a.length;l++)Xt(a[l]);delete n.g[s],n.h--}}this.G=null},$.prototype.J=function(n,s,a,l){return this.i.add(String(n),s,!1,a,l)},$.prototype.K=function(n,s,a,l){return this.i.add(String(n),s,!0,a,l)};function Zt(n,s,a,l){if(s=n.i.g[String(s)],!s)return!0;s=s.concat();let _=!0;for(let w=0;w<s.length;++w){const T=s[w];if(T&&!T.da&&T.capture==a){const P=T.listener,B=T.ha||T.src;T.fa&&Rn(n.i,T),_=P.call(B,l)!==!1&&_}}return _&&!l.defaultPrevented}function Uo(n,s){if(typeof n!="function")if(n&&typeof n.handleEvent=="function")n=v(n.handleEvent,n);else throw Error("Invalid listener argument");return Number(s)>2147483647?-1:h.setTimeout(n,s||0)}function $i(n){n.g=Uo(()=>{n.g=null,n.i&&(n.i=!1,$i(n))},n.l);const s=n.h;n.h=null,n.m.apply(null,s)}class xo extends m{constructor(s,a){super(),this.m=s,this.l=a,this.h=null,this.i=!1,this.g=null}j(s){this.h=arguments,this.g?this.i=!0:$i(this)}N(){super.N(),this.g&&(h.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function pt(n){m.call(this),this.h=n,this.g={}}A(pt,m);var Wi=[];function zi(n){Yt(n.g,function(s,a){this.g.hasOwnProperty(a)&&Dn(s)},n),n.g={}}pt.prototype.N=function(){pt.Z.N.call(this),zi(this)},pt.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Un=h.JSON.stringify,Vo=h.JSON.parse,Fo=class{stringify(n){return h.JSON.stringify(n,void 0)}parse(n){return h.JSON.parse(n,void 0)}};function Gi(){}function jo(){}var gt={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function xn(){p.call(this,"d")}A(xn,p);function Vn(){p.call(this,"c")}A(Vn,p);var Ze={},qi=null;function Fn(){return qi=qi||new $}Ze.Ia="serverreachability";function Ki(n){p.call(this,Ze.Ia,n)}A(Ki,p);function mt(n){const s=Fn();W(s,new Ki(s))}Ze.STAT_EVENT="statevent";function Ji(n,s){p.call(this,Ze.STAT_EVENT,n),this.stat=s}A(Ji,p);function z(n){const s=Fn();W(s,new Ji(s,n))}Ze.Ja="timingevent";function Xi(n,s){p.call(this,Ze.Ja,n),this.size=s}A(Xi,p);function _t(n,s){if(typeof n!="function")throw Error("Fn must not be null and must be a function");return h.setTimeout(function(){n()},s)}function yt(){this.g=!0}yt.prototype.ua=function(){this.g=!1};function Bo(n,s,a,l,_,w){n.info(function(){if(n.g)if(w){var T="",P=w.split("&");for(let D=0;D<P.length;D++){var B=P[D].split("=");if(B.length>1){const H=B[0];B=B[1];const oe=H.split("_");T=oe.length>=2&&oe[1]=="type"?T+(H+"="+B+"&"):T+(H+"=redacted&")}}}else T=null;else T=w;return"XMLHTTP REQ ("+l+") [attempt "+_+"]: "+s+`
`+a+`
`+T})}function Ho(n,s,a,l,_,w,T){n.info(function(){return"XMLHTTP RESP ("+l+") [ attempt "+_+"]: "+s+`
`+a+`
`+w+" "+T})}function et(n,s,a,l){n.info(function(){return"XMLHTTP TEXT ("+s+"): "+Wo(n,a)+(l?" "+l:"")})}function $o(n,s){n.info(function(){return"TIMEOUT: "+s})}yt.prototype.info=function(){};function Wo(n,s){if(!n.g)return s;if(!s)return null;try{const w=JSON.parse(s);if(w){for(n=0;n<w.length;n++)if(Array.isArray(w[n])){var a=w[n];if(!(a.length<2)){var l=a[1];if(Array.isArray(l)&&!(l.length<1)){var _=l[0];if(_!="noop"&&_!="stop"&&_!="close")for(let T=1;T<l.length;T++)l[T]=""}}}}return Un(w)}catch{return s}}var jn={NO_ERROR:0,TIMEOUT:8},zo={},Yi;function Bn(){}A(Bn,Gi),Bn.prototype.g=function(){return new XMLHttpRequest},Yi=new Bn;function It(n){return encodeURIComponent(String(n))}function Go(n){var s=1;n=n.split(":");const a=[];for(;s>0&&n.length;)a.push(n.shift()),s--;return n.length&&a.push(n.join(":")),a}function Ee(n,s,a,l){this.j=n,this.i=s,this.l=a,this.S=l||1,this.V=new pt(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new Qi}function Qi(){this.i=null,this.g="",this.h=!1}var Zi={},Hn={};function $n(n,s,a){n.M=1,n.A=tn(se(s)),n.u=a,n.R=!0,er(n,null)}function er(n,s){n.F=Date.now(),en(n),n.B=se(n.A);var a=n.B,l=n.S;Array.isArray(l)||(l=[String(l)]),fr(a.i,"t",l),n.C=0,a=n.j.L,n.h=new Qi,n.g=Or(n.j,a?s:null,!n.u),n.P>0&&(n.O=new xo(v(n.Y,n,n.g),n.P)),s=n.V,a=n.g,l=n.ba;var _="readystatechange";Array.isArray(_)||(_&&(Wi[0]=_.toString()),_=Wi);for(let w=0;w<_.length;w++){const T=Fi(a,_[w],l||s.handleEvent,!1,s.h||s);if(!T)break;s.g[T.key]=T}s=n.J?Ui(n.J):{},n.u?(n.v||(n.v="POST"),s["Content-Type"]="application/x-www-form-urlencoded",n.g.ea(n.B,n.v,n.u,s)):(n.v="GET",n.g.ea(n.B,n.v,null,s)),mt(),Bo(n.i,n.v,n.B,n.l,n.S,n.u)}Ee.prototype.ba=function(n){n=n.target;const s=this.O;s&&Se(n)==3?s.j():this.Y(n)},Ee.prototype.Y=function(n){try{if(n==this.g)e:{const P=Se(this.g),B=this.g.ya(),D=this.g.ca();if(!(P<3)&&(P!=3||this.g&&(this.h.h||this.g.la()||wr(this.g)))){this.K||P!=4||B==7||(B==8||D<=0?mt(3):mt(2)),Wn(this);var s=this.g.ca();this.X=s;var a=qo(this);if(this.o=s==200,Ho(this.i,this.v,this.B,this.l,this.S,P,s),this.o){if(this.U&&!this.L){t:{if(this.g){var l,_=this.g;if((l=_.g?_.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!d(l)){var w=l;break t}}w=null}if(n=w)et(this.i,this.l,n,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,zn(this,n);else{this.o=!1,this.m=3,z(12),Fe(this),wt(this);break e}}if(this.R){n=!0;let H;for(;!this.K&&this.C<a.length;)if(H=Ko(this,a),H==Hn){P==4&&(this.m=4,z(14),n=!1),et(this.i,this.l,null,"[Incomplete Response]");break}else if(H==Zi){this.m=4,z(15),et(this.i,this.l,a,"[Invalid Chunk]"),n=!1;break}else et(this.i,this.l,H,null),zn(this,H);if(tr(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),P!=4||a.length!=0||this.h.h||(this.m=1,z(16),n=!1),this.o=this.o&&n,!n)et(this.i,this.l,a,"[Invalid Chunked Response]"),Fe(this),wt(this);else if(a.length>0&&!this.W){this.W=!0;var T=this.j;T.g==this&&T.aa&&!T.P&&(T.j.info("Great, no buffering proxy detected. Bytes received: "+a.length),Zn(T),T.P=!0,z(11))}}else et(this.i,this.l,a,null),zn(this,a);P==4&&Fe(this),this.o&&!this.K&&(P==4?Cr(this.j,this):(this.o=!1,en(this)))}else ca(this.g),s==400&&a.indexOf("Unknown SID")>0?(this.m=3,z(12)):(this.m=0,z(13)),Fe(this),wt(this)}}}catch{}finally{}};function qo(n){if(!tr(n))return n.g.la();const s=wr(n.g);if(s==="")return"";let a="";const l=s.length,_=Se(n.g)==4;if(!n.h.i){if(typeof TextDecoder>"u")return Fe(n),wt(n),"";n.h.i=new h.TextDecoder}for(let w=0;w<l;w++)n.h.h=!0,a+=n.h.i.decode(s[w],{stream:!(_&&w==l-1)});return s.length=0,n.h.g+=a,n.C=0,n.h.g}function tr(n){return n.g?n.v=="GET"&&n.M!=2&&n.j.Aa:!1}function Ko(n,s){var a=n.C,l=s.indexOf(`
`,a);return l==-1?Hn:(a=Number(s.substring(a,l)),isNaN(a)?Zi:(l+=1,l+a>s.length?Hn:(s=s.slice(l,l+a),n.C=l+a,s)))}Ee.prototype.cancel=function(){this.K=!0,Fe(this)};function en(n){n.T=Date.now()+n.H,nr(n,n.H)}function nr(n,s){if(n.D!=null)throw Error("WatchDog timer not null");n.D=_t(v(n.aa,n),s)}function Wn(n){n.D&&(h.clearTimeout(n.D),n.D=null)}Ee.prototype.aa=function(){this.D=null;const n=Date.now();n-this.T>=0?($o(this.i,this.B),this.M!=2&&(mt(),z(17)),Fe(this),this.m=2,wt(this)):nr(this,this.T-n)};function wt(n){n.j.I==0||n.K||Cr(n.j,n)}function Fe(n){Wn(n);var s=n.O;s&&typeof s.dispose=="function"&&s.dispose(),n.O=null,zi(n.V),n.g&&(s=n.g,n.g=null,s.abort(),s.dispose())}function zn(n,s){try{var a=n.j;if(a.I!=0&&(a.g==n||Gn(a.h,n))){if(!n.L&&Gn(a.h,n)&&a.I==3){try{var l=a.Ba.g.parse(s)}catch{l=null}if(Array.isArray(l)&&l.length==3){var _=l;if(_[0]==0){e:if(!a.v){if(a.g)if(a.g.F+3e3<n.F)an(a),sn(a);else break e;Qn(a),z(18)}}else a.xa=_[1],0<a.xa-a.K&&_[2]<37500&&a.F&&a.A==0&&!a.C&&(a.C=_t(v(a.Va,a),6e3));sr(a.h)<=1&&a.ta&&(a.ta=void 0)}else Be(a,11)}else if((n.L||a.g==n)&&an(a),!d(s))for(_=a.Ba.g.parse(s),s=0;s<_.length;s++){let D=_[s];const H=D[0];if(!(H<=a.K))if(a.K=H,D=D[1],a.I==2)if(D[0]=="c"){a.M=D[1],a.ba=D[2];const oe=D[3];oe!=null&&(a.ka=oe,a.j.info("VER="+a.ka));const He=D[4];He!=null&&(a.za=He,a.j.info("SVER="+a.za));const Ae=D[5];Ae!=null&&typeof Ae=="number"&&Ae>0&&(l=1.5*Ae,a.O=l,a.j.info("backChannelRequestTimeoutMs_="+l)),l=a;const be=n.g;if(be){const cn=be.g?be.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(cn){var w=l.h;w.g||cn.indexOf("spdy")==-1&&cn.indexOf("quic")==-1&&cn.indexOf("h2")==-1||(w.j=w.l,w.g=new Set,w.h&&(qn(w,w.h),w.h=null))}if(l.G){const ei=be.g?be.g.getResponseHeader("X-HTTP-Session-Id"):null;ei&&(l.wa=ei,M(l.J,l.G,ei))}}a.I=3,a.l&&a.l.ra(),a.aa&&(a.T=Date.now()-n.F,a.j.info("Handshake RTT: "+a.T+"ms")),l=a;var T=n;if(l.na=kr(l,l.L?l.ba:null,l.W),T.L){or(l.h,T);var P=T,B=l.O;B&&(P.H=B),P.D&&(Wn(P),en(P)),l.g=T}else Ar(l);a.i.length>0&&on(a)}else D[0]!="stop"&&D[0]!="close"||Be(a,7);else a.I==3&&(D[0]=="stop"||D[0]=="close"?D[0]=="stop"?Be(a,7):Yn(a):D[0]!="noop"&&a.l&&a.l.qa(D),a.A=0)}}mt(4)}catch{}}var Jo=class{constructor(n,s){this.g=n,this.map=s}};function ir(n){this.l=n||10,h.PerformanceNavigationTiming?(n=h.performance.getEntriesByType("navigation"),n=n.length>0&&(n[0].nextHopProtocol=="hq"||n[0].nextHopProtocol=="h2")):n=!!(h.chrome&&h.chrome.loadTimes&&h.chrome.loadTimes()&&h.chrome.loadTimes().wasFetchedViaSpdy),this.j=n?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function rr(n){return n.h?!0:n.g?n.g.size>=n.j:!1}function sr(n){return n.h?1:n.g?n.g.size:0}function Gn(n,s){return n.h?n.h==s:n.g?n.g.has(s):!1}function qn(n,s){n.g?n.g.add(s):n.h=s}function or(n,s){n.h&&n.h==s?n.h=null:n.g&&n.g.has(s)&&n.g.delete(s)}ir.prototype.cancel=function(){if(this.i=ar(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const n of this.g.values())n.cancel();this.g.clear()}};function ar(n){if(n.h!=null)return n.i.concat(n.h.G);if(n.g!=null&&n.g.size!==0){let s=n.i;for(const a of n.g.values())s=s.concat(a.G);return s}return x(n.i)}var cr=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function Xo(n,s){if(n){n=n.split("&");for(let a=0;a<n.length;a++){const l=n[a].indexOf("=");let _,w=null;l>=0?(_=n[a].substring(0,l),w=n[a].substring(l+1)):_=n[a],s(_,w?decodeURIComponent(w.replace(/\+/g," ")):"")}}}function ve(n){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let s;n instanceof ve?(this.l=n.l,Et(this,n.j),this.o=n.o,this.g=n.g,vt(this,n.u),this.h=n.h,Kn(this,pr(n.i)),this.m=n.m):n&&(s=String(n).match(cr))?(this.l=!1,Et(this,s[1]||"",!0),this.o=Tt(s[2]||""),this.g=Tt(s[3]||"",!0),vt(this,s[4]),this.h=Tt(s[5]||"",!0),Kn(this,s[6]||"",!0),this.m=Tt(s[7]||"")):(this.l=!1,this.i=new At(null,this.l))}ve.prototype.toString=function(){const n=[];var s=this.j;s&&n.push(St(s,hr,!0),":");var a=this.g;return(a||s=="file")&&(n.push("//"),(s=this.o)&&n.push(St(s,hr,!0),"@"),n.push(It(a).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a=this.u,a!=null&&n.push(":",String(a))),(a=this.h)&&(this.g&&a.charAt(0)!="/"&&n.push("/"),n.push(St(a,a.charAt(0)=="/"?Zo:Qo,!0))),(a=this.i.toString())&&n.push("?",a),(a=this.m)&&n.push("#",St(a,ta)),n.join("")},ve.prototype.resolve=function(n){const s=se(this);let a=!!n.j;a?Et(s,n.j):a=!!n.o,a?s.o=n.o:a=!!n.g,a?s.g=n.g:a=n.u!=null;var l=n.h;if(a)vt(s,n.u);else if(a=!!n.h){if(l.charAt(0)!="/")if(this.g&&!this.h)l="/"+l;else{var _=s.h.lastIndexOf("/");_!=-1&&(l=s.h.slice(0,_+1)+l)}if(_=l,_==".."||_==".")l="";else if(_.indexOf("./")!=-1||_.indexOf("/.")!=-1){l=_.lastIndexOf("/",0)==0,_=_.split("/");const w=[];for(let T=0;T<_.length;){const P=_[T++];P=="."?l&&T==_.length&&w.push(""):P==".."?((w.length>1||w.length==1&&w[0]!="")&&w.pop(),l&&T==_.length&&w.push("")):(w.push(P),l=!0)}l=w.join("/")}else l=_}return a?s.h=l:a=n.i.toString()!=="",a?Kn(s,pr(n.i)):a=!!n.m,a&&(s.m=n.m),s};function se(n){return new ve(n)}function Et(n,s,a){n.j=a?Tt(s,!0):s,n.j&&(n.j=n.j.replace(/:$/,""))}function vt(n,s){if(s){if(s=Number(s),isNaN(s)||s<0)throw Error("Bad port number "+s);n.u=s}else n.u=null}function Kn(n,s,a){s instanceof At?(n.i=s,na(n.i,n.l)):(a||(s=St(s,ea)),n.i=new At(s,n.l))}function M(n,s,a){n.i.set(s,a)}function tn(n){return M(n,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),n}function Tt(n,s){return n?s?decodeURI(n.replace(/%25/g,"%2525")):decodeURIComponent(n):""}function St(n,s,a){return typeof n=="string"?(n=encodeURI(n).replace(s,Yo),a&&(n=n.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),n):null}function Yo(n){return n=n.charCodeAt(0),"%"+(n>>4&15).toString(16)+(n&15).toString(16)}var hr=/[#\/\?@]/g,Qo=/[#\?:]/g,Zo=/[#\?]/g,ea=/[#\?@]/g,ta=/#/g;function At(n,s){this.h=this.g=null,this.i=n||null,this.j=!!s}function je(n){n.g||(n.g=new Map,n.h=0,n.i&&Xo(n.i,function(s,a){n.add(decodeURIComponent(s.replace(/\+/g," ")),a)}))}i=At.prototype,i.add=function(n,s){je(this),this.i=null,n=tt(this,n);let a=this.g.get(n);return a||this.g.set(n,a=[]),a.push(s),this.h+=1,this};function lr(n,s){je(n),s=tt(n,s),n.g.has(s)&&(n.i=null,n.h-=n.g.get(s).length,n.g.delete(s))}function ur(n,s){return je(n),s=tt(n,s),n.g.has(s)}i.forEach=function(n,s){je(this),this.g.forEach(function(a,l){a.forEach(function(_){n.call(s,_,l,this)},this)},this)};function dr(n,s){je(n);let a=[];if(typeof s=="string")ur(n,s)&&(a=a.concat(n.g.get(tt(n,s))));else for(n=Array.from(n.g.values()),s=0;s<n.length;s++)a=a.concat(n[s]);return a}i.set=function(n,s){return je(this),this.i=null,n=tt(this,n),ur(this,n)&&(this.h-=this.g.get(n).length),this.g.set(n,[s]),this.h+=1,this},i.get=function(n,s){return n?(n=dr(this,n),n.length>0?String(n[0]):s):s};function fr(n,s,a){lr(n,s),a.length>0&&(n.i=null,n.g.set(tt(n,s),x(a)),n.h+=a.length)}i.toString=function(){if(this.i)return this.i;if(!this.g)return"";const n=[],s=Array.from(this.g.keys());for(let l=0;l<s.length;l++){var a=s[l];const _=It(a);a=dr(this,a);for(let w=0;w<a.length;w++){let T=_;a[w]!==""&&(T+="="+It(a[w])),n.push(T)}}return this.i=n.join("&")};function pr(n){const s=new At;return s.i=n.i,n.g&&(s.g=new Map(n.g),s.h=n.h),s}function tt(n,s){return s=String(s),n.j&&(s=s.toLowerCase()),s}function na(n,s){s&&!n.j&&(je(n),n.i=null,n.g.forEach(function(a,l){const _=l.toLowerCase();l!=_&&(lr(this,l),fr(this,_,a))},n)),n.j=s}function ia(n,s){const a=new yt;if(h.Image){const l=new Image;l.onload=b(Te,a,"TestLoadImage: loaded",!0,s,l),l.onerror=b(Te,a,"TestLoadImage: error",!1,s,l),l.onabort=b(Te,a,"TestLoadImage: abort",!1,s,l),l.ontimeout=b(Te,a,"TestLoadImage: timeout",!1,s,l),h.setTimeout(function(){l.ontimeout&&l.ontimeout()},1e4),l.src=n}else s(!1)}function ra(n,s){const a=new yt,l=new AbortController,_=setTimeout(()=>{l.abort(),Te(a,"TestPingServer: timeout",!1,s)},1e4);fetch(n,{signal:l.signal}).then(w=>{clearTimeout(_),w.ok?Te(a,"TestPingServer: ok",!0,s):Te(a,"TestPingServer: server error",!1,s)}).catch(()=>{clearTimeout(_),Te(a,"TestPingServer: error",!1,s)})}function Te(n,s,a,l,_){try{_&&(_.onload=null,_.onerror=null,_.onabort=null,_.ontimeout=null),l(a)}catch{}}function sa(){this.g=new Fo}function Jn(n){this.i=n.Sb||null,this.h=n.ab||!1}A(Jn,Gi),Jn.prototype.g=function(){return new nn(this.i,this.h)};function nn(n,s){$.call(this),this.H=n,this.o=s,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}A(nn,$),i=nn.prototype,i.open=function(n,s){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=n,this.D=s,this.readyState=1,Ct(this)},i.send=function(n){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const s={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};n&&(s.body=n),(this.H||h).fetch(new Request(this.D,s)).then(this.Pa.bind(this),this.ga.bind(this))},i.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,bt(this)),this.readyState=0},i.Pa=function(n){if(this.g&&(this.l=n,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=n.headers,this.readyState=2,Ct(this)),this.g&&(this.readyState=3,Ct(this),this.g)))if(this.responseType==="arraybuffer")n.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof h.ReadableStream<"u"&&"body"in n){if(this.j=n.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;gr(this)}else n.text().then(this.Oa.bind(this),this.ga.bind(this))};function gr(n){n.j.read().then(n.Ma.bind(n)).catch(n.ga.bind(n))}i.Ma=function(n){if(this.g){if(this.o&&n.value)this.response.push(n.value);else if(!this.o){var s=n.value?n.value:new Uint8Array(0);(s=this.B.decode(s,{stream:!n.done}))&&(this.response=this.responseText+=s)}n.done?bt(this):Ct(this),this.readyState==3&&gr(this)}},i.Oa=function(n){this.g&&(this.response=this.responseText=n,bt(this))},i.Na=function(n){this.g&&(this.response=n,bt(this))},i.ga=function(){this.g&&bt(this)};function bt(n){n.readyState=4,n.l=null,n.j=null,n.B=null,Ct(n)}i.setRequestHeader=function(n,s){this.A.append(n,s)},i.getResponseHeader=function(n){return this.h&&this.h.get(n.toLowerCase())||""},i.getAllResponseHeaders=function(){if(!this.h)return"";const n=[],s=this.h.entries();for(var a=s.next();!a.done;)a=a.value,n.push(a[0]+": "+a[1]),a=s.next();return n.join(`\r
`)};function Ct(n){n.onreadystatechange&&n.onreadystatechange.call(n)}Object.defineProperty(nn.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(n){this.m=n?"include":"same-origin"}});function mr(n){let s="";return Yt(n,function(a,l){s+=l,s+=":",s+=a,s+=`\r
`}),s}function Xn(n,s,a){e:{for(l in a){var l=!1;break e}l=!0}l||(a=mr(a),typeof n=="string"?a!=null&&It(a):M(n,s,a))}function V(n){$.call(this),this.headers=new Map,this.L=n||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}A(V,$);var oa=/^https?$/i,aa=["POST","PUT"];i=V.prototype,i.Fa=function(n){this.H=n},i.ea=function(n,s,a,l){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+n);s=s?s.toUpperCase():"GET",this.D=n,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():Yi.g(),this.g.onreadystatechange=S(v(this.Ca,this));try{this.B=!0,this.g.open(s,String(n),!0),this.B=!1}catch(w){_r(this,w);return}if(n=a||"",a=new Map(this.headers),l)if(Object.getPrototypeOf(l)===Object.prototype)for(var _ in l)a.set(_,l[_]);else if(typeof l.keys=="function"&&typeof l.get=="function")for(const w of l.keys())a.set(w,l.get(w));else throw Error("Unknown input type for opt_headers: "+String(l));l=Array.from(a.keys()).find(w=>w.toLowerCase()=="content-type"),_=h.FormData&&n instanceof h.FormData,!(Array.prototype.indexOf.call(aa,s,void 0)>=0)||l||_||a.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[w,T]of a)this.g.setRequestHeader(w,T);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(n),this.v=!1}catch(w){_r(this,w)}};function _r(n,s){n.h=!1,n.g&&(n.j=!0,n.g.abort(),n.j=!1),n.l=s,n.o=5,yr(n),rn(n)}function yr(n){n.A||(n.A=!0,W(n,"complete"),W(n,"error"))}i.abort=function(n){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=n||7,W(this,"complete"),W(this,"abort"),rn(this))},i.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),rn(this,!0)),V.Z.N.call(this)},i.Ca=function(){this.u||(this.B||this.v||this.j?Ir(this):this.Xa())},i.Xa=function(){Ir(this)};function Ir(n){if(n.h&&typeof c<"u"){if(n.v&&Se(n)==4)setTimeout(n.Ca.bind(n),0);else if(W(n,"readystatechange"),Se(n)==4){n.h=!1;try{const w=n.ca();e:switch(w){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var s=!0;break e;default:s=!1}var a;if(!(a=s)){var l;if(l=w===0){let T=String(n.D).match(cr)[1]||null;!T&&h.self&&h.self.location&&(T=h.self.location.protocol.slice(0,-1)),l=!oa.test(T?T.toLowerCase():"")}a=l}if(a)W(n,"complete"),W(n,"success");else{n.o=6;try{var _=Se(n)>2?n.g.statusText:""}catch{_=""}n.l=_+" ["+n.ca()+"]",yr(n)}}finally{rn(n)}}}}function rn(n,s){if(n.g){n.m&&(clearTimeout(n.m),n.m=null);const a=n.g;n.g=null,s||W(n,"ready");try{a.onreadystatechange=null}catch{}}}i.isActive=function(){return!!this.g};function Se(n){return n.g?n.g.readyState:0}i.ca=function(){try{return Se(this)>2?this.g.status:-1}catch{return-1}},i.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},i.La=function(n){if(this.g){var s=this.g.responseText;return n&&s.indexOf(n)==0&&(s=s.substring(n.length)),Vo(s)}};function wr(n){try{if(!n.g)return null;if("response"in n.g)return n.g.response;switch(n.F){case"":case"text":return n.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in n.g)return n.g.mozResponseArrayBuffer}return null}catch{return null}}function ca(n){const s={};n=(n.g&&Se(n)>=2&&n.g.getAllResponseHeaders()||"").split(`\r
`);for(let l=0;l<n.length;l++){if(d(n[l]))continue;var a=Go(n[l]);const _=a[0];if(a=a[1],typeof a!="string")continue;a=a.trim();const w=s[_]||[];s[_]=w,w.push(a)}No(s,function(l){return l.join(", ")})}i.ya=function(){return this.o},i.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function Pt(n,s,a){return a&&a.internalChannelParams&&a.internalChannelParams[n]||s}function Er(n){this.za=0,this.i=[],this.j=new yt,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=Pt("failFast",!1,n),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=Pt("baseRetryDelayMs",5e3,n),this.Za=Pt("retryDelaySeedMs",1e4,n),this.Ta=Pt("forwardChannelMaxRetries",2,n),this.va=Pt("forwardChannelRequestTimeoutMs",2e4,n),this.ma=n&&n.xmlHttpFactory||void 0,this.Ua=n&&n.Rb||void 0,this.Aa=n&&n.useFetchStreams||!1,this.O=void 0,this.L=n&&n.supportsCrossDomainXhr||!1,this.M="",this.h=new ir(n&&n.concurrentRequestLimit),this.Ba=new sa,this.S=n&&n.fastHandshake||!1,this.R=n&&n.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=n&&n.Pb||!1,n&&n.ua&&this.j.ua(),n&&n.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&n&&n.detectBufferingProxy||!1,this.ia=void 0,n&&n.longPollingTimeout&&n.longPollingTimeout>0&&(this.ia=n.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}i=Er.prototype,i.ka=8,i.I=1,i.connect=function(n,s,a,l){z(0),this.W=n,this.H=s||{},a&&l!==void 0&&(this.H.OSID=a,this.H.OAID=l),this.F=this.X,this.J=kr(this,null,this.W),on(this)};function Yn(n){if(vr(n),n.I==3){var s=n.V++,a=se(n.J);if(M(a,"SID",n.M),M(a,"RID",s),M(a,"TYPE","terminate"),Rt(n,a),s=new Ee(n,n.j,s),s.M=2,s.A=tn(se(a)),a=!1,h.navigator&&h.navigator.sendBeacon)try{a=h.navigator.sendBeacon(s.A.toString(),"")}catch{}!a&&h.Image&&(new Image().src=s.A,a=!0),a||(s.g=Or(s.j,null),s.g.ea(s.A)),s.F=Date.now(),en(s)}Rr(n)}function sn(n){n.g&&(Zn(n),n.g.cancel(),n.g=null)}function vr(n){sn(n),n.v&&(h.clearTimeout(n.v),n.v=null),an(n),n.h.cancel(),n.m&&(typeof n.m=="number"&&h.clearTimeout(n.m),n.m=null)}function on(n){if(!rr(n.h)&&!n.m){n.m=!0;var s=n.Ea;we||u(),Q||(we(),Q=!0),g.add(s,n),n.D=0}}function ha(n,s){return sr(n.h)>=n.h.j-(n.m?1:0)?!1:n.m?(n.i=s.G.concat(n.i),!0):n.I==1||n.I==2||n.D>=(n.Sa?0:n.Ta)?!1:(n.m=_t(v(n.Ea,n,s),Pr(n,n.D)),n.D++,!0)}i.Ea=function(n){if(this.m)if(this.m=null,this.I==1){if(!n){this.V=Math.floor(Math.random()*1e5),n=this.V++;const _=new Ee(this,this.j,n);let w=this.o;if(this.U&&(w?(w=Ui(w),Vi(w,this.U)):w=this.U),this.u!==null||this.R||(_.J=w,w=null),this.S)e:{for(var s=0,a=0;a<this.i.length;a++){t:{var l=this.i[a];if("__data__"in l.map&&(l=l.map.__data__,typeof l=="string")){l=l.length;break t}l=void 0}if(l===void 0)break;if(s+=l,s>4096){s=a;break e}if(s===4096||a===this.i.length-1){s=a+1;break e}}s=1e3}else s=1e3;s=Sr(this,_,s),a=se(this.J),M(a,"RID",n),M(a,"CVER",22),this.G&&M(a,"X-HTTP-Session-Id",this.G),Rt(this,a),w&&(this.R?s="headers="+It(mr(w))+"&"+s:this.u&&Xn(a,this.u,w)),qn(this.h,_),this.Ra&&M(a,"TYPE","init"),this.S?(M(a,"$req",s),M(a,"SID","null"),_.U=!0,$n(_,a,null)):$n(_,a,s),this.I=2}}else this.I==3&&(n?Tr(this,n):this.i.length==0||rr(this.h)||Tr(this))};function Tr(n,s){var a;s?a=s.l:a=n.V++;const l=se(n.J);M(l,"SID",n.M),M(l,"RID",a),M(l,"AID",n.K),Rt(n,l),n.u&&n.o&&Xn(l,n.u,n.o),a=new Ee(n,n.j,a,n.D+1),n.u===null&&(a.J=n.o),s&&(n.i=s.G.concat(n.i)),s=Sr(n,a,1e3),a.H=Math.round(n.va*.5)+Math.round(n.va*.5*Math.random()),qn(n.h,a),$n(a,l,s)}function Rt(n,s){n.H&&Yt(n.H,function(a,l){M(s,l,a)}),n.l&&Yt({},function(a,l){M(s,l,a)})}function Sr(n,s,a){a=Math.min(n.i.length,a);const l=n.l?v(n.l.Ka,n.l,n):null;e:{var _=n.i;let P=-1;for(;;){const B=["count="+a];P==-1?a>0?(P=_[0].g,B.push("ofs="+P)):P=0:B.push("ofs="+P);let D=!0;for(let H=0;H<a;H++){var w=_[H].g;const oe=_[H].map;if(w-=P,w<0)P=Math.max(0,_[H].g-100),D=!1;else try{w="req"+w+"_"||"";try{var T=oe instanceof Map?oe:Object.entries(oe);for(const[He,Ae]of T){let be=Ae;y(Ae)&&(be=Un(Ae)),B.push(w+He+"="+encodeURIComponent(be))}}catch(He){throw B.push(w+"type="+encodeURIComponent("_badmap")),He}}catch{l&&l(oe)}}if(D){T=B.join("&");break e}}T=void 0}return n=n.i.splice(0,a),s.G=n,T}function Ar(n){if(!n.g&&!n.v){n.Y=1;var s=n.Da;we||u(),Q||(we(),Q=!0),g.add(s,n),n.A=0}}function Qn(n){return n.g||n.v||n.A>=3?!1:(n.Y++,n.v=_t(v(n.Da,n),Pr(n,n.A)),n.A++,!0)}i.Da=function(){if(this.v=null,br(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var n=4*this.T;this.j.info("BP detection timer enabled: "+n),this.B=_t(v(this.Wa,this),n)}},i.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,z(10),sn(this),br(this))};function Zn(n){n.B!=null&&(h.clearTimeout(n.B),n.B=null)}function br(n){n.g=new Ee(n,n.j,"rpc",n.Y),n.u===null&&(n.g.J=n.o),n.g.P=0;var s=se(n.na);M(s,"RID","rpc"),M(s,"SID",n.M),M(s,"AID",n.K),M(s,"CI",n.F?"0":"1"),!n.F&&n.ia&&M(s,"TO",n.ia),M(s,"TYPE","xmlhttp"),Rt(n,s),n.u&&n.o&&Xn(s,n.u,n.o),n.O&&(n.g.H=n.O);var a=n.g;n=n.ba,a.M=1,a.A=tn(se(s)),a.u=null,a.R=!0,er(a,n)}i.Va=function(){this.C!=null&&(this.C=null,sn(this),Qn(this),z(19))};function an(n){n.C!=null&&(h.clearTimeout(n.C),n.C=null)}function Cr(n,s){var a=null;if(n.g==s){an(n),Zn(n),n.g=null;var l=2}else if(Gn(n.h,s))a=s.G,or(n.h,s),l=1;else return;if(n.I!=0){if(s.o)if(l==1){a=s.u?s.u.length:0,s=Date.now()-s.F;var _=n.D;l=Fn(),W(l,new Xi(l,a)),on(n)}else Ar(n);else if(_=s.m,_==3||_==0&&s.X>0||!(l==1&&ha(n,s)||l==2&&Qn(n)))switch(a&&a.length>0&&(s=n.h,s.i=s.i.concat(a)),_){case 1:Be(n,5);break;case 4:Be(n,10);break;case 3:Be(n,6);break;default:Be(n,2)}}}function Pr(n,s){let a=n.Qa+Math.floor(Math.random()*n.Za);return n.isActive()||(a*=2),a*s}function Be(n,s){if(n.j.info("Error code "+s),s==2){var a=v(n.bb,n),l=n.Ua;const _=!l;l=new ve(l||"//www.google.com/images/cleardot.gif"),h.location&&h.location.protocol=="http"||Et(l,"https"),tn(l),_?ia(l.toString(),a):ra(l.toString(),a)}else z(2);n.I=0,n.l&&n.l.pa(s),Rr(n),vr(n)}i.bb=function(n){n?(this.j.info("Successfully pinged google.com"),z(2)):(this.j.info("Failed to ping google.com"),z(1))};function Rr(n){if(n.I=0,n.ja=[],n.l){const s=ar(n.h);(s.length!=0||n.i.length!=0)&&(L(n.ja,s),L(n.ja,n.i),n.h.i.length=0,x(n.i),n.i.length=0),n.l.oa()}}function kr(n,s,a){var l=a instanceof ve?se(a):new ve(a);if(l.g!="")s&&(l.g=s+"."+l.g),vt(l,l.u);else{var _=h.location;l=_.protocol,s=s?s+"."+_.hostname:_.hostname,_=+_.port;const w=new ve(null);l&&Et(w,l),s&&(w.g=s),_&&vt(w,_),a&&(w.h=a),l=w}return a=n.G,s=n.wa,a&&s&&M(l,a,s),M(l,"VER",n.ka),Rt(n,l),l}function Or(n,s,a){if(s&&!n.L)throw Error("Can't create secondary domain capable XhrIo object.");return s=n.Aa&&!n.ma?new V(new Jn({ab:a})):new V(n.ma),s.Fa(n.L),s}i.isActive=function(){return!!this.l&&this.l.isActive(this)};function Nr(){}i=Nr.prototype,i.ra=function(){},i.qa=function(){},i.pa=function(){},i.oa=function(){},i.isActive=function(){return!0},i.Ka=function(){};function Z(n,s){$.call(this),this.g=new Er(s),this.l=n,this.h=s&&s.messageUrlParams||null,n=s&&s.messageHeaders||null,s&&s.clientProtocolHeaderRequired&&(n?n["X-Client-Protocol"]="webchannel":n={"X-Client-Protocol":"webchannel"}),this.g.o=n,n=s&&s.initMessageHeaders||null,s&&s.messageContentType&&(n?n["X-WebChannel-Content-Type"]=s.messageContentType:n={"X-WebChannel-Content-Type":s.messageContentType}),s&&s.sa&&(n?n["X-WebChannel-Client-Profile"]=s.sa:n={"X-WebChannel-Client-Profile":s.sa}),this.g.U=n,(n=s&&s.Qb)&&!d(n)&&(this.g.u=n),this.A=s&&s.supportsCrossDomainXhr||!1,this.v=s&&s.sendRawJson||!1,(s=s&&s.httpSessionIdParam)&&!d(s)&&(this.g.G=s,n=this.h,n!==null&&s in n&&(n=this.h,s in n&&delete n[s])),this.j=new nt(this)}A(Z,$),Z.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},Z.prototype.close=function(){Yn(this.g)},Z.prototype.o=function(n){var s=this.g;if(typeof n=="string"){var a={};a.__data__=n,n=a}else this.v&&(a={},a.__data__=Un(n),n=a);s.i.push(new Jo(s.Ya++,n)),s.I==3&&on(s)},Z.prototype.N=function(){this.g.l=null,delete this.j,Yn(this.g),delete this.g,Z.Z.N.call(this)};function Dr(n){xn.call(this),n.__headers__&&(this.headers=n.__headers__,this.statusCode=n.__status__,delete n.__headers__,delete n.__status__);var s=n.__sm__;if(s){e:{for(const a in s){n=a;break e}n=void 0}(this.i=n)&&(n=this.i,s=s!==null&&n in s?s[n]:void 0),this.data=s}else this.data=n}A(Dr,xn);function Lr(){Vn.call(this),this.status=1}A(Lr,Vn);function nt(n){this.g=n}A(nt,Nr),nt.prototype.ra=function(){W(this.g,"a")},nt.prototype.qa=function(n){W(this.g,new Dr(n))},nt.prototype.pa=function(n){W(this.g,new Lr)},nt.prototype.oa=function(){W(this.g,"b")},Z.prototype.send=Z.prototype.o,Z.prototype.open=Z.prototype.m,Z.prototype.close=Z.prototype.close,jn.NO_ERROR=0,jn.TIMEOUT=8,jn.HTTP_ERROR=6,zo.COMPLETE="complete",jo.EventType=gt,gt.OPEN="a",gt.CLOSE="b",gt.ERROR="c",gt.MESSAGE="d",$.prototype.listen=$.prototype.J,V.prototype.listenOnce=V.prototype.K,V.prototype.getLastError=V.prototype.Ha,V.prototype.getLastErrorCode=V.prototype.ya,V.prototype.getStatus=V.prototype.ca,V.prototype.getResponseJson=V.prototype.La,V.prototype.getResponseText=V.prototype.la,V.prototype.send=V.prototype.ea,V.prototype.setWithCredentials=V.prototype.Fa}).apply(typeof ln<"u"?ln:typeof self<"u"?self:typeof window<"u"?window:{});const fs="@firebase/firestore",ps="4.9.3";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class G{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}G.UNAUTHENTICATED=new G(null),G.GOOGLE_CREDENTIALS=new G("google-credentials-uid"),G.FIRST_PARTY=new G("first-party-uid"),G.MOCK_USER=new G("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Kt="12.7.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lt=new wi("@firebase/firestore");function ie(i,...e){if(lt.logLevel<=N.DEBUG){const t=e.map(Ni);lt.debug(`Firestore (${Kt}): ${i}`,...t)}}function vo(i,...e){if(lt.logLevel<=N.ERROR){const t=e.map(Ni);lt.error(`Firestore (${Kt}): ${i}`,...t)}}function ru(i,...e){if(lt.logLevel<=N.WARN){const t=e.map(Ni);lt.warn(`Firestore (${Kt}): ${i}`,...t)}}function Ni(i){if(typeof i=="string")return i;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/return(function(t){return JSON.stringify(t)})(i)}catch{return i}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Bt(i,e,t){let r="Unexpected state";typeof e=="string"?r=e:t=e,To(i,r,t)}function To(i,e,t){let r=`FIRESTORE (${Kt}) INTERNAL ASSERTION FAILED: ${e} (ID: ${i.toString(16)})`;if(t!==void 0)try{r+=" CONTEXT: "+JSON.stringify(t)}catch{r+=" CONTEXT: "+t}throw vo(r),new Error(r)}function Lt(i,e,t,r){let o="Unexpected state";typeof t=="string"?o=t:r=t,i||To(e,o,r)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const k={CANCELLED:"cancelled",INVALID_ARGUMENT:"invalid-argument",FAILED_PRECONDITION:"failed-precondition"};class O extends _e{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mt{constructor(){this.promise=new Promise(((e,t)=>{this.resolve=e,this.reject=t}))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class So{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class su{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable((()=>t(G.UNAUTHENTICATED)))}shutdown(){}}class ou{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable((()=>t(this.token.user)))}shutdown(){this.changeListener=null}}class au{constructor(e){this.t=e,this.currentUser=G.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){Lt(this.o===void 0,42304);let r=this.i;const o=E=>this.i!==r?(r=this.i,t(E)):Promise.resolve();let c=new Mt;this.o=()=>{this.i++,this.currentUser=this.u(),c.resolve(),c=new Mt,e.enqueueRetryable((()=>o(this.currentUser)))};const h=()=>{const E=c;e.enqueueRetryable((async()=>{await E.promise,await o(this.currentUser)}))},y=E=>{ie("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=E,this.o&&(this.auth.addAuthTokenListener(this.o),h())};this.t.onInit((E=>y(E))),setTimeout((()=>{if(!this.auth){const E=this.t.getImmediate({optional:!0});E?y(E):(ie("FirebaseAuthCredentialsProvider","Auth not yet detected"),c.resolve(),c=new Mt)}}),0),h()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then((r=>this.i!==e?(ie("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?(Lt(typeof r.accessToken=="string",31837,{l:r}),new So(r.accessToken,this.currentUser)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return Lt(e===null||typeof e=="string",2055,{h:e}),new G(e)}}class cu{constructor(e,t,r){this.P=e,this.T=t,this.I=r,this.type="FirstParty",this.user=G.FIRST_PARTY,this.A=new Map}R(){return this.I?this.I():null}get headers(){this.A.set("X-Goog-AuthUser",this.P);const e=this.R();return e&&this.A.set("Authorization",e),this.T&&this.A.set("X-Goog-Iam-Authorization-Token",this.T),this.A}}class hu{constructor(e,t,r){this.P=e,this.T=t,this.I=r}getToken(){return Promise.resolve(new cu(this.P,this.T,this.I))}start(e,t){e.enqueueRetryable((()=>t(G.FIRST_PARTY)))}shutdown(){}invalidateToken(){}}class gs{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class lu{constructor(e,t){this.V=t,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,te(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,t){Lt(this.o===void 0,3512);const r=c=>{c.error!=null&&ie("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${c.error.message}`);const h=c.token!==this.m;return this.m=c.token,ie("FirebaseAppCheckTokenProvider",`Received ${h?"new":"existing"} token.`),h?t(c.token):Promise.resolve()};this.o=c=>{e.enqueueRetryable((()=>r(c)))};const o=c=>{ie("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=c,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit((c=>o(c))),setTimeout((()=>{if(!this.appCheck){const c=this.V.getImmediate({optional:!0});c?o(c):ie("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}}),0)}getToken(){if(this.p)return Promise.resolve(new gs(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then((t=>t?(Lt(typeof t.token=="string",44558,{tokenResult:t}),this.m=t.token,new gs(t.token)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function uu(i){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(i);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let r=0;r<i;r++)t[r]=Math.floor(256*Math.random());return t}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class du{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let r="";for(;r.length<20;){const o=uu(40);for(let c=0;c<o.length;++c)r.length<20&&o[c]<t&&(r+=e.charAt(o[c]%62))}return r}}function Ue(i,e){return i<e?-1:i>e?1:0}function fu(i,e){const t=Math.min(i.length,e.length);for(let r=0;r<t;r++){const o=i.charAt(r),c=e.charAt(r);if(o!==c)return ci(o)===ci(c)?Ue(o,c):ci(o)?1:-1}return Ue(i.length,e.length)}const pu=55296,gu=57343;function ci(i){const e=i.charCodeAt(0);return e>=pu&&e<=gu}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ms="__name__";class ae{constructor(e,t,r){t===void 0?t=0:t>e.length&&Bt(637,{offset:t,range:e.length}),r===void 0?r=e.length-t:r>e.length-t&&Bt(1746,{length:r,range:e.length-t}),this.segments=e,this.offset=t,this.len=r}get length(){return this.len}isEqual(e){return ae.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof ae?e.forEach((r=>{t.push(r)})):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,r=this.limit();t<r;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const r=Math.min(e.length,t.length);for(let o=0;o<r;o++){const c=ae.compareSegments(e.get(o),t.get(o));if(c!==0)return c}return Ue(e.length,t.length)}static compareSegments(e,t){const r=ae.isNumericId(e),o=ae.isNumericId(t);return r&&!o?-1:!r&&o?1:r&&o?ae.extractNumericId(e).compare(ae.extractNumericId(t)):fu(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return Oi.fromString(e.substring(4,e.length-2))}}class ee extends ae{construct(e,t,r){return new ee(e,t,r)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const r of e){if(r.indexOf("//")>=0)throw new O(k.INVALID_ARGUMENT,`Invalid segment (${r}). Paths must not contain // in them.`);t.push(...r.split("/").filter((o=>o.length>0)))}return new ee(t)}static emptyPath(){return new ee([])}}const mu=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class We extends ae{construct(e,t,r){return new We(e,t,r)}static isValidIdentifier(e){return mu.test(e)}canonicalString(){return this.toArray().map((e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),We.isValidIdentifier(e)||(e="`"+e+"`"),e))).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===ms}static keyField(){return new We([ms])}static fromServerFormat(e){const t=[];let r="",o=0;const c=()=>{if(r.length===0)throw new O(k.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(r),r=""};let h=!1;for(;o<e.length;){const y=e[o];if(y==="\\"){if(o+1===e.length)throw new O(k.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const E=e[o+1];if(E!=="\\"&&E!=="."&&E!=="`")throw new O(k.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);r+=E,o+=2}else y==="`"?(h=!h,o++):y!=="."||h?(r+=y,o++):(c(),o++)}if(c(),h)throw new O(k.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new We(t)}static emptyPath(){return new We([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ze{constructor(e){this.path=e}static fromPath(e){return new ze(ee.fromString(e))}static fromName(e){return new ze(ee.fromString(e).popFirst(5))}static empty(){return new ze(ee.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&ee.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return ee.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new ze(new ee(e.slice()))}}function _u(i,e,t,r){if(e===!0&&r===!0)throw new O(k.INVALID_ARGUMENT,`${i} and ${t} cannot be used together.`)}function yu(i){return typeof i=="object"&&i!==null&&(Object.getPrototypeOf(i)===Object.prototype||Object.getPrototypeOf(i)===null)}function Iu(i){if(i===void 0)return"undefined";if(i===null)return"null";if(typeof i=="string")return i.length>20&&(i=`${i.substring(0,20)}...`),JSON.stringify(i);if(typeof i=="number"||typeof i=="boolean")return""+i;if(typeof i=="object"){if(i instanceof Array)return"an array";{const e=(function(r){return r.constructor?r.constructor.name:null})(i);return e?`a custom ${e} object`:"an object"}}return typeof i=="function"?"a function":Bt(12329,{type:typeof i})}function wu(i,e){if("_delegate"in i&&(i=i._delegate),!(i instanceof e)){if(e.name===i.constructor.name)throw new O(k.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=Iu(i);throw new O(k.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return i}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function j(i,e){const t={typeString:i};return e&&(t.value=e),t}function Jt(i,e){if(!yu(i))throw new O(k.INVALID_ARGUMENT,"JSON must be an object");let t;for(const r in e)if(e[r]){const o=e[r].typeString,c="value"in e[r]?{value:e[r].value}:void 0;if(!(r in i)){t=`JSON missing required field: '${r}'`;break}const h=i[r];if(o&&typeof h!==o){t=`JSON field '${r}' must be a ${o}.`;break}if(c!==void 0&&h!==c.value){t=`Expected '${r}' field to equal '${c.value}'`;break}}if(t)throw new O(k.INVALID_ARGUMENT,t);return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _s=-62135596800,ys=1e6;class ce{static now(){return ce.fromMillis(Date.now())}static fromDate(e){return ce.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),r=Math.floor((e-1e3*t)*ys);return new ce(t,r)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new O(k.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new O(k.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<_s)throw new O(k.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new O(k.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/ys}_compareTo(e){return this.seconds===e.seconds?Ue(this.nanoseconds,e.nanoseconds):Ue(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:ce._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(Jt(e,ce._jsonSchema))return new ce(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-_s;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}ce._jsonSchemaVersion="firestore/timestamp/1.0",ce._jsonSchema={type:j("string",ce._jsonSchemaVersion),seconds:j("number"),nanoseconds:j("number")};function Eu(i){return i.name==="IndexedDbTransactionError"}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vu extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ye{constructor(e){this.binaryString=e}static fromBase64String(e){const t=(function(o){try{return atob(o)}catch(c){throw typeof DOMException<"u"&&c instanceof DOMException?new vu("Invalid base64 string: "+c):c}})(e);return new Ye(t)}static fromUint8Array(e){const t=(function(o){let c="";for(let h=0;h<o.length;++h)c+=String.fromCharCode(o[h]);return c})(e);return new Ye(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return(function(t){return btoa(t)})(this.binaryString)}toUint8Array(){return(function(t){const r=new Uint8Array(t.length);for(let o=0;o<t.length;o++)r[o]=t.charCodeAt(o);return r})(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return Ue(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}Ye.EMPTY_BYTE_STRING=new Ye("");const yi="(default)";class Sn{constructor(e,t){this.projectId=e,this.database=t||yi}static empty(){return new Sn("","")}get isDefaultDatabase(){return this.database===yi}isEqual(e){return e instanceof Sn&&e.projectId===this.projectId&&e.database===this.database}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tu{constructor(e,t=null,r=[],o=[],c=null,h="F",y=null,E=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=r,this.filters=o,this.limit=c,this.limitType=h,this.startAt=y,this.endAt=E,this.Ie=null,this.Ee=null,this.de=null,this.startAt,this.endAt}}function Su(i){return new Tu(i)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Is,R;(R=Is||(Is={}))[R.OK=0]="OK",R[R.CANCELLED=1]="CANCELLED",R[R.UNKNOWN=2]="UNKNOWN",R[R.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",R[R.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",R[R.NOT_FOUND=5]="NOT_FOUND",R[R.ALREADY_EXISTS=6]="ALREADY_EXISTS",R[R.PERMISSION_DENIED=7]="PERMISSION_DENIED",R[R.UNAUTHENTICATED=16]="UNAUTHENTICATED",R[R.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",R[R.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",R[R.ABORTED=10]="ABORTED",R[R.OUT_OF_RANGE=11]="OUT_OF_RANGE",R[R.UNIMPLEMENTED=12]="UNIMPLEMENTED",R[R.INTERNAL=13]="INTERNAL",R[R.UNAVAILABLE=14]="UNAVAILABLE",R[R.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */new Oi([4294967295,4294967295],0);/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Au=41943040;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bu=1048576;function hi(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cu{constructor(e,t,r=1e3,o=1.5,c=6e4){this.Mi=e,this.timerId=t,this.d_=r,this.A_=o,this.R_=c,this.V_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.V_=0}g_(){this.V_=this.R_}p_(e){this.cancel();const t=Math.floor(this.V_+this.y_()),r=Math.max(0,Date.now()-this.f_),o=Math.max(0,t-r);o>0&&ie("ExponentialBackoff",`Backing off for ${o} ms (base delay: ${this.V_} ms, delay with jitter: ${t} ms, last attempt: ${r} ms ago)`),this.m_=this.Mi.enqueueAfterDelay(this.timerId,o,(()=>(this.f_=Date.now(),e()))),this.V_*=this.A_,this.V_<this.d_&&(this.V_=this.d_),this.V_>this.R_&&(this.V_=this.R_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.V_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Di{constructor(e,t,r,o,c){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=r,this.op=o,this.removalCallback=c,this.deferred=new Mt,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch((h=>{}))}get promise(){return this.deferred.promise}static createAndSchedule(e,t,r,o,c){const h=Date.now()+r,y=new Di(e,t,h,o,c);return y.start(r),y}start(e){this.timerHandle=setTimeout((()=>this.handleDelayElapsed()),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new O(k.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget((()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then((e=>this.deferred.resolve(e)))):Promise.resolve()))}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}var ws,Es;(Es=ws||(ws={})).Ma="default",Es.Cache="cache";/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pu(i){const e={};return i.timeoutSeconds!==void 0&&(e.timeoutSeconds=i.timeoutSeconds),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vs=new Map;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ao="firestore.googleapis.com",Ts=!0;class Ss{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new O(k.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=Ao,this.ssl=Ts}else this.host=e.host,this.ssl=e.ssl??Ts;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=Au;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<bu)throw new O(k.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}_u("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=Pu(e.experimentalLongPollingOptions??{}),(function(r){if(r.timeoutSeconds!==void 0){if(isNaN(r.timeoutSeconds))throw new O(k.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (must not be NaN)`);if(r.timeoutSeconds<5)throw new O(k.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (minimum allowed value is 5)`);if(r.timeoutSeconds>30)throw new O(k.INVALID_ARGUMENT,`invalid long polling timeout: ${r.timeoutSeconds} (maximum allowed value is 30)`)}})(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&(function(r,o){return r.timeoutSeconds===o.timeoutSeconds})(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class bo{constructor(e,t,r,o){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=r,this._app=o,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new Ss({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new O(k.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new O(k.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new Ss(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=(function(r){if(!r)return new su;switch(r.type){case"firstParty":return new hu(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new O(k.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}})(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return(function(t){const r=vs.get(t);r&&(ie("ComponentProvider","Removing Datastore"),vs.delete(t),r.terminate())})(this),Promise.resolve()}}function Ru(i,e,t,r={}){var v;i=wu(i,bo);const o=Ht(e),c=i._getSettings(),h={...c,emulatorOptions:i._getEmulatorOptions()},y=`${e}:${t}`;o&&(Ms(`https://${y}`),Us("Firestore",!0)),c.host!==Ao&&c.host!==y&&ru("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const E={...c,host:y,ssl:o,emulatorOptions:r};if(!Ke(E,h)&&(i._setSettings(E),r.mockUserToken)){let b,A;if(typeof r.mockUserToken=="string")b=r.mockUserToken,A=G.MOCK_USER;else{b=wa(r.mockUserToken,(v=i._app)==null?void 0:v.options.projectId);const S=r.mockUserToken.sub||r.mockUserToken.user_id;if(!S)throw new O(k.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");A=new G(S)}i._authCredentials=new ou(new So(b,A))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Li{constructor(e,t,r){this.converter=t,this._query=r,this.type="query",this.firestore=e}withConverter(e){return new Li(this.firestore,e,this._query)}}class he{constructor(e,t,r){this.converter=t,this._key=r,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new Mi(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new he(this.firestore,e,this._key)}toJSON(){return{type:he._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,r){if(Jt(t,he._jsonSchema))return new he(e,r||null,new ze(ee.fromString(t.referencePath)))}}he._jsonSchemaVersion="firestore/documentReference/1.0",he._jsonSchema={type:j("string",he._jsonSchemaVersion),referencePath:j("string")};class Mi extends Li{constructor(e,t,r){super(e,t,Su(r)),this._path=r,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new he(this.firestore,null,new ze(e))}withConverter(e){return new Mi(this.firestore,e,this._path)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const As="AsyncQueue";class bs{constructor(e=Promise.resolve()){this.Xu=[],this.ec=!1,this.tc=[],this.nc=null,this.rc=!1,this.sc=!1,this.oc=[],this.M_=new Cu(this,"async_queue_retry"),this._c=()=>{const r=hi();r&&ie(As,"Visibility state changed to "+r.visibilityState),this.M_.w_()},this.ac=e;const t=hi();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this._c)}get isShuttingDown(){return this.ec}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.uc(),this.cc(e)}enterRestrictedMode(e){if(!this.ec){this.ec=!0,this.sc=e||!1;const t=hi();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this._c)}}enqueue(e){if(this.uc(),this.ec)return new Promise((()=>{}));const t=new Mt;return this.cc((()=>this.ec&&this.sc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise))).then((()=>t.promise))}enqueueRetryable(e){this.enqueueAndForget((()=>(this.Xu.push(e),this.lc())))}async lc(){if(this.Xu.length!==0){try{await this.Xu[0](),this.Xu.shift(),this.M_.reset()}catch(e){if(!Eu(e))throw e;ie(As,"Operation failed with retryable error: "+e)}this.Xu.length>0&&this.M_.p_((()=>this.lc()))}}cc(e){const t=this.ac.then((()=>(this.rc=!0,e().catch((r=>{throw this.nc=r,this.rc=!1,vo("INTERNAL UNHANDLED ERROR: ",Cs(r)),r})).then((r=>(this.rc=!1,r))))));return this.ac=t,t}enqueueAfterDelay(e,t,r){this.uc(),this.oc.indexOf(e)>-1&&(t=0);const o=Di.createAndSchedule(this,e,t,r,(c=>this.hc(c)));return this.tc.push(o),o}uc(){this.nc&&Bt(47125,{Pc:Cs(this.nc)})}verifyOperationInProgress(){}async Tc(){let e;do e=this.ac,await e;while(e!==this.ac)}Ic(e){for(const t of this.tc)if(t.timerId===e)return!0;return!1}Ec(e){return this.Tc().then((()=>{this.tc.sort(((t,r)=>t.targetTimeMs-r.targetTimeMs));for(const t of this.tc)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.Tc()}))}dc(e){this.oc.push(e)}hc(e){const t=this.tc.indexOf(e);this.tc.splice(t,1)}}function Cs(i){let e=i.message||"";return i.stack&&(e=i.stack.includes(i.message)?i.stack:i.message+`
`+i.stack),e}class ku extends bo{constructor(e,t,r,o){super(e,t,r,o),this.type="firestore",this._queue=new bs,this._persistenceKey=(o==null?void 0:o.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new bs(e),this._firestoreClient=void 0,await e}}}function ju(i,e){const t=typeof i=="object"?i:Fs(),r=typeof i=="string"?i:yi,o=vi(t,"firestore").getImmediate({identifier:r});if(!o._initialized){const c=ya("firestore");c&&Ru(o,...c)}return o}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class de{constructor(e){this._byteString=e}static fromBase64String(e){try{return new de(Ye.fromBase64String(e))}catch(t){throw new O(k.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new de(Ye.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:de._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(Jt(e,de._jsonSchema))return de.fromBase64String(e.bytes)}}de._jsonSchemaVersion="firestore/bytes/1.0",de._jsonSchema={type:j("string",de._jsonSchemaVersion),bytes:j("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Co{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new O(k.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new We(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ge{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new O(k.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new O(k.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return Ue(this._lat,e._lat)||Ue(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:Ge._jsonSchemaVersion}}static fromJSON(e){if(Jt(e,Ge._jsonSchema))return new Ge(e.latitude,e.longitude)}}Ge._jsonSchemaVersion="firestore/geoPoint/1.0",Ge._jsonSchema={type:j("string",Ge._jsonSchemaVersion),latitude:j("number"),longitude:j("number")};/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qe{constructor(e){this._values=(e||[]).map((t=>t))}toArray(){return this._values.map((e=>e))}isEqual(e){return(function(r,o){if(r.length!==o.length)return!1;for(let c=0;c<r.length;++c)if(r[c]!==o[c])return!1;return!0})(this._values,e._values)}toJSON(){return{type:qe._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(Jt(e,qe._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every((t=>typeof t=="number")))return new qe(e.vectorValues);throw new O(k.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}qe._jsonSchemaVersion="firestore/vectorValue/1.0",qe._jsonSchema={type:j("string",qe._jsonSchemaVersion),vectorValues:j("object")};const Ou=new RegExp("[~\\*/\\[\\]]");function Nu(i,e,t){if(e.search(Ou)>=0)throw Ps(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,i);try{return new Co(...e.split("."))._internalPath}catch{throw Ps(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,i)}}function Ps(i,e,t,r,o){let c=`Function ${e}() called with invalid data`;c+=". ";let h="";return new O(k.INVALID_ARGUMENT,c+i+h)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Po{constructor(e,t,r,o,c){this._firestore=e,this._userDataWriter=t,this._key=r,this._document=o,this._converter=c}get id(){return this._key.path.lastSegment()}get ref(){return new he(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new Du(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const t=this._document.data.field(Ro("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class Du extends Po{data(){return super.data()}}function Ro(i,e){return typeof e=="string"?Nu(i,e):e instanceof Co?e._internalPath:e._delegate._internalPath}class un{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class at extends Po{constructor(e,t,r,o,c,h){super(e,t,r,o,h),this._firestore=e,this._firestoreImpl=e,this.metadata=c}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new mn(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const r=this._document.data.field(Ro("DocumentSnapshot.get",e));if(r!==null)return this._userDataWriter.convertValue(r,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new O(k.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=at._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}}at._jsonSchemaVersion="firestore/documentSnapshot/1.0",at._jsonSchema={type:j("string",at._jsonSchemaVersion),bundleSource:j("string","DocumentSnapshot"),bundleName:j("string"),bundle:j("string")};class mn extends at{data(e={}){return super.data(e)}}class Ut{constructor(e,t,r,o){this._firestore=e,this._userDataWriter=t,this._snapshot=o,this.metadata=new un(o.hasPendingWrites,o.fromCache),this.query=r}get docs(){const e=[];return this.forEach((t=>e.push(t))),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach((r=>{e.call(t,new mn(this._firestore,this._userDataWriter,r.key,r,new un(this._snapshot.mutatedKeys.has(r.key),this._snapshot.fromCache),this.query.converter))}))}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new O(k.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=(function(o,c){if(o._snapshot.oldDocs.isEmpty()){let h=0;return o._snapshot.docChanges.map((y=>{const E=new mn(o._firestore,o._userDataWriter,y.doc.key,y.doc,new un(o._snapshot.mutatedKeys.has(y.doc.key),o._snapshot.fromCache),o.query.converter);return y.doc,{type:"added",doc:E,oldIndex:-1,newIndex:h++}}))}{let h=o._snapshot.oldDocs;return o._snapshot.docChanges.filter((y=>c||y.type!==3)).map((y=>{const E=new mn(o._firestore,o._userDataWriter,y.doc.key,y.doc,new un(o._snapshot.mutatedKeys.has(y.doc.key),o._snapshot.fromCache),o.query.converter);let v=-1,b=-1;return y.type!==0&&(v=h.indexOf(y.doc.key),h=h.delete(y.doc.key)),y.type!==1&&(h=h.add(y.doc),b=h.indexOf(y.doc.key)),{type:Lu(y.type),doc:E,oldIndex:v,newIndex:b}}))}})(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new O(k.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=Ut._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=du.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],r=[],o=[];return this.docs.forEach((c=>{c._document!==null&&(t.push(c._document),r.push(this._userDataWriter.convertObjectMap(c._document.data.value.mapValue.fields,"previous")),o.push(c.ref.path))})),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function Lu(i){switch(i){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return Bt(61501,{type:i})}}Ut._jsonSchemaVersion="firestore/querySnapshot/1.0",Ut._jsonSchema={type:j("string",Ut._jsonSchemaVersion),bundleSource:j("string","QuerySnapshot"),bundleName:j("string"),bundle:j("string")};(function(e,t=!0){(function(o){Kt=o})(ut),ct(new Je("firestore",((r,{instanceIdentifier:o,options:c})=>{const h=r.getProvider("app").getImmediate(),y=new ku(new au(r.getProvider("auth-internal")),new lu(h,r.getProvider("app-check-internal")),(function(v,b){if(!Object.prototype.hasOwnProperty.apply(v.options,["projectId"]))throw new O(k.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new Sn(v.options.projectId,b)})(h,o),h);return c={useFetchStreams:t,...c},y._setSettings(c),y}),"PUBLIC").setMultipleInstances(!0)),Le(fs,ps,e),Le(fs,ps,"esm2020")})();export{Fu as a,ju as b,Uu as c,Mu as g,Mc as i,xu as o,Vu as s};
