import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { Select } from "antd";

export function BooleanSelect(props: any) {

    return <Select  
     {...props}
    value={props.value} 
   
     
    onChange={props.onChange}
    options={[
      {
        value: true,
        label: <div className="flex flex-row justify-center"><CheckOutlined color="green" className="text-[green]"  />是</div>
      },
      {
        value: false,
        label: <div className="flex flex-row justify-center"><CloseOutlined  color="red" className="text-[red]" />否</div>
      }
    ]}
    allowClear >

    </Select>

}