import { useParams } from '@umijs/max';
import { View } from '../../components/mdd';
import { MetaContextProviderParent } from '../../components/mdd/store';

function ViewPage() {
  const { model, view } = useParams();
  if (!model || !view) return <div>model 和 view 不能为空</div>;
  return (
    <div>
      <MetaContextProviderParent>
        <View key={model + view} model={model!} view={view!} />
      </MetaContextProviderParent>
    </div>
  );
}

export default ViewPage;
