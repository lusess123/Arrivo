import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { history, useNavigate, useParams } from '@umijs/max';
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

interface Sentence {
  id: string;
  articleId?: string;
  originalContent: string;
  translatedContent: string;
  sortOrder?: number;
  duration?: number;
}

const ArticlePage: React.FC = () => {
  const router = useNavigate();
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
  const [voice, setVoice] = useState(ens[0].name);
  const [speed, setSpeed] = useState(1);
  const [times, setTimes] = useState(1);
  const [extraPause, setExtraPause] = useState(0);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const [playbackSession, setPlaybackSession] = useState(0);
  const currentUserId = (auth?.userData as any)?.id;
  const canEdit = useMemo(
    () => Boolean(article && article.userId === currentUserId && !article.isPublic),
    [article, currentUserId],
  );

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
    setLoading(false);
  }, [applyArticleData, id]);

  const handleLogout = async () => {
    const [err] = await asyncHandle(axios.post('/api/auth/signout'));
    if (err) {
      message.error(err.message);
    } else {
      auth.clearUser?.();
      history.replace(`/login`);
    }
  };

  useEffect(() => {
    setActiveSentenceIndex(null);
    void fetchArticle();
  }, [fetchArticle]);

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
    setActiveSentenceIndex(index);
  }, []);

  const handleSentencePlayStop = useCallback((index: number) => {
    setActiveSentenceIndex((currentIndex) => currentIndex === index ? null : currentIndex);
  }, []);

  const handleSentencePlayEnd = useCallback((index: number) => {
    setActiveSentenceIndex((currentIndex) => {
      if (currentIndex !== index) return currentIndex;

      const nextIndex = index + 1;
      return nextIndex < sentences.length ? nextIndex : null;
    });
  }, [sentences.length]);

  const handlePlayFromBeginning = useCallback(() => {
    if (!sentences.length) {
      message.info('暂无可朗读内容');
      return;
    }

    setPlaybackSession((session) => session + 1);
    setActiveSentenceIndex(0);
  }, [sentences.length]);

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
            onClick={handlePlayFromBeginning}
            className={styles.playButton}
          >
            朗读
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
            times={times}
            v={voice}
            rate={speed}
            delay={extraPause}
            playing={activeSentenceIndex === index}
            hasNext={index < sentences.length - 1}
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
            value={voice}
            onChange={(value) => setVoice(value)}
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
            value={speed}
            onChange={(value) => setSpeed(value)}
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
            value={times}
            onChange={(value) => setTimes(value)}
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
          <label>额外停顿: {extraPause}秒</label>
          <Slider
            min={0}
            max={10}
            step={0.5}
            value={extraPause}
            onChange={(value) => setExtraPause(value)}
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
