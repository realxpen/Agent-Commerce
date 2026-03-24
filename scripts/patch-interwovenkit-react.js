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
  'const fn = typeof _useEffectEvent === "function"',
  "  ? _useEffectEvent",
  "  : (callback) => {",
  "      const callbackRef = Je(callback)",
  "      G(() => {",
  "        callbackRef.current = callback",
  "      }, [callback])",
  "      return Se((...args) => callbackRef.current(...args), [])",
  "    };",
].join("\n")

const cjsFallbackSource =
  'const fn=typeof y.useEffectEvent==="function"?y.useEffectEvent:function(e){const t=y.useRef(e);return y.useEffect(()=>{t.current=e},[e]),y.useCallback((...s)=>t.current(...s),[])};'

function patchEsmBundle() {
  if (!fs.existsSync(esmPath)) {
    return false
  }

  const original = fs.readFileSync(esmPath, "utf8")

  if (original.includes('const fn = typeof _useEffectEvent === "function"')) {
    return false
  }

  const importNeedle =
    'import { createContext as Xt, useContext as Lt, useState as W, useCallback as Se, useEffect as G, useRef as Je, useMemo as x, Suspense as Yd, useEffectEvent as fn, createElement as ho, Fragment as Zd, useTransition as Jd, memo as Hi } from "react";'
  const importReplacement =
    'import { createContext as Xt, useContext as Lt, useState as W, useCallback as Se, useEffect as G, useRef as Je, useMemo as x, Suspense as Yd, useEffectEvent as _useEffectEvent, createElement as ho, Fragment as Zd, useTransition as Jd, memo as Hi } from "react";'

  if (!original.includes(importNeedle)) {
    throw new Error("Unable to locate InterwovenKit ESM React import to patch.")
  }

  const withRenamedImport = original.replace(importNeedle, importReplacement)
  const patched = withRenamedImport.replace(
    importReplacement,
    `${importReplacement}\n${fallbackSource}`,
  )

  fs.writeFileSync(esmPath, patched, "utf8")
  return true
}

function patchCjsBundle() {
  if (!fs.existsSync(cjsPath)) {
    return false
  }

  const original = fs.readFileSync(cjsPath, "utf8")

  if (original.includes('const fn=typeof y.useEffectEvent==="function"')) {
    return false
  }

  const needle =
    'function vl(e){const t=Object.create(null,{[Symbol.toStringTag]:{value:"Module"}});if(e){for(const s in e)if(s!=="default"){const o=Object.getOwnPropertyDescriptor(e,s);Object.defineProperty(t,s,o.get?o:{enumerable:!0,get:()=>e[s]})}}return t.default=e,Object.freeze(t)}const aa=vl(Or),cn=1.4'
  const replacement = `function vl(e){const t=Object.create(null,{[Symbol.toStringTag]:{value:"Module"}});if(e){for(const s in e)if(s!=="default"){const o=Object.getOwnPropertyDescriptor(e,s);Object.defineProperty(t,s,o.get?o:{enumerable:!0,get:()=>e[s]})}}return t.default=e,Object.freeze(t)}${cjsFallbackSource}const aa=vl(Or),cn=1.4`

  if (!original.includes(needle)) {
    throw new Error("Unable to locate InterwovenKit CJS insertion point to patch.")
  }

  const patched = original.replace(needle, replacement)
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
