"use client"

type Adr36SignDoc = {
  chain_id: string
  account_number: string
  sequence: string
  fee: {
    gas: string
    amount: []
  }
  msgs: Array<{
    type: "sign/MsgSignData"
    value: {
      signer: string
      data: string
    }
  }>
  memo: string
}

function bytesToBase64(bytes: Uint8Array) {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    let binary = ""

    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }

    return window.btoa(binary)
  }

  throw new Error("Base64 encoding is unavailable in this environment.")
}

export function uint8ArrayToBase64(value: Uint8Array) {
  return bytesToBase64(value)
}

export function makeAdr36AminoSignDoc(
  signer: string,
  message: string,
): Adr36SignDoc {
  const encodedMessage = new TextEncoder().encode(message)

  return {
    chain_id: "",
    account_number: "0",
    sequence: "0",
    fee: {
      gas: "0",
      amount: [],
    },
    msgs: [
      {
        type: "sign/MsgSignData",
        value: {
          signer,
          data: bytesToBase64(encodedMessage),
        },
      },
    ],
    memo: "",
  }
}
