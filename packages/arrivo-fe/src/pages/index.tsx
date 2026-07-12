import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { useApp } from '@/hooks';
import { history } from '@umijs/max';
import { Button, Form, Input, message, Modal, Popconfirm, Spin, Tabs, Tag } from 'antd';
import { ClockCircleOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import styles from './index.module.less';
import logo from '@/assets/logo.png';
import emptyImage from '@/assets/foot.png';
// import { Article, mockArticles } from '@/mock/articles';
import axios from 'axios';
import { asyncHandle } from '@/lib';

export default function IndexPage() {
  const { auth } = useApp();
  const [articleForm] = Form.useForm();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [savingArticle, setSavingArticle] = useState(false);
  const currentUserId = (auth?.userData as any)?.id;

  const myArticles = useMemo(
    () => articles.filter(article => article.userId === currentUserId && !article.isPublic),
    [articles, currentUserId],
  );

  const publicArticles = useMemo(
    () => articles.filter(article => article.isPublic),
    [articles],
  );

  useEffect(() => {
    void fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      // Simulate network delay
      // await new Promise(resolve => setTimeout(resolve, 300));
      const [err, res] = await  asyncHandle(axios.get('/api/article/getArticleList'));
      if (err) {
        if (err.response?.status !== 401) {
          message.error(err.message);
        }
        return;
      }
      const list = res?.data?.data || [];
      const newList = list.map((item: any) => ({
        ...item,
        createdAt: item.createdAt ||  new Date(),
        content: item.Sentences?.length > 0 ?
        `${item.Sentences[0].translatedContent || ''}${item.Sentences[0].originalContent || ''}` : '',
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
            auth.clearUser?.();
            history.replace(`/login`);
        }
        // return [err, res]
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  function handleArticleClick(id: string): void {
    history.push(`/article/${id}`);
  }

  function openCreateArticle(): void {
    setEditingArticle(null);
    articleForm.setFieldsValue({
      title: '',
      sentences: [
        {
          original: '',
          translation: '',
        },
      ],
    });
    setArticleModalOpen(true);
  }

  function openEditArticle(article: any, event: MouseEvent): void {
    event.stopPropagation();
    setEditingArticle(article);
    articleForm.setFieldsValue({
      title: article.title,
    });
    setArticleModalOpen(true);
  }

  async function handleSaveArticle() {
    const values = await articleForm.validateFields();
    setSavingArticle(true);

    try {
      const payload = editingArticle
        ? { id: editingArticle.id, title: values.title }
        : {
            title: values.title,
            sentences: (values.sentences || [])
              .map((sentence: any) => ({
                original: sentence?.original?.trim() || '',
                translation: sentence?.translation?.trim() || '',
              }))
              .filter((sentence: any) => sentence.original || sentence.translation),
          };
      const endpoint = editingArticle ? '/api/article/updateArticle' : '/api/article/createArticle';
      const [err, res] = await asyncHandle(axios.post(endpoint, payload));

      if (err) {
        message.error(err.response?.data?.message || err.message);
        return;
      }

      setArticleModalOpen(false);
      setEditingArticle(null);
      articleForm.resetFields();
      await fetchArticles();
      message.success(editingArticle ? '文章已更新' : '文章已创建');

      const createdArticleId = res?.data?.data?.id;
      if (!editingArticle && createdArticleId) {
        history.push(`/article/${createdArticleId}`);
      }
    } finally {
      setSavingArticle(false);
    }
  }

  async function handleDeleteArticle(article: any) {
    const [err] = await asyncHandle(axios.post('/api/article/deleteArticle', { id: article.id }));

    if (err) {
      message.error(err.response?.data?.message || err.message);
      return;
    }

    message.success('文章已删除');
    await fetchArticles();
  }

  function renderArticleList(list: any[], emptyText: string, readonly = false) {
    if (list.length === 0) {
      return (
        <div className={styles.empty}>
          <img src={emptyImage} alt="No Articles" className={styles.emptyImage} />
          <p>{emptyText}</p>
        </div>
      );
    }

    return list.map(article => (
      <div key={article.id} className={styles.articleCard + '  cursor-pointer  hover:text-blue-700 focus:outline-none' } onClick={() => handleArticleClick(article.id)}>
        <div className={styles.articleTitleRow}>
          <h3 className={styles.articleTitle}>{article.title}</h3>
          {article.isPublic && <Tag color="blue">公共</Tag>}
        </div>
        <div className={styles.articleMeta}>
          <span className={styles.articleDate}>
            <ClockCircleOutlined /> {formatDate(article.createdAt)}
          </span>
        </div>
        <p className={styles.articleExcerpt}>{article.content}</p>
        {!readonly && (
          <div className={styles.cardActions} onClick={(event) => event.stopPropagation()}>
            <Button size="small" icon={<EditOutlined />} onClick={(event) => openEditArticle(article, event)}>
              编辑
            </Button>
            <Popconfirm
              title="删除这篇文章？"
              description="删除后不会出现在你的文章列表中。"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDeleteArticle(article)}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </div>
        )}
      </div>
    ));
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <img src={logo} alt="Arrivo Logo" className={styles.logo} />
        <div className={styles.headerActions}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className={styles.primaryAction}
            onClick={openCreateArticle}
          >
            新增文章
          </Button>
          <Button
            className={styles.logoutBtn}
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </div>
      </header>
      
      <main className={styles.content}>
        <div className={styles.articleList}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
            </div>
          ) : (
            <Tabs
              className={styles.articleTabs}
              items={[
                {
                  key: 'mine',
                  label: `我的文章 ${myArticles.length}`,
                  children: renderArticleList(myArticles, '暂无我的文章'),
                },
                {
                  key: 'public',
                  label: `公共文章 ${publicArticles.length}`,
                  children: renderArticleList(publicArticles, '暂无公共文章', true),
                },
              ]}
            />
          )}
        </div>
      </main>

      <Modal
        title={editingArticle ? '编辑文章' : '新增文章'}
        open={articleModalOpen}
        onCancel={() => {
          setArticleModalOpen(false);
          setEditingArticle(null);
          articleForm.resetFields();
        }}
        onOk={handleSaveArticle}
        confirmLoading={savingArticle}
        okText={editingArticle ? '保存' : '创建'}
        cancelText="取消"
      >
        <Form form={articleForm} layout="vertical">
          <Form.Item
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="输入文章标题" />
          </Form.Item>

          {!editingArticle && (
            <>
              <Form.List name="sentences">
                {(fields, { add, remove }) => (
                  <div className={styles.sentenceFormList}>
                    {fields.map(({ key, name, ...restField }, index) => (
                      <div key={key} className={styles.sentenceFormItem}>
                        <div className={styles.sentenceFormHeader}>
                          <span>句子 {index + 1}</span>
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                          />
                        </div>
                        <Form.Item {...restField} name={[name, 'original']} label="英文">
                          <Input.TextArea rows={2} placeholder="输入要朗读的英文，可不填" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'translation']} label="中文释义">
                          <Input.TextArea rows={2} placeholder="输入中文释义，可不填" />
                        </Form.Item>
                      </div>
                    ))}
                    <Button
                      type="dashed"
                      block
                      icon={<PlusOutlined />}
                      onClick={() => add({ original: '', translation: '' })}
                    >
                      添加一句
                    </Button>
                  </div>
                )}
              </Form.List>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
