import React from 'react'
// import { IComponentProps } from '../component'
import { useMetaContext } from '@/components/mdd/store';
import { Button } from 'antd'
import { useViewContext } from '@/components/mdd/view/view.content';

export function ToOneDetail(props: any) {
  const { models } = useMetaContext()
  const { openWin  } = useViewContext()
  const { value, relationModel } = props
  const model = models[relationModel]
  const displayField = model?.displayField


  return (
    <div>
        <Button type='link' onClick={(event) => {
           event.stopPropagation();
            if(openWin) {
                openWin({
                    model: relationModel,
                    view: 'detailview',
                    id: value.id
                })
            }

        }}>{value?.[displayField || 'id']}</Button>
      
    </div>
  )
}