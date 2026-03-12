import { Injectable } from '@nestjs/common';

@Injectable()
export class TonService {
  buildTonConnectPayload(params: { amountTon: number; destinationAddress: string; comment: string }) {
    const nano = BigInt(Math.round(params.amountTon * 1_000_000_000));
    return {
      validUntil: Math.floor(Date.now() / 1000) + (Number(process.env.TON_PAYMENT_EXPIRY_MINUTES || '15') * 60),
      network: process.env.TON_NETWORK || 'testnet',
      messages: [
        {
          address: params.destinationAddress,
          amount: nano.toString(),
          payload: params.comment,
        },
      ],
    };
  }
}
