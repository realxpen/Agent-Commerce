import { fromHex, toBech32 } from "@cosmjs/encoding"
import { NextRequest, NextResponse } from "next/server"
import {
  INITIA_USERNAMES_MODULE_ADDRESS,
  INITIA_USERNAMES_REST_URL,
  normalizeLookupUsername,
} from "@/lib/wallet/initia-usernames"

export const dynamic = "force-dynamic"

type MoveViewJsonResponse = {
  data?: string | null
}

function encodeUleb128(value: number) {
  const bytes: number[] = []
  let remaining = value >>> 0

  do {
    let byte = remaining & 0x7f
    remaining >>>= 7
    if (remaining !== 0) {
      byte |= 0x80
    }
    bytes.push(byte)
  } while (remaining !== 0)

  return Uint8Array.from(bytes)
}

function serializeBcsStringToBase64(value: string) {
  const encoder = new TextEncoder()
  const stringBytes = encoder.encode(value)
  const prefixBytes = encodeUleb128(stringBytes.length)
  const payload = new Uint8Array(prefixBytes.length + stringBytes.length)

  payload.set(prefixBytes, 0)
  payload.set(stringBytes, prefixBytes.length)

  return Buffer.from(payload).toString("base64")
}

function parseMoveViewString(value: string | null | undefined) {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value)
    return typeof parsed === "string" ? parsed : null
  } catch {
    return null
  }
}

function convertHexAddressToBech32(value: string) {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) {
    return value
  }

  try {
    return toBech32("init", fromHex(value.slice(2)))
  } catch {
    return value
  }
}

async function callGetAddressFromName(username: string) {
  const response = await fetch(`${INITIA_USERNAMES_REST_URL}/initia/move/v1/view`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      address: INITIA_USERNAMES_MODULE_ADDRESS,
      module_name: "usernames",
      function_name: "get_address_from_name",
      type_args: [],
      args: [serializeBcsStringToBase64(username)],
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => "")
    throw new Error(details || `Initia username lookup failed with ${response.status}`)
  }

  const payload = (await response.json()) as MoveViewJsonResponse
  return parseMoveViewString(payload.data ?? null)
}

export async function GET(request: NextRequest) {
  const queryUsername = request.nextUrl.searchParams.get("username")
  const normalizedUsername = normalizeLookupUsername(queryUsername)

  if (!normalizedUsername) {
    return NextResponse.json(
      { error: "Provide a valid .init username to resolve." },
      { status: 400 },
    )
  }

  try {
    const hexAddress = await callGetAddressFromName(normalizedUsername.replace(/\.init$/i, ""))
    const initiaAddress = hexAddress ? convertHexAddressToBech32(hexAddress) : null

    return NextResponse.json(
      {
        username: normalizedUsername,
        hexAddress,
        initiaAddress,
        found: Boolean(hexAddress),
        source: "initia-usernames",
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: "Initia username lookup failed.",
        details: error instanceof Error ? error.message : "Unknown lookup error",
      },
      { status: 502 },
    )
  }
}
