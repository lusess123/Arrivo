import { useEffect, useState, useRef, useCallback } from 'react';
import { useApp } from '@/hooks';
import { history } from '@umijs/max';
import { Button, Empty, Spin } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import styles from './index.module.less';
import logo from '@/assets/logo.png';
import cloud1 from '@/assets/image1.png';
import cloud2 from '@/assets/image2.png';
import emptyImage from '@/assets/foot.png';
import { Article, mockArticles } from '@/mock/articles';

export default function IndexPage() {
  const { auth } = useApp();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const pageSize = 10;

  useEffect(() => {
    // If not logged in, redirect to login page
    if (!auth?.userData || Object.keys(auth?.userData).length === 0) {
      history.push('/login');
      return;
    }
    
    fetchArticles(1, true);
  }, [auth?.userData]);

  const fetchArticles = async (page: number, isInitialLoad = false) => {
    if (!hasMore && !isInitialLoad) return;
    
    try {
      setLoading(true);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Use imported mock data and paginate
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedArticles = mockArticles.slice(startIndex, endIndex);
      
      if (isInitialLoad) {
        setArticles(paginatedArticles);
        setInitialLoading(false);
      } else {
        setArticles(prev => [...prev, ...paginatedArticles]);
      }
      
      // Check if we've loaded all articles
      setHasMore(endIndex < mockArticles.length);
      
      if (isInitialLoad) {
        setCurrentPage(1);
      } else {
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreItems = useCallback(() => {
    if (!loading && hasMore) {
      fetchArticles(currentPage + 1);
    }
  }, [loading, hasMore, currentPage]);

  useEffect(() => {
    // Set up intersection observer for infinite scroll
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          loadMoreItems();
        }
      },
      { threshold: 0.1 }
    );
    
    observerRef.current = observer;
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMoreItems]);

  const handleLogout = () => {
    localStorage.removeItem('userData');
    history.push('/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <img src={logo} alt="Arrivo Logo" className={styles.logo} />
        <Button 
          className={styles.logoutBtn} 
          onClick={handleLogout}
        >
          退出登录
        </Button>
      </header>
      
      <main className={styles.content}>
        <div className={styles.articleList}>
          {initialLoading ? (
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
                <div key={article.id} className={styles.articleCard}>
                  <h3 className={styles.articleTitle}>{article.title}</h3>
                  <div className={styles.articleMeta}>
                    <span className={styles.articleDate}>
                      <ClockCircleOutlined /> {formatDate(article.createdAt)}
                    </span>
                  </div>
                  <p className={styles.articleExcerpt}>{article.content}</p>
                </div>
              ))}
              
              <div ref={loadMoreRef} style={{ textAlign: 'center', padding: '20px 0' }}>
                {loading && <Spin />}
                {!hasMore && articles.length > 0 && <p style={{ color: '#999' }}>没有更多文章了</p>}
              </div>
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
