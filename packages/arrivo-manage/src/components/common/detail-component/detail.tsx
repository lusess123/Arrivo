import React from 'react'
// import { IComponentProps } from '../component'
import { useMetaContext } from '@/components/mdd/store';
import { Badge, Space  } from 'antd'

const colors = [
  'green',
  'red',
  'yellow',
  'blue',
  'volcano',
  'purple',
  'geekblue',
  'magenta',
  'gold',
  'lime',
];

function renderValue(val : any) {

   if(typeof val === 'string'  || typeof val === 'number' ||  React.isValidElement( val) || val === undefined || val === null) {
     return val
   } 

   return  <pre>{JSON.stringify(val, null, 2).replace(/,/g, ',\n')}</pre>
}
export function Detail(props: any) {
  const { dicts } = useMetaContext()
  // const fieldType = props.fieldType;
  const dict = props.regName ? dicts[props.regName] : undefined;
  if(props?.value && (props.value.includes && props.value.includes(',')) && dict) {
    const values = (props?.value?.split(',') || []).filter((item : any) => item ).map(
      (item: any, index: number) =>  {
        return  <Badge key={item} color={colors[(index || 0) % 10]} text={(dict[item]&& dict[item].label) || item}></Badge>
      }
     
    )

    return <Space>
      {values}
    </Space>
      
  } else {
    const label = dict && dict[props.value]?.label
    const val =  label ? <Badge color={colors[(dict[props.value].index || 0) % 10]} text={label} ></Badge>  : props.value
    return (
      <div>
        { renderValue(val) }
      </div>
    )
  }
 
}