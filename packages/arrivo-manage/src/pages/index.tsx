import { Result } from 'antd';

export default function IndexPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <Result
        status="403"
        title="管理后台暂未开放"
        subTitle="当前还没有配置管理员权限字段，暂时不允许任何账号进入管理后台。"
      />
    </div>
  );
}
