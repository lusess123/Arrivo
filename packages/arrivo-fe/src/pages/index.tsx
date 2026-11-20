import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { useApp } from "@/hooks";
import { LanguageSwitch } from "@/components/language-switch";
import { useLocale } from "@/lib/locale";
import { history, useSearchParams } from "@umijs/max";
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Spin,
  Tabs,
  Tag,
} from "antd";
import {
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import styles from "./index.module.less";
import logo from "@/assets/logo.png";
import emptyImage from "@/assets/foot.png";
import axios from "axios";
import { asyncHandle } from "@/lib";
import { buildLoginUrl } from "@/lib/auth-redirect";
import {
  resolveArticleTab,
  sortPublicArticles,
  withArticleTab,
} from "./article-list";

// Ant Design keeps validation messages and toasts mounted across language changes.
function LibraryMessage({ zh, en }: { zh: string; en: string }) {
  const { t } = useLocale();
  return <>{t(zh, en)}</>;
}

type ArticleFormValues = {
  title: string;
  sentences?: { original?: string; translation?: string }[];
};

export default function IndexPage() {
  const { locale, t } = useLocale();
  const { auth } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [articleForm] = Form.useForm<ArticleFormValues>();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [savingArticle, setSavingArticle] = useState(false);
  const currentUserId = (auth?.userData as any)?.id;
  const activeTab = resolveArticleTab(searchParams);

  const myArticles = useMemo(
    () =>
      articles.filter(
        (article) => article.userId === currentUserId && !article.isPublic,
      ),
    [articles, currentUserId],
  );

  const publicArticles = useMemo(
    () => sortPublicArticles(articles.filter((article) => article.isPublic)),
    [articles],
  );

  useEffect(() => {
    void fetchArticles();
  }, []);

  useEffect(() => {
    if (searchParams.get("tab") !== activeTab) {
      setSearchParams(withArticleTab(searchParams, activeTab), {
        replace: true,
      });
    }
  }, [activeTab, searchParams, setSearchParams]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const [err, res] = await asyncHandle(
        axios.get("/api/article/getArticleList"),
      );
      if (err) {
        if (err.response?.status !== 401) {
          message.error(<LibraryMessage zh="无法加载文章，请重试。" en="Couldn’t load your articles. Please try again." />);
        }
        return;
      }
      const list = res?.data?.data || [];
      const newList = list.map((item: any) => ({
        ...item,
        createdAt: item.createdAt || new Date(),
        content:
          item.Sentences?.length > 0
            ? `${item.Sentences[0].translatedContent || ""}${item.Sentences[0].originalContent || ""}`
            : "",
      }));
      setArticles(newList);
    } catch (error) {
      console.error("Error fetching articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const [err] = await asyncHandle(axios.post("/api/auth/signout"));
    if (err) {
      message.error(<LibraryMessage zh="退出登录失败，请重试。" en="Couldn’t sign out. Please try again." />);
    } else {
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      await auth.saveLastVisitedPage(currentPath);
      await auth.clearUser?.();
      history.replace(buildLoginUrl(currentPath));
    }
  };

  const dateFormat = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }), [locale]);

  function handleArticleClick(id: string): void {
    history.push(`/article/${id}`);
  }

  function openCreateArticle(): void {
    setEditingArticle(null);
    articleForm.setFieldsValue({
      title: "",
      sentences: [
        {
          original: "",
          translation: "",
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

  async function handleSaveArticle(values: ArticleFormValues) {
    setSavingArticle(true);

    try {
      const payload = editingArticle
        ? { id: editingArticle.id, title: values.title }
        : {
            title: values.title,
            sentences: (values.sentences || [])
              .map((sentence) => ({
                original: sentence?.original?.trim() || "",
                translation: sentence?.translation?.trim() || "",
              }))
              .filter(
                (sentence) => sentence.original || sentence.translation,
              ),
          };
      const endpoint = editingArticle
        ? "/api/article/updateArticle"
        : "/api/article/createArticle";
      const [err, res] = await asyncHandle(axios.post(endpoint, payload));

      if (err) {
        message.error(err.response?.status === 403
          ? <LibraryMessage zh="只能编辑自己的文章" en="You can only edit your own articles." />
          : <LibraryMessage zh="文章未保存，请重试。" en="Couldn’t save the article. Please try again." />);
        return;
      }

      setArticleModalOpen(false);
      setEditingArticle(null);
      articleForm.resetFields();
      await fetchArticles();
      message.success(editingArticle
        ? <LibraryMessage zh="文章已更新" en="Article updated" />
        : <LibraryMessage zh="文章已创建" en="Article created" />);

      const createdArticleId = res?.data?.data?.id;
      if (!editingArticle && createdArticleId) {
        history.push(`/article/${createdArticleId}`);
      }
    } finally {
      setSavingArticle(false);
    }
  }

  async function handleDeleteArticle(article: any) {
    const [err] = await asyncHandle(
      axios.post("/api/article/deleteArticle", { id: article.id }),
    );

    if (err) {
      message.error(err.response?.status === 403
        ? <LibraryMessage zh="只能删除自己的文章" en="You can only delete your own articles." />
        : <LibraryMessage zh="文章未删除，请重试。" en="Couldn’t delete the article. Please try again." />);
      return;
    }

    message.success(<LibraryMessage zh="文章已删除" en="Article deleted" />);
    await fetchArticles();
  }

  function renderArticleList(list: any[], emptyText: string, readonly = false) {
    if (list.length === 0) {
      return (
        <div className={styles.empty}>
          <img
            src={emptyImage}
            alt=""
            className={styles.emptyImage}
          />
          <p>{emptyText}</p>
        </div>
      );
    }

    return list.map((article) => (
      <div
        key={article.id}
        className={
          styles.articleCard +
          "  cursor-pointer  hover:text-blue-700 focus:outline-none"
        }
        onClick={() => handleArticleClick(article.id)}
      >
        <div className={styles.articleTitleRow}>
          <h3 className={styles.articleTitle}>{article.title}</h3>
          {article.isPublic && <Tag color="blue">{t("公共", "Public")}</Tag>}
        </div>
        <div className={styles.articleMeta}>
          <span className={styles.articleDate}>
            <ClockCircleOutlined aria-hidden="true" /> {dateFormat.format(new Date(article.createdAt))}
          </span>
          {article.isPublic && (
            <span className={styles.articleDate}>
              <PlayCircleOutlined aria-hidden="true" /> {t(`播放 ${article.playCount || 0}`, `${article.playCount || 0} ${article.playCount === 1 ? "play" : "plays"}`)}
            </span>
          )}
        </div>
        <p className={styles.articleExcerpt}>{article.content}</p>
        {!readonly && (
          <div
            className={styles.cardActions}
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              size="small"
              icon={<EditOutlined aria-hidden="true" />}
              onClick={(event) => openEditArticle(article, event)}
            >
              {t("编辑", "Edit")}
            </Button>
            <Popconfirm
              title={t("删除这篇文章？", "Delete this article?")}
              description={t("删除后不会出现在你的文章列表中。", "This will remove the article from your library.")}
              okText={t("删除", "Delete")}
              cancelText={t("取消", "Cancel")}
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDeleteArticle(article)}
            >
              <Button size="small" danger icon={<DeleteOutlined aria-hidden="true" />}>
                {t("删除", "Delete")}
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
        <a href="/" aria-label={t("返回 Arrivo 首页", "Back to Arrivo home")}>
          <img src={logo} alt="" className={styles.logo} />
        </a>
        <div className={styles.languageControl}><LanguageSwitch /></div>
        <div className={styles.headerActions}>
          <a className={styles.mindSwitchLink} href="/mind-switch">{t("心智切换", "MindSwitch")}</a>
          <Button
            type="primary"
            icon={<PlusOutlined aria-hidden="true" />}
            className={styles.primaryAction}
            onClick={openCreateArticle}
          >
            {t("新增文章", "New article")}
          </Button>
          <Button className={styles.logoutBtn} onClick={handleLogout}>
            {t("退出登录", "Sign out")}
          </Button>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.articleList}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Spin size="large" />
            </div>
          ) : (
            <Tabs
              className={styles.articleTabs}
              activeKey={activeTab}
              onChange={(tab) =>
                setSearchParams(
                  withArticleTab(searchParams, tab as "mine" | "public"),
                  { replace: true },
                )
              }
              items={[
                {
                  key: "mine",
                  label: `${t("我的文章", "My articles")} ${myArticles.length}`,
                  children: renderArticleList(myArticles, t("暂无我的文章", "You haven’t added any articles yet.")),
                },
                {
                  key: "public",
                  label: `${t("公共文章", "Public articles")} ${publicArticles.length}`,
                  children: renderArticleList(
                    publicArticles,
                    t("暂无公共文章", "No public articles yet."),
                    true,
                  ),
                },
              ]}
            />
          )}
        </div>
      </main>

      <Modal
        title={
          <div className={styles.modalHeading}>
            <span>{editingArticle ? t("编辑文章", "Edit article") : t("新增文章", "New article")}</span>
            <LanguageSwitch />
          </div>
        }
        open={articleModalOpen}
        closable={{ "aria-label": t("关闭", "Close") }}
        onCancel={() => {
          setArticleModalOpen(false);
          setEditingArticle(null);
          articleForm.resetFields();
        }}
        onOk={() => articleForm.submit()}
        confirmLoading={savingArticle}
        okText={editingArticle ? t("保存", "Save") : t("创建", "Create")}
        cancelText={t("取消", "Cancel")}
      >
        <Form form={articleForm} layout="vertical" onFinish={handleSaveArticle}>
          <Form.Item
            label={t("标题", "Title")}
            name="title"
            rules={[{ required: true, whitespace: true, message: <LibraryMessage zh="请输入标题" en="Enter an article title." /> }]}
          >
            <Input placeholder={t("输入文章标题", "Enter an article title")} />
          </Form.Item>

          {!editingArticle && (
            <>
              <Form.List name="sentences">
                {(fields, { add, remove }) => (
                  <div className={styles.sentenceFormList}>
                    {fields.map(({ key, name, ...restField }, index) => (
                      <div key={key} className={styles.sentenceFormItem}>
                        <div className={styles.sentenceFormHeader}>
                          <span>{t("句子", "Sentence")} {index + 1}</span>
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined aria-hidden="true" />}
                            aria-label={t(`移除句子 ${index + 1}`, `Remove sentence ${index + 1}`)}
                            onClick={() => remove(name)}
                          />
                        </div>
                        <Form.Item
                          {...restField}
                          name={[name, "original"]}
                          label={t("英文", "English text")}
                        >
                          <Input.TextArea
                            rows={2}
                            placeholder={t("输入要朗读的英文，可不填", "English text to read aloud (optional)")}
                          />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, "translation"]}
                          label={t("中文释义", "Chinese translation")}
                        >
                          <Input.TextArea
                            rows={2}
                            placeholder={t("输入中文释义，可不填", "Chinese translation (optional)")}
                          />
                        </Form.Item>
                      </div>
                    ))}
                    <Button
                      type="dashed"
                      block
                      icon={<PlusOutlined aria-hidden="true" />}
                      onClick={() => add({ original: "", translation: "" })}
                    >
                      {t("添加一句", "Add a sentence")}
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
