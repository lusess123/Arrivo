import React from 'react'
// import { IComponentProps } from '../component'
import { useMetaContext } from '@/components/mdd/store';
import { Button } from 'antd'
import { useViewContext } from '@/components/mdd/view/view.content';

export function LinkOneDetail(props: any) {
  const { models, dataset } = useMetaContext()
  const { openWin  } = useViewContext()
  const { value, relationModel } = props
  const model = models[relationModel]
  const displayField = model?.displayField
  const dt = dataset[relationModel]
  const row = (value && dt[value]) || {}


  return (
    <div>
        <Button type='link' onClick={(event) => {
           event.stopPropagation();
            if(openWin) {
                openWin({
                    model: relationModel,
                    view: 'detailview',
                    id: value
                })
            }

        }}>{row[displayField || 'id'] || value}</Button>
      
    </div>
  )
}