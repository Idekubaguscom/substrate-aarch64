import KYVE from '@kyve/core';
import { Signature } from './types';
import { fetchBlock, isHeightOutOfRange } from './utils';
import { name, version } from '../package.json';

process.env.KYVE_RUNTIME = name;
process.env.KYVE_VERSION = version;

KYVE.metrics.register.setDefaultLabels({
  app: process.env.KYVE_RUNTIME,
});

class KyveSubstrate extends KYVE {
  public async getDataItem(key: number): Promise<{ key: number; value: any }> {
    let block;

    try {
      block = await fetchBlock(
        this.pool.config.rpc,
        key,
        await this.getSignature()
      );
    } catch (err) {
      if (isHeightOutOfRange(err)) throw new Error();

      this.logger.warn(
        `⚠️  EXTERNAL ERROR: Failed to fetch block ${key}. Retrying ...`
      );

      throw err;
    }

    return { key, value: block };
  }

  private async getSignature(): Promise<Signature> {
    const address = await this.sdk.wallet.getAddress();
    const timestamp = new Date().valueOf().toString();

    const message = `${address}//${this.poolId}//${timestamp}`;

    const { signature, pub_key } = await this.sdk.signString(message);

    return {
      signature,
      pubKey: pub_key.value,
      poolId: this.poolId.toString(),
      timestamp,
    };
  }
}

// noinspection JSIgnoredPromiseFromCall
new KyveSubstrate().start();
