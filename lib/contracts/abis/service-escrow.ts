export const serviceEscrowAbi = [
  {
    type: "function",
    name: "createOrder",
    stateMutability: "payable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "serviceId", type: "uint256" },
    ],
    outputs: [{ name: "orderId", type: "uint256" }],
  },
  {
    type: "function",
    name: "markInProgress",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "markDelivered",
    stateMutability: "nonpayable",
    inputs: [
      { name: "orderId", type: "uint256" },
      { name: "deliveryRef", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "confirmCompletion",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "event",
    name: "OrderCreated",
    anonymous: false,
    inputs: [
      { name: "orderId", type: "uint256", indexed: true },
      { name: "agentId", type: "uint256", indexed: true },
      { name: "customer", type: "address", indexed: true },
      { name: "subscriptionId", type: "uint256", indexed: false },
      { name: "serviceId", type: "uint256", indexed: false },
      { name: "amountPaid", type: "uint256", indexed: false },
      { name: "platformFeeAmount", type: "uint256", indexed: false },
      { name: "agentPayoutAmount", type: "uint256", indexed: false },
      { name: "status", type: "uint8", indexed: false },
      { name: "createdAt", type: "uint64", indexed: false },
      { name: "updatedAt", type: "uint64", indexed: false },
    ],
  },
] as const
