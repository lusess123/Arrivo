import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from '@umijs/max';
import { Button, Modal, Select, Spin, Slider } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, LogoutOutlined, SettingOutlined, SoundOutlined, PauseOutlined } from '@ant-design/icons';
import styles from './index.module.less';
import { getArticleById } from '../../mock/articles';
import { getSentencesByArticleId, Sentence } from '../../mock/sentences';

const ArticlePage: React.FC = () => {
  const router = useNavigate();
  const { id } = useParams();
  const [article, setArticle] = useState<any>(null);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [voice, setVoice] = useState('female');
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (id) {
      // Simulate API call delay
      setTimeout(() => {
        const articleData = getArticleById(id as string);
        const sentencesData = getSentencesByArticleId(id as string);
        setArticle(articleData);
        setSentences(sentencesData);
        setLoading(false);
      }, 800);
    }
  }, [id]);

  const handleGoBack = () => {
    router('/');
  };

  const handleLogout = () => {
    // In a real app, this would handle logout functionality
    router('/login');
  };

  const handleOpenSettings = () => {
    setIsSettingsModalVisible(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsModalVisible(false);
  };

  const handlePlaySentence = (sentenceId: string) => {
    // In a real app, this would play the audio for the sentence
    console.log(`Playing sentence: ${sentenceId}`);
  };

  const handlePlayFromBeginning = () => {
    // In a real app, this would play all sentences from the beginning
    console.log('Playing from beginning');
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
            Return to List
          </Button>
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />} 
            onClick={handlePlayFromBeginning}
            className={styles.playButton}
          >
            Play All
          </Button>
        </div>
        <h1 className={styles.title}>{article?.title}</h1>
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
        {sentences.map((sentence) => (
          <div key={sentence.id} className={styles.sentenceItem}>
            <div className={styles.sentenceIndex}>{sentence.index}</div>
            <div className={styles.sentenceContent}>
              <p className={styles.englishText}>{sentence.english}</p>
              <p className={styles.chineseText}>{sentence.chinese}</p>
            </div>
            <div className={styles.sentenceControls}>
              <Button 
                type="text" 
                icon={<PlayCircleOutlined />} 
                onClick={() => handlePlaySentence(sentence.id)}
                className={styles.sentencePlayButton}
              />
              <span className={styles.duration}>{sentence.duration}s</span>
            </div>
          </div>
        ))}
      </div>

      <Modal
        title="Settings"
        open={isSettingsModalVisible}
        onCancel={handleCloseSettings}
        footer={[
          <Button key="close" onClick={handleCloseSettings}>
            Close
          </Button>,
        ]}
        className={styles.settingsModal}
      >
        <div className={styles.settingItem}>
          <label>Voice:</label>
          <Select
            value={voice}
            onChange={(value) => setVoice(value)}
            style={{ width: '100%' }}
          >
            <Select.Option value="female">Female</Select.Option>
            <Select.Option value="male">Male</Select.Option>
            <Select.Option value="child">Child</Select.Option>
          </Select>
        </div>
        <div className={styles.settingItem}>
          <label>Reading Speed:</label>
          <Slider
            min={0.5}
            max={2}
            step={0.1}
            value={speed}
            onChange={(value) => setSpeed(value)}
            marks={{
              0.5: 'Slow',
              1: 'Normal',
              1.5: 'Fast',
              2: 'Very Fast'
            }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ArticlePage;