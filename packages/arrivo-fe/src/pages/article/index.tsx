import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { history, useLocation, useNavigate, useParams } from '@umijs/max';
import { Button, Form, Input, message, Modal, Popconfirm, Select, Slider, Spin, Tag } from 'antd';
import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  LogoutOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import styles from './index.module.less';
import { asyncHandle } from '@/lib';
import axios from 'axios';
import ens from '@/data/en.json';
import SentenceItem from './sentence.item';
import { useApp } from '@/hooks';
import {
  DEFAULT_PLAYBACK_SETTINGS,
  normalizePlaybackSettings,
  readCachedPlaybackSettings,
  resolvePlaybackCompletion,
  writeCachedPlaybackSettings,
  type PlaybackSettings,
} from './playback';
import { articleSentenceElementId } from './article-progress';
import { useArticleProgress } from './use-article-progress';

interface Sentence {
  id: string;
  articleId?: string;
  originalContent: string;
  translatedContent: string;
  sortOrder?: number;
  duration?: number;
}

interface ArticleNavigationState {
  autoPlay?: boolean;
}

const ArticlePage: React.FC = () => {
  const router = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { auth } = useApp();
  const [sentenceForm] = Form.useForm();
  const [article, setArticle] = useState<any>(null);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [sentenceModalOpen, setSentenceModalOpen] = useState(false);
  const [editingSentence, setEditingSentence] = useState<Sentence | null>(null);
  const [sentenceInsertIndex, setSentenceInsertIndex] = useState<number | null>(null);
  const [savingSentence, setSavingSentence] = useState(false);
  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>(() => ({
    ...DEFAULT_PLAYBACK_SETTINGS,
    voice: ens[0].name,
  }));
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const [playbackSession, setPlaybackSession] = useState(0);
  const [continuousPlayback, setContinuousPlayback] = useState(false);
  const playbackSettingsRef = useRef(playbackSettings);
  const settingsTouchedRef = useRef(false);
  const settingsSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const restoredArticleRef = useRef<string | null>(null);
  const currentUserId = (auth?.userData as any)?.id;
  const sentenceIds = useMemo(() => sentences.map((sentence) => sentence.id), [sentences]);
  const {
    loaded: progressLoaded,
    resumeIndex,
    save: saveArticleProgress,
    clear: clearArticleProgress,
  } = useArticleProgress({ articleId: id, userId: currentUserId, sentenceIds });
  const canEdit = useMemo(
    () => Boolean(article && article.userId === currentUserId && !article.isPublic),
    [article, currentUserId],
  );

  const updatePlaybackSettings = useCallback((patch: Partial<PlaybackSettings>) => {
    const nextSettings = normalizePlaybackSettings(
      { ...playbackSettingsRef.current, ...patch },
      ens[0].name,
    );
    settingsTouchedRef.current = true;
    playbackSettingsRef.current = nextSettings;
    setPlaybackSettings(nextSettings);
    return nextSettings;
  }, []);

  const applyLoadedPlaybackSettings = useCallback((settings: PlaybackSettings) => {
    if (settingsTouchedRef.current) return;
    playbackSettingsRef.current = settings;
    setPlaybackSettings(settings);
  }, []);

  const persistPlaybackSettings = useCallback((settings: PlaybackSettings) => {
    if (currentUserId === undefined || currentUserId === null) return;

    const userId = currentUserId;
    settingsSaveQueueRef.current = settingsSaveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const [err] = await asyncHandle(axios.put('/api/user/playback-settings', settings));
        if (err) {
          if (err.response?.status !== 401) {
            message.error(err.response?.data?.message || '播放设置保存失败');
          }
          return;
        }

        writeCachedPlaybackSettings(userId, settings);
      });
  }, [currentUserId]);

  const applyArticleData = useCallback((articleData: any) => {
    setArticle(articleData);
    setSentences(
      (articleData?.Sentences || []).map((sentence: any) => ({
        ...sentence,
        originalContent: sentence.originalContent || '',
        translatedContent: sentence.translatedContent || '',
      })),
    );
    setActiveSentenceIndex(null);
  }, []);

  const fetchArticle = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    const [err, res] = await asyncHandle(axios.get(`/api/article/getArticleDetail`, {
      params: {
        id,
      },
    }));

    if (err) {
      if (err.response?.status !== 401) {
        message.error(err.response?.data?.message || err.message);
      }
      setLoading(false);
      return;
    }

    applyArticleData(res?.data?.data);
    void asyncHandle(axios.post('/api/article/incrementPlayCount', { id }));
    setLoading(false);
  }, [applyArticleData, id]);

  const handleLogout = async () => {
    const [err] = await asyncHandle(axios.post('/api/auth/signout'));
    if (err) {
      message.error(err.message);
    } else {
      await auth.clearUser?.();
      history.replace(`/login`);
    }
  };

  useEffect(() => {
    setActiveSentenceIndex(null);
    setContinuousPlayback(false);
    restoredArticleRef.current = null;
    void fetchArticle();
  }, [fetchArticle]);

  useLayoutEffect(() => {
    if (
      !id
      || loading
      || !progressLoaded
      || restoredArticleRef.current === id
    ) {
      return;
    }

    if (resumeIndex === null) return;
    const sentence = sentences[resumeIndex];
    if (!sentence) return;
    restoredArticleRef.current = id;

    document.getElementById(articleSentenceElementId(sentence.id))?.scrollIntoView({
      behavior: 'auto',
      block: 'center',
    });
  }, [id, loading, progressLoaded, resumeIndex, sentences]);

  useEffect(() => {
    if (activeSentenceIndex === null) return;
    const sentence = sentences[activeSentenceIndex];
    if (sentence) saveArticleProgress(sentence.id);
  }, [activeSentenceIndex, saveArticleProgress, sentences]);

  useEffect(() => {
    if (currentUserId === undefined || currentUserId === null) return;

    settingsTouchedRef.current = false;
    const cachedSettings = readCachedPlaybackSettings(currentUserId, ens[0].name);
    if (cachedSettings) {
      applyLoadedPlaybackSettings(cachedSettings);
    }

    const controller = new AbortController();
    void (async () => {
      const [err, res] = await asyncHandle(axios.get('/api/user/playback-settings', {
        signal: controller.signal,
      }));
      if (controller.signal.aborted) return;

      if (err) {
        if (!cachedSettings && err.response?.status !== 401) {
          message.warning('播放设置暂时无法同步，已使用默认设置');
        }
        return;
      }

      if (settingsTouchedRef.current) return;
      const serverSettings = normalizePlaybackSettings(res?.data?.data, ens[0].name);
      writeCachedPlaybackSettings(currentUserId, serverSettings);
      applyLoadedPlaybackSettings(serverSettings);
    })();

    return () => controller.abort();
  }, [applyLoadedPlaybackSettings, currentUserId]);

  const handleGoBack = () => {
    router('/');
  };

  const handleOpenSettings = () => {
    setIsSettingsModalVisible(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsModalVisible(false);
  };

  const handleSentencePlayStart = useCallback((index: number) => {
    setContinuousPlayback(false);
    setActiveSentenceIndex(index);
  }, []);

  const handleSentencePlayStop = useCallback((index: number) => {
    setContinuousPlayback(false);
    setActiveSentenceIndex((currentIndex) => currentIndex === index ? null : currentIndex);
  }, []);

  const handleSentencePlayEnd = useCallback((index: number) => {
    if (activeSentenceIndex !== index) return;

    const completion = resolvePlaybackCompletion({
      sentenceIndex: index,
      sentenceCount: sentences.length,
      nextArticleId: article?.nextArticleId,
      continuous: continuousPlayback,
    });

    if (completion.type === 'next-sentence') {
      setActiveSentenceIndex(completion.sentenceIndex);
      return;
    }

    setActiveSentenceIndex(null);
    setContinuousPlayback(false);

    if (completion.type === 'next-article') {
      clearArticleProgress();
      router(`/article/${encodeURIComponent(completion.articleId)}`, {
        state: { autoPlay: true } satisfies ArticleNavigationState,
      });
      return;
    }

    if (completion.type === 'all-complete') {
      clearArticleProgress();
      message.success('已播放完全部文章');
    }
  }, [activeSentenceIndex, article?.nextArticleId, clearArticleProgress, continuousPlayback, router, sentences.length]);

  const startContinuousPlayback = useCallback((sentenceIndex: number) => {
    if (!sentences.length) {
      message.info('暂无可朗读内容');
      return;
    }

    setPlaybackSession((session) => session + 1);
    setContinuousPlayback(true);
    setActiveSentenceIndex(sentenceIndex);
  }, [sentences.length]);

  const handleContinuePlayback = useCallback(() => {
    startContinuousPlayback(resumeIndex ?? 0);
  }, [resumeIndex, startContinuousPlayback]);

  const handlePlayFromBeginning = useCallback(() => {
    startContinuousPlayback(0);
  }, [startContinuousPlayback]);

  useEffect(() => {
    const navigationState = location.state as ArticleNavigationState | null;
    if (
      loading
      || !progressLoaded
      || !navigationState?.autoPlay
      || !article
      || String(article.id) !== String(id)
    ) {
      return;
    }

    router(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: null,
    });

    if (!sentences.length) {
      message.info('下一篇暂无可朗读内容');
      return;
    }

    setPlaybackSession((session) => session + 1);
    setContinuousPlayback(true);
    setActiveSentenceIndex(resumeIndex ?? 0);
  }, [article, id, loading, location.hash, location.pathname, location.search, location.state, progressLoaded, resumeIndex, router, sentences.length]);

  const openCreateSentence = (insertIndex: number) => {
    if (!canEdit) return;
    setEditingSentence(null);
    setSentenceInsertIndex(insertIndex);
    sentenceForm.setFieldsValue({
      original: '',
      translation: '',
    });
    setSentenceModalOpen(true);
  };

  const openEditSentence = (sentence: Sentence) => {
    if (!canEdit) return;
    setEditingSentence(sentence);
    setSentenceInsertIndex(null);
    sentenceForm.setFieldsValue({
      original: sentence.originalContent,
      translation: sentence.translatedContent,
    });
    setSentenceModalOpen(true);
  };

  const closeSentenceModal = () => {
    setSentenceModalOpen(false);
    setEditingSentence(null);
    setSentenceInsertIndex(null);
    sentenceForm.resetFields();
  };

  const handleSaveSentence = async () => {
    if (!id) return;

    const values = await sentenceForm.validateFields();
    const original = values.original?.trim() || '';
    const translation = values.translation?.trim() || '';
    if (!original && !translation) {
      message.info('请至少填写英文或中文释义');
      return;
    }

    setSavingSentence(true);

    try {
      const endpoint = editingSentence ? '/api/article/updateSentence' : '/api/article/createSentence';
      const payload = editingSentence
        ? {
            id: editingSentence.id,
            original,
            translation,
          }
        : {
            articleId: id,
            original,
            translation,
            insertIndex: sentenceInsertIndex ?? sentences.length,
          };
      const [err, res] = await asyncHandle(axios.post(endpoint, payload));

      if (err) {
        message.error(err.response?.data?.message || err.message);
        return;
      }

      applyArticleData(res?.data?.data);
      closeSentenceModal();
      message.success(editingSentence ? '句子已更新' : '句子已添加');
    } finally {
      setSavingSentence(false);
    }
  };

  const mutateSentence = async (endpoint: string, payload: Record<string, any>, successText: string) => {
    const [err, res] = await asyncHandle(axios.post(endpoint, payload));

    if (err) {
      message.error(err.response?.data?.message || err.message);
      return;
    }

    applyArticleData(res?.data?.data);
    message.success(successText);
  };

  const renderSentenceActions = (sentence: Sentence, index: number) => {
    if (!canEdit) return null;

    return (
      <div className={styles.sentenceActions}>
        <Button size="small" icon={<PlusOutlined />} onClick={() => openCreateSentence(index)}>
          上方插入
        </Button>
        <Button size="small" icon={<PlusOutlined />} onClick={() => openCreateSentence(index + 1)}>
          下方插入
        </Button>
        <Button
          size="small"
          icon={<ArrowUpOutlined />}
          disabled={index === 0}
          onClick={() => mutateSentence('/api/article/moveSentence', { id: sentence.id, direction: 'up' }, '顺序已更新')}
        />
        <Button
          size="small"
          icon={<ArrowDownOutlined />}
          disabled={index === sentences.length - 1}
          onClick={() => mutateSentence('/api/article/moveSentence', { id: sentence.id, direction: 'down' }, '顺序已更新')}
        />
        <Button size="small" icon={<EditOutlined />} onClick={() => openEditSentence(sentence)}>
          编辑
        </Button>
        <Popconfirm
          title="删除这个句子？"
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => mutateSentence('/api/article/deleteSentence', { id: sentence.id }, '句子已删除')}
        >
          <Button size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
        <p>Loading article...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.leftControls}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleGoBack} 
            className={styles.backButton}
          >
             返回
          </Button>
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />} 
            onClick={handleContinuePlayback}
            disabled={!progressLoaded}
            className={styles.playButton}
          >
            {resumeIndex === null ? '朗读' : '继续'}
          </Button>
          {canEdit && (
            <Button
              icon={<PlusOutlined />}
              onClick={() => openCreateSentence(sentences.length)}
              className={styles.addSentenceButton}
            >
              添加句子
            </Button>
          )}
        </div>
        <h1 className={styles.title}>
          <span>{article?.title}</span>
          {article?.isPublic && <Tag color="blue">公共</Tag>}
        </h1>
        <div className={styles.rightControls}>
          <Button 
            type="text" 
            icon={<SettingOutlined />} 
            onClick={handleOpenSettings}
            className={styles.settingsButton}
          />
          <Button 
            type="text" 
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
            className={styles.logoutButton}
          />
        </div>
      </div>

      <div className={styles.content}>
        {resumeIndex !== null && activeSentenceIndex === null && (
          <div className={styles.resumeNotice} role="status">
            <span>上次停在第 {resumeIndex + 1} 句</span>
            <Button type="link" onClick={handleContinuePlayback}>从这里继续</Button>
            {resumeIndex > 0 && (
              <Button type="link" onClick={handlePlayFromBeginning}>从头播放</Button>
            )}
          </div>
        )}
        {sentences.length === 0 && (
          <div className={styles.emptySentence}>
            <p>暂无句子</p>
            {canEdit && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateSentence(0)}>
                添加第一句
              </Button>
            )}
          </div>
        )}
        {sentences.map((sentence, index) => (
          <SentenceItem
            key={sentence.id}
            originalContent={sentence.originalContent}
            translatedContent={sentence.translatedContent}
            index={index}
            duration={sentence.duration || 0}
            id={sentence.id}
            resumePoint={activeSentenceIndex === null && resumeIndex === index}
            times={playbackSettings.repeatCount}
            v={playbackSettings.voice}
            rate={playbackSettings.playbackRate}
            delay={playbackSettings.extraPauseSeconds}
            playing={activeSentenceIndex === index}
            hasNext={
              index < sentences.length - 1
              || Boolean(continuousPlayback && article?.nextArticleId)
            }
            playbackKey={playbackSession}
            onPlayStart={handleSentencePlayStart}
            onPlayStop={handleSentencePlayStop}
            onPlayEnd={handleSentencePlayEnd}
            sound={true}
            actions={renderSentenceActions(sentence, index)}
          />
        ))}
      </div>

      <Modal
        title="设置"
        open={isSettingsModalVisible}
        onCancel={handleCloseSettings}
        className={styles.settingsModal + ' max-w-[600px]'}
        footer={null}
      >
        <div className={styles.settingItem}>
          <label>音色:</label>
          <Select
            value={playbackSettings.voice}
            onChange={(value) => {
              const nextSettings = updatePlaybackSettings({ voice: value });
              persistPlaybackSettings(nextSettings);
            }}
            style={{ width: '100%' }}
            options={ens.map((item) => ({
              label: item["中文"],
              value: item.name
            }))}
          />
        </div>
        <div className={styles.settingItem}>
          <label>说话速度:</label>
          <Slider
            min={0.5}
            max={2}
            step={0.1}
            value={playbackSettings.playbackRate}
            onChange={(value) => updatePlaybackSettings({ playbackRate: value })}
            onChangeComplete={() => persistPlaybackSettings(playbackSettingsRef.current)}
            marks={{
              0.5: '慢',
              1: '正常',
              1.5: '快',
              2: '非常快'
            }}
          />
        </div>
        <div className={styles.settingItem}>
          <label>播放次数:</label>
          <Slider
            min={1}
            max={10}
            step={1}
            value={playbackSettings.repeatCount}
            onChange={(value) => updatePlaybackSettings({ repeatCount: value })}
            onChangeComplete={() => persistPlaybackSettings(playbackSettingsRef.current)}
            marks={{
              1: '1次',
              2: '2次',
              3: '3次',
              4: '4次',
              5: '5次',
              10: '10次'
            }}
          />
        </div>
        <div className={styles.settingItem}>
          <label>额外停顿: {playbackSettings.extraPauseSeconds}秒</label>
          <Slider
            min={0}
            max={10}
            step={0.5}
            value={playbackSettings.extraPauseSeconds}
            onChange={(value) => updatePlaybackSettings({ extraPauseSeconds: value })}
            onChangeComplete={() => persistPlaybackSettings(playbackSettingsRef.current)}
            marks={{
              0: '0秒',
              5: '5秒',
              10: '10秒'
            }}
          />
        </div>
      </Modal>

      <Modal
        title={editingSentence ? '编辑句子' : '添加句子'}
        open={sentenceModalOpen}
        onCancel={closeSentenceModal}
        onOk={handleSaveSentence}
        confirmLoading={savingSentence}
        okText={editingSentence ? '保存' : '添加'}
        cancelText="取消"
      >
        <Form form={sentenceForm} layout="vertical">
          <Form.Item
            label="英文"
            name="original"
          >
            <Input.TextArea rows={4} placeholder="输入要朗读的英文，可不填" />
          </Form.Item>
          <Form.Item
            label="中文释义"
            name="translation"
          >
            <Input.TextArea rows={4} placeholder="输入中文释义，可不填" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ArticlePage;
