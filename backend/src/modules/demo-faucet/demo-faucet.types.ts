export type DemoFaucetStatusDto = {
  enabled: boolean;
  available: boolean;
  requiresAuth: boolean;
  chainId: string | null;
  amount: string | null;
  addressPrefix: string;
  displayName: string;
  adminModeEnabled: boolean;
  reason: string | null;
};

export type DemoFaucetRequestDto = {
  requestedAddress: string;
  chainId: string;
  amount: string;
  txHash: string | null;
  fundedAt: string;
  mode: "self-serve" | "admin";
};
