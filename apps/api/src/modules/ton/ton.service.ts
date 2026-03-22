import { Injectable } from '@nestjs/common';
import { beginCell, toNano } from '@ton/ton';

@Injectable()
export class TonService {

  buildTonConnectPayload(params: {
    amountTon: number
    destinationAddress: string
    comment?: string
  }) {

    let payload: string | undefined;

    if (params.comment) {

      const cell = beginCell()
        .storeUint(0, 32)
        .storeStringTail(params.comment)
        .endCell();

      payload = cell.toBoc().toString('base64');
    }

    return {
      validUntil: Math.floor(Date.now() / 1000) + 1800,
      messages: [
        {
          address: params.destinationAddress,
          amount: toNano(params.amountTon).toString(),
          payload
        }
      ]
    };
  }
}
