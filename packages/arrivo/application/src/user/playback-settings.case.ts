import {
  DEFAULT_PLAYBACK_SETTINGS,
  playbackSettingsInputSchema,
  type PlaybackSettingsDto,
  type PlaybackSettingsInput
} from "@arrivo/contracts";
import { activeRecordWhere, createRecordBase, normalizeTenantId, updateRecordBase } from "../runtime/data-scope";
import { db } from "../runtime/db";

type PlaybackSettingsDeps = {
  userId: string;
  tenantId?: string | null;
};

const CONFIG_KEY_PREFIX = "user-playback-settings:";

function getConfigKey(userId: string) {
  return `${CONFIG_KEY_PREFIX}${userId}`;
}

function parseStoredSettings(value: string | undefined): PlaybackSettingsDto {
  if (!value) return { ...DEFAULT_PLAYBACK_SETTINGS };

  try {
    const result = playbackSettingsInputSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : { ...DEFAULT_PLAYBACK_SETTINGS };
  } catch {
    return { ...DEFAULT_PLAYBACK_SETTINGS };
  }
}

export async function getPlaybackSettings({
  userId,
  tenantId: inputTenantId
}: PlaybackSettingsDeps): Promise<PlaybackSettingsDto> {
  const tenantId = normalizeTenantId(inputTenantId);
  const config = await db.config.findFirst({
    where: {
      key: getConfigKey(userId),
      ...activeRecordWhere(tenantId)
    },
    select: {
      value: true
    }
  });

  return parseStoredSettings(config?.value);
}

export async function updatePlaybackSettings({
  userId,
  tenantId: inputTenantId,
  input
}: PlaybackSettingsDeps & { input: PlaybackSettingsInput }): Promise<PlaybackSettingsDto> {
  const tenantId = normalizeTenantId(inputTenantId);
  const key = getConfigKey(userId);
  const now = new Date();
  const value = JSON.stringify(input);

  await db.config.upsert({
    where: {
      tenantId_key: {
        tenantId,
        key
      }
    },
    update: {
      value,
      description: "用户播放设置",
      appName: "arrivo",
      deletedAt: null,
      deletedBy: null,
      ...updateRecordBase({ userId, now })
    },
    create: {
      ...createRecordBase({ userId, tenantId, now }),
      key,
      value,
      description: "用户播放设置",
      appName: "arrivo"
    }
  });

  return input;
}
