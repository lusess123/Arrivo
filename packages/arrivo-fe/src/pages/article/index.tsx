import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from '@umijs/max';
import { Button, Modal, Select, Spin, Slider, message } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, LogoutOutlined, SettingOutlined, SoundOutlined, PauseOutlined } from '@ant-design/icons';
import styles from './index.module.less';
// import { getArticleById } from '../../mock/articles';
// import { getSentencesByArticleId, Sentence } from '../../mock/sentences';
import { asyncHandle } from '@/lib';
import axios from 'axios';
import { history } from '@umijs/max';
import ens from '@/data/en.json';
import SentenceItem from './sentence.item';

interface Sentence {
  id: string;
  articleId: string;
  index: number;
  originalContent: string;
  translatedContent: string;
  duration: number;
}

const ArticlePage: React.FC = () => {
  const router = useNavigate();
  const { id } = useParams();
  const [article, setArticle] = useState<any>(null);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [voice, setVoice] = useState(ens[0].name);
  const [speed, setSpeed] = useState(1);
  const [times, setTimes] = useState(1);

  const handleLogout = async () => {
    const [err, res] = await asyncHandle(axios.post('/api/auth/signout'));
        if(err) {
            // Toast.show('Logout failed');
            message.error(err.message);
        } else {
            // Toast.show('Logout success');
            // setData(null);
            history.push(`/login`);
        }
        // return [err, res]
  };

  useEffect(() => {
    if (id) {
      // Simulate API call delay
        (async function () {

          const [err, res] = await asyncHandle(axios.get(`/api/article/getArticleDetail`, {
            params: {
              id
            }
          }));
          if (err) {
            if(err.response.data.data === 'nologin') {
              message.info('请先登录');
              history.push(`/login`);
            } else {
              message.error(err.message);
            }
            
          }
          const articleData = res?.data?.data;
          const sentencesData = res?.data?.data?.Sentences;


        setArticle(articleData);
        setSentences(sentencesData);
        setLoading(false);
          
        })()
    }
  }, [id]);

  const handleGoBack = () => {
    router('/');
  };

  // const handleLogout = () => {
  //   // In a real app, this would handle logout functionality
  //   router('/login');
  // };

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
        {sentences.map((sentence, index) => (
          <SentenceItem
            key={sentence.id}
            originalContent={sentence.originalContent}
            translatedContent={sentence.translatedContent}
            index={index}
            duration={sentence.duration}
            id={sentence.id}
            times={times}
            v={voice}
            rate={speed}
            delay={0}
            onPlayEnd={() => {}}
            // onPlayEnd={handlePlaySentence}
            sound={true}
          />
        ))}
      </div>

      <Modal
        title="设置"
        open={isSettingsModalVisible}
        onCancel={handleCloseSettings}
        // width={'100%'}
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
          >
            {/* <Select.Option value="female">Female</Select.Option>
            <Select.Option value="male">Male</Select.Option>
            <Select.Option value="child">Child</Select.Option> */}
          </Select>
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
      </Modal>
    </div>
  );
};

export default ArticlePage;