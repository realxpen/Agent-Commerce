const fs = require("fs")
const path = require("path")

const packageRoot = path.join(
  process.cwd(),
  "node_modules",
  "@initia",
  "interwovenkit-react",
  "dist",
)

const esmPath = path.join(packageRoot, "index.js")
const cjsPath = path.join(packageRoot, "index.cjs")

const fallbackSource = [
  "const fn = (callback) => {",
  "  const callbackRef = Je(callback)",
  "  G(() => {",
  "    callbackRef.current = callback",
  "  }, [callback])",
  "  return Se((...args) => callbackRef.current(...args), [])",
  "};",
].join("\n")

const cjsFallbackSource =
  'const fn=function(e){const t=y.useRef(e);return y.useEffect(()=>{t.current=e},[e]),y.useCallback((...s)=>t.current(...s),[])};'

function patchEsmBundle() {
  if (!fs.existsSync(esmPath)) {
    return false
  }

  const original = fs.readFileSync(esmPath, "utf8")

  if (original.includes("const fn = (callback) => {")) {
    return false
  }

  const importPattern =
    /import \{ createContext as Xt, useContext as Lt, useState as W, useCallback as Se, useEffect as G, useRef as Je, useMemo as x, Suspense as Yd,(?: useEffectEvent as (?:fn|_useEffectEvent),)? createElement as ho, Fragment as Zd, useTransition as Jd, memo as Hi \} from "react";/
  const importReplacement =
    'import { createContext as Xt, useContext as Lt, useState as W, useCallback as Se, useEffect as G, useRef as Je, useMemo as x, Suspense as Yd, createElement as ho, Fragment as Zd, useTransition as Jd, memo as Hi } from "react";'

  if (!importPattern.test(original)) {
    throw new Error("Unable to locate InterwovenKit ESM React import to patch.")
  }

  let patched = original.replace(importPattern, importReplacement)

  patched = patched.replace(
    /const fn = typeof _useEffectEvent === "function"[\s\S]*?return Se\(\(\.\.\.args\) => callbackRef\.current\(\.\.\.args\), \[\]\)\s+    };/,
    fallbackSource,
  )

  if (!patched.includes("const fn = (callback) => {")) {
    patched = patched.replace(
      importReplacement,
      `${importReplacement}\n${fallbackSource}`,
    )
  }

  fs.writeFileSync(esmPath, patched, "utf8")
  return true
}

function patchCjsBundle() {
  if (!fs.existsSync(cjsPath)) {
    return false
  }

  const original = fs.readFileSync(cjsPath, "utf8")

  if (original.includes("const fn=function(e){")) {
    return false
  }

  let patched = original.replace(
    /const fn=typeof y\.useEffectEvent==="function"\?y\.useEffectEvent:function\(e\)\{const t=y\.useRef\(e\);return y\.useEffect\(\(\)=>\{t\.current=e\},\[e\]\),y\.useCallback\(\(\.\.\.s\)=>t\.current\(\.\.\.s\),\[\]\)\};/,
    cjsFallbackSource,
  )

  if (patched === original) {
    const needle =
      'function vl(e){const t=Object.create(null,{[Symbol.toStringTag]:{value:"Module"}});if(e){for(const s in e)if(s!=="default"){const o=Object.getOwnPropertyDescriptor(e,s);Object.defineProperty(t,s,o.get?o:{enumerable:!0,get:()=>e[s]})}}return t.default=e,Object.freeze(t)}const aa=vl(Or),cn=1.4'
    const replacement = `function vl(e){const t=Object.create(null,{[Symbol.toStringTag]:{value:"Module"}});if(e){for(const s in e)if(s!=="default"){const o=Object.getOwnPropertyDescriptor(e,s);Object.defineProperty(t,s,o.get?o:{enumerable:!0,get:()=>e[s]})}}return t.default=e,Object.freeze(t)}${cjsFallbackSource}const aa=vl(Or),cn=1.4`

    if (!patched.includes(needle)) {
      throw new Error("Unable to locate InterwovenKit CJS insertion point to patch.")
    }

    patched = patched.replace(needle, replacement)
  }

  fs.writeFileSync(cjsPath, patched, "utf8")
  return true
}

try {
  const esmPatched = patchEsmBundle()
  const cjsPatched = patchCjsBundle()

  if (esmPatched || cjsPatched) {
    console.log("Patched @initia/interwovenkit-react for Next.js React runtime compatibility.")
  } else {
    console.log("@initia/interwovenkit-react patch already applied.")
  }
} catch (error) {
  console.error("Failed to patch @initia/interwovenkit-react:", error)
  process.exit(1)
}
