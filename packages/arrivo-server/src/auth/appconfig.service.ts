/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { Config, PrismaClient } from 'arrivo-db';

function getAppConfigByKey(configs: Config[], key: string) {
  const appName = process.env.APP_NAME;
  if (appName) {
    const config = configs.find(
      (config) => config.key === key && config.appName === appName,
    );
    if (config) {
      return config.value;
    }
  }
  const config = configs.find(
    (config) =>
      config.key === key &&
      (config.appName === '' ||
        config.appName === undefined ||
        config.appName === null),
  );
  if (config) {
    return config.value;
  }
  return process.env[key];
}

export interface IAppItemConfig {
  LIVEKIT_API_KEY: string;
  LIVEKIT_API_SECRET: string;
  LIVEKIT_URL: string;
}



@Injectable()
export class AppConfigService extends PrismaClient {

  async getAppConfigByKeys(keys: string[]) {
    const configs = await this.config.findMany({
      where: {
        key: { in: keys },
      },
    });
    return keys.reduce((acc, key) => {
      acc[key] = getAppConfigByKey(configs, key);
      return acc;
    }, {});
  }

  async getAppConfigByKey(key: string) {
    const configs = await this.config.findMany({
      where: {
        key: {
          in: ['IMAGE_GUEST', 'IMAGE_USER', 'PAY_AUDIO', key],
        },
      },
    });
    return getAppConfigByKey(configs, key);
  }
  async getAppConfig() {
    const configs = await this.config.findMany({
      where: {
        key: {
          in: ['IMAGE_GUEST', 'IMAGE_USER', 'PAY_AUDIO'],
        },
      },
    });

    const imageguest = getAppConfigByKey(configs, 'IMAGE_GUEST');
    let imageuser = getAppConfigByKey(configs, 'IMAGE_USER');
    if (imageguest && !imageuser) {
      imageuser = imageguest.split(',')[0];
    }
    const payaudio = getAppConfigByKey(configs, 'PAY_AUDIO');

    return {
      imageguest,
      imageuser,
      payaudio,
    };
  }
}
