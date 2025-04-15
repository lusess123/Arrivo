import { DatePicker } from 'antd'
import dayjs from 'dayjs';

export interface IDateTimeProps {
    value: any;
    onChange: (value: any) => void;
}

export  function DateTime(props: IDateTimeProps) {
     const val =  typeof(props.value) === 'string' ? dayjs(props.value) : props.value 
     return <DatePicker {...props} showTime value={val} />
} 