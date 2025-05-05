import { useEffect, useState } from 'react';
import { useApp } from '@/hooks';
import { history } from '@umijs/max';
import { Button, Empty, message, Spin } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import styles from './index.module.less';
import logo from '@/assets/logo.png';
import cloud1 from '@/assets/image1.png';
import cloud2 from '@/assets/image2.png';
import emptyImage from '@/assets/foot.png';
// import { Article, mockArticles } from '@/mock/articles';
import axios from 'axios';
import { asyncHandle } from '@/lib';

export default function IndexPage() {
  const { auth } = useApp();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If not logged in, redirect to login page
    if (!auth?.userData || Object.keys(auth?.userData).length === 0) {
      history.push('/login');
      return;
    }
    
    fetchArticles();
  }, [auth?.userData]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      // Simulate network delay
      // await new Promise(resolve => setTimeout(resolve, 300));
      const [err, res] = await  asyncHandle(axios.get('/api/article/getArticleList'));
      if (err) {
        if(err.response.data.data === 'nologin') {
          message.info('请先登录');
          history.push(`/login`);
        } else {
          message.error(err.message);
        }
      }
      const list = res?.data?.data || [];
      const newList = list.map((item: any) => ({
        ...item,
        createdAt: item.createdAt ||  new Date(),
        content: item.Sentences.length > 0 ? 
        (item.Sentences[0].translatedContent + item.Sentences[0].originalContent) : '',
      }));
      setArticles(newList);
      // Load all articles at once
      // setArticles(mockArticles);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  function handleArticleClick(id: number): void {
    history.push(`/article/${id}`);
  }

  function handleArticleManage(): void {
    history.push(`${process.env.UMI_APP_DASHBOARD}/view/MyArticles/listview`);
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <img src={logo} alt="Arrivo Logo" className={styles.logo} />
        <Button 
          className={styles.logoutBtn} 
          onClick={handleArticleManage}
        >
          文章管理
        </Button>
        <Button 
          className={styles.logoutBtn} 
          onClick={handleLogout}
        >
          退出登录
        </Button>
      </header>
      
      <main className={styles.content}>
        <div className={styles.articleList}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
            </div>
          ) : articles.length === 0 ? (
            <div className={styles.empty}>
              <img src={emptyImage} alt="No Articles" className={styles.emptyImage} />
              <p>暂无文章</p>
            </div>
          ) : (
            <>
              {articles.map(article => (
                <div key={article.id} className={styles.articleCard + '  cursor-pointer  hover:text-blue-700 focus:outline-none' } onClick={() => handleArticleClick(article.id)}>
                  <h3 className={styles.articleTitle}>{article.title}</h3>
                  <div className={styles.articleMeta}>
                    <span className={styles.articleDate}>
                      <ClockCircleOutlined /> {formatDate(article.createdAt)}
                    </span>
                  </div>
                  <p className={styles.articleExcerpt}>{article.content}</p>
                </div>
              ))}
            </>
          )}
        </div>
      </main>
      
      <div className={styles.background}>
        <img src={cloud1} alt="" className={styles.cloud1} />
        <img src={cloud2} alt="" className={styles.cloud2} />
      </div>
    </div>
  );
}
