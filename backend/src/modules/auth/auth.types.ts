import type { Prisma } from "@prisma/client";

export const authUserSelect = {
  id: true,
  displayName: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  wallets: {
    orderBy: [
      {
        isPrimary: "desc",
      },
      {
        createdAt: "asc",
      },
    ],
    select: {
      id: true,
      chainId: true,
      address: true,
      label: true,
      type: true,
      status: true,
      isPrimary: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.UserSelect;

export type AuthUserRecord = Prisma.UserGetPayload<{
  select: typeof authUserSelect;
}>;

export type AuthContext = {
  userId: string;
  walletId: string;
  chainId: string;
  address: string;
  tokenId: string;
  user: {
    id: string;
    displayName: string | null;
    status: string;
  };
  wallet: {
    id: string;
    status: string;
    type: string;
    isPrimary: boolean;
  };
};

export type AuthWalletDto = {
  id: string;
  chainId: string;
  address: string;
  label: string | null;
  type: string;
  status: string;
  isPrimary: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthUserDto = {
  id: string;
  displayName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  wallets: AuthWalletDto[];
};

export type AuthChallengeDto = {
  nonce: string;
  requestId: string;
  address: string;
  chainId: string;
  message: string;
  expiresAt: string;
};

export type AuthSessionDto = {
  tokenType: "Bearer";
  accessToken: string;
  expiresAt: string;
  user: AuthUserDto;
  activeWallet: AuthWalletDto;
  meta: {
    isNewUser: boolean;
    linkedWallet: boolean;
  };
};
