import { useMetaContext } from "@/components/mdd/store";
import { Select } from "antd";
import { Badge  } from 'antd'


// export interface ISelectEditProps {
//   value?: string;
//   onChange?: (value: string) => void;
//   regName: string;
// }

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
export function SelectEdit(props: any) {

    const { dicts } = useMetaContext()
    const dict = dicts[props.regName] ?? {};
    const options = Object.keys(dict).map(key =>  {

        const item = dict[key]
        return {
            label: <Badge color={colors[item.index! % 10]} text={item.label} ></Badge>,
            value: item.value
        }

    })
    return <Select  
     {...props}
    value={props.value} 
    onChange={props.onChange}  
    allowClear
    options={options}>
  

    </Select>

}

export function MultiSelectEdit(props: any) {

    const { dicts } = useMetaContext()
    const dict = dicts[props.regName] ?? {};
    const options = Object.keys(dict).map(key =>  {

        const item = dict[key]
        return {
            label: <Badge color={colors[item.index! % 10]} text={item.label} ></Badge>,
            value: item.value
        }

    })
    return <Select  
     {...props}
    value={props.value ? props.value.split(',') : []} 
    onChange={(val) => {

        props.onChange(val.join(','))

    }}  
    allowClear
    mode="multiple"
    options={options}>
  

    </Select>

}
