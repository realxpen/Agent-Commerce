"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react"
import { useInterwovenKit } from "@initia/interwovenkit-react"
import { toHex } from "viem"
import { useWalletAccount } from "@/hooks/wallet/useWalletAccount"
import {
  AgentCommerceApiError,
  agentCommerceApi,
  configureAgentCommerceApiAuth,
  getApiErrorMessage,
  getApiErrorTitle,
} from "@/lib/api"
import { agentCommerceConfig } from "@/lib/appchain/config"
import { makeAdr36AminoSignDoc, uint8ArrayToBase64 } from "@/lib/auth/adr36"
import type {
  AuthSessionDto,
  CurrentAuthSessionDto,
  DataResponse,
} from "@/lib/api/types"

type BackendAuthStatus =
  | "idle"
  | "restoring"
  | "signing_in"
  | "authenticated"
  | "error"

type BackendAuthContextValue = {
  status: BackendAuthStatus
  session: AuthSessionDto | null
  currentSession: CurrentAuthSessionDto | null
  isAuthenticated: boolean
  isRestoring: boolean
  isSigningIn: boolean
  errorMessage: string | null
  errorTitle: string | null
  signIn: () => Promise<AuthSessionDto | null>
  ensureAuthenticated: () => Promise<AuthSessionDto | null>
  signOut: () => void
  refreshSession: () => Promise<CurrentAuthSessionDto | null>
}

const STORAGE_KEY = "agentcommerce:backend-auth-sessions"

type EthereumRequestArguments = {
  method: string
  params?: unknown[] | object
}

type EthereumProvider = {
  request: (args: EthereumRequestArguments) => Promise<unknown>
}

const BackendAuthContext = createContext<BackendAuthContextValue | undefined>(
  undefined,
)

function readStoredSessions() {
  if (typeof window === "undefined") {
    return {} as Record<string, AuthSessionDto>
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {} as Record<string, AuthSessionDto>
    }

    const parsed = JSON.parse(raw) as Record<string, AuthSessionDto>
    return parsed ?? {}
  } catch {
    return {} as Record<string, AuthSessionDto>
  }
}

function writeStoredSessions(sessions: Record<string, AuthSessionDto>) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // Local persistence is best-effort for the hackathon auth bridge.
  }
}

function getWalletStorageKey(address: string | null | undefined) {
  return address?.toLowerCase() ?? null
}

function isSessionExpired(session: AuthSessionDto | null, bufferMs = 30_000) {
  if (!session?.expiresAt) {
    return true
  }

  return new Date(session.expiresAt).getTime() <= Date.now() + bufferMs
}

function isSameSession(
  left: AuthSessionDto | null,
  right: AuthSessionDto | null,
) {
  if (!left || !right) {
    return left === right
  }

  return (
    left.accessToken === right.accessToken &&
    left.expiresAt === right.expiresAt &&
    left.activeWallet.id === right.activeWallet.id &&
    left.user.id === right.user.id
  )
}

function normalizeAuthError(error: unknown) {
  if (error instanceof AgentCommerceApiError) {
    return {
      title: getApiErrorTitle(error),
      message: getApiErrorMessage(error),
    }
  }

  if (error instanceof Error) {
    return {
      title: "Sign-in needs attention",
      message: error.message,
    }
  }

  return {
    title: "Sign-in needs attention",
    message: "We couldn't complete backend sign-in with this wallet yet.",
  }
}

function normalizeSignerAlgo(
  algo: string | null | undefined,
): "secp256k1" | "ethsecp256k1" {
  return algo === "ethsecp256k1" ? "ethsecp256k1" : "secp256k1"
}

function getAlternateSignerAlgo(
  algo: "secp256k1" | "ethsecp256k1",
): "secp256k1" | "ethsecp256k1" {
  return algo === "ethsecp256k1" ? "secp256k1" : "ethsecp256k1"
}

function getSignedPublicKeyBase64(
  signedResponse:
    | {
        signature?: {
          pub_key?: {
            value?: string
          } | null
        } | null
      }
    | null
    | undefined,
  fallbackPubkey: Uint8Array,
) {
  const signedPubKey = signedResponse?.signature?.pub_key

  if (
    signedPubKey &&
    typeof signedPubKey === "object" &&
    "value" in signedPubKey &&
    typeof signedPubKey.value === "string" &&
    signedPubKey.value.trim().length > 0
  ) {
    return signedPubKey.value
  }

  return uint8ArrayToBase64(fallbackPubkey)
}

function getInjectedEthereumProvider() {
  const provider =
    typeof window !== "undefined"
      ? (window as Window & { ethereum?: EthereumProvider }).ethereum
      : undefined

  if (!provider) {
    throw new Error(
      "Open and unlock MetaMask before unlocking backend sync.",
    )
  }

  return provider
}

async function signMessageWithPersonalSign(message: string, address: string) {
  const provider = getInjectedEthereumProvider()
  const signature = await provider.request({
    method: "personal_sign",
    params: [toHex(message), address],
  })

  if (typeof signature !== "string" || !signature.startsWith("0x")) {
    throw new Error(
      "The wallet returned an invalid signature for backend sign-in.",
    )
  }

  return signature
}

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const wallet = useWalletAccount()
  const { offlineSigner } = useInterwovenKit()
  const storageKey = getWalletStorageKey(wallet.initiaAddress)

  const [status, setStatus] = useState<BackendAuthStatus>("idle")
  const [session, setSession] = useState<AuthSessionDto | null>(null)
  const [currentSession, setCurrentSession] =
    useState<CurrentAuthSessionDto | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorTitle, setErrorTitle] = useState<string | null>(null)

  const clearStoredSession = useCallback((key: string | null) => {
    if (!key) {
      return
    }

    const nextSessions = readStoredSessions()
    delete nextSessions[key]
    writeStoredSessions(nextSessions)
  }, [])

  const persistSession = useCallback(
    (key: string, nextSession: AuthSessionDto) => {
      const nextSessions = readStoredSessions()
      nextSessions[key] = nextSession
      writeStoredSessions(nextSessions)
    },
    [],
  )

  const setAuthError = useCallback((error: unknown) => {
    const normalized = normalizeAuthError(error)
    setErrorTitle(normalized.title)
    setErrorMessage(normalized.message)
  }, [])

  const refreshSession = useCallback(async (activeSession = session) => {
    if (!activeSession?.accessToken) {
      setCurrentSession(null)
      return null
    }

    try {
      const response = await agentCommerceApi.request<DataResponse<CurrentAuthSessionDto>>(
        "/api/v1/auth/me",
        {
          authToken: activeSession.accessToken,
        },
      )

      setCurrentSession(response.data)
      return response.data
    } catch (error) {
      if (
        error instanceof AgentCommerceApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        clearStoredSession(storageKey)
        setSession(null)
        setCurrentSession(null)
        setStatus("idle")
      }

      throw error
    }
  }, [clearStoredSession, session, storageKey])

  useEffect(() => {
    configureAgentCommerceApiAuth({
      accessToken: session?.accessToken ?? null,
    })
  }, [session?.accessToken])

  useEffect(() => {
    if (!wallet.isConnected || !storageKey) {
      setSession(null)
      setCurrentSession(null)
      setStatus("idle")
      setErrorMessage(null)
      setErrorTitle(null)
      return
    }

    const storedSession = readStoredSessions()[storageKey] ?? null

    if (!storedSession || isSessionExpired(storedSession)) {
      clearStoredSession(storageKey)
      setSession(null)
      setCurrentSession(null)
      setStatus("idle")
      setErrorMessage(null)
      setErrorTitle(null)
      return
    }

    setSession((currentSession) =>
      isSameSession(currentSession, storedSession) ? currentSession : storedSession,
    )
    setStatus("authenticated")
    setErrorMessage(null)
    setErrorTitle(null)

    if (!agentCommerceConfig.status.apiReady) {
      return
    }

    setStatus("restoring")

    void refreshSession(storedSession)
      .then(() => {
        setStatus("authenticated")
      })
      .catch((error) => {
        if (
          error instanceof AgentCommerceApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          setAuthError(error)
          return
        }

        // Keep the locally stored session during transient backend issues.
        setStatus("authenticated")
      })
  }, [
    clearStoredSession,
    refreshSession,
    setAuthError,
    storageKey,
    wallet.isConnected,
  ])

  const signOut = useCallback(() => {
    clearStoredSession(storageKey)
    setSession(null)
    setCurrentSession(null)
    setStatus("idle")
    setErrorMessage(null)
    setErrorTitle(null)
    configureAgentCommerceApiAuth({
      accessToken: null,
    })
  }, [clearStoredSession, storageKey])

  const signIn = useCallback(async () => {
    if (!wallet.isConnected || !wallet.initiaAddress) {
      const error = new Error(
        "Connect your wallet before unlocking backend sync.",
      )
      setAuthError(error)
      setStatus("error")
      return null
    }

    if (!agentCommerceConfig.status.apiReady) {
      const error = new Error(
        "Add NEXT_PUBLIC_API_BASE_URL before backend sync can be enabled.",
      )
      setAuthError(error)
      setStatus("error")
      return null
    }

    setStatus("signing_in")
    setErrorMessage(null)
    setErrorTitle(null)

    try {
      const accounts = await offlineSigner.getAccounts()
      const activeAccount =
        accounts.find((account) => account.address === wallet.initiaAddress) ??
        accounts[0]

      if (!activeAccount) {
        throw new Error("The connected wallet did not return a signable Initia account.")
      }

      const detectedAlgo = normalizeSignerAlgo(
        (activeAccount as { algo?: string | null | undefined }).algo,
      )
      const challenge = await agentCommerceApi.createAuthChallenge({
        address: wallet.initiaAddress,
        chainId: String(agentCommerceConfig.appchain.chainId),
        algo: detectedAlgo,
      })

      if (detectedAlgo === "ethsecp256k1") {
        if (!wallet.hexAddress) {
          throw new Error(
            "The connected wallet did not expose an EVM address for backend sign-in.",
          )
        }

        const signature = await signMessageWithPersonalSign(
          challenge.data.message,
          wallet.hexAddress,
        )
        const verified = await agentCommerceApi.verifyAuthChallenge({
          address: wallet.initiaAddress,
          chainId: challenge.data.chainId,
          nonce: challenge.data.nonce,
          signature,
          algo: detectedAlgo,
          method: "eip191",
        })

        if (storageKey) {
          persistSession(storageKey, verified.data)
        }

        configureAgentCommerceApiAuth({
          accessToken: verified.data.accessToken,
        })
        setSession(verified.data)
        setCurrentSession({
          user: verified.data.user,
          activeWallet: verified.data.activeWallet,
        })
        setStatus("authenticated")
        return verified.data
      }

      const signDoc = makeAdr36AminoSignDoc(
        wallet.initiaAddress,
        challenge.data.message,
      )
      const signed = await offlineSigner.signAmino(wallet.initiaAddress, signDoc)
      const signedPublicKey = getSignedPublicKeyBase64(
        signed,
        activeAccount.pubkey,
      )
      const verifyWithAlgo = (algo: "secp256k1" | "ethsecp256k1") =>
        agentCommerceApi.verifyAuthChallenge({
          address: wallet.initiaAddress,
          chainId: challenge.data.chainId,
          nonce: challenge.data.nonce,
          signature: signed.signature.signature,
          publicKey: signedPublicKey,
          algo,
          signDoc: signed.signed,
        })

      let verified
      try {
        verified = await verifyWithAlgo(detectedAlgo)
      } catch (error) {
        const alternateAlgo = getAlternateSignerAlgo(detectedAlgo)
        if (
          error instanceof AgentCommerceApiError &&
          error.status === 401 &&
          alternateAlgo !== detectedAlgo
        ) {
          verified = await verifyWithAlgo(alternateAlgo)
        } else {
          throw error
        }
      }

      if (storageKey) {
        persistSession(storageKey, verified.data)
      }

      configureAgentCommerceApiAuth({
        accessToken: verified.data.accessToken,
      })
      setSession(verified.data)
      setCurrentSession({
        user: verified.data.user,
        activeWallet: verified.data.activeWallet,
      })
      setStatus("authenticated")
      return verified.data
    } catch (error) {
      setAuthError(error)
      setStatus("error")
      return null
    }
  }, [
    offlineSigner,
    persistSession,
    setAuthError,
    storageKey,
    wallet.hexAddress,
    wallet.initiaAddress,
    wallet.isConnected,
  ])

  const ensureAuthenticated = useCallback(async () => {
    if (session && !isSessionExpired(session)) {
      return session
    }

    return signIn()
  }, [session, signIn])

  const value = useMemo(
    () => ({
      status,
      session,
      currentSession,
      isAuthenticated: Boolean(session && !isSessionExpired(session)),
      isRestoring: status === "restoring",
      isSigningIn: status === "signing_in",
      errorMessage,
      errorTitle,
      signIn,
      ensureAuthenticated,
      signOut,
      refreshSession,
    }),
    [
      currentSession,
      ensureAuthenticated,
      errorMessage,
      errorTitle,
      refreshSession,
      session,
      signIn,
      signOut,
      status,
    ],
  )

  return (
    <BackendAuthContext.Provider value={value}>
      {children}
    </BackendAuthContext.Provider>
  )
}

export function useBackendAuth() {
  const context = useContext(BackendAuthContext)

  if (!context) {
    throw new Error("useBackendAuth must be used within an AuthSessionProvider")
  }

  return context
}
