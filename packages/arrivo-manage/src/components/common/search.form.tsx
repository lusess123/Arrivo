import { DatePicker, Form, Input, Select, Space } from 'antd'
import React from 'react'
import SearchSelect from './seach.select'
import { SelectEdit } from './detail-component/select-edit'
import { BooleanSelect } from './detail-component/boolean-select'

const { Item } = Form

export type ISearchFormItemType = 'Input' | 'Multi' | 'DateTimeRangePicker' | 'SearchData' | 'BooleanSelect'
const { RangePicker } = DatePicker;

export interface ISearchFormItem {
    name: string,
    type: ISearchFormItemType,
    options?: { label: string, value: string | number }[]
    url?: string
    label?: string
    regName: string
}

export interface ISearchForm {
    Items: ISearchFormItem[]
    onValuesChange: any
}

type IItemTypeCOmpose =  (props: ISearchFormItem) => React.ReactNode

const ItemTypeFuncDict: Record<ISearchFormItemType, IItemTypeCOmpose> = {
    Input: item => {
        return <Input style={{minWidth: ((item?.label?.length || 0) + 4 )* 18}} placeholder={`请输入${item.label}`} allowClear></Input>
    },
    // Multi : SelectEdit ,
    Multi: item => {
        return <SelectEdit allowClear style={{minWidth: ((item?.label?.length || 0) + 4 )* 18}} className='min-w-[250px]' placeholder={`请输入${item.label}`} mode="multiple" regName={item.regName}></SelectEdit>
    },
    DateTimeRangePicker: (item) => {
        return <RangePicker allowClear showTime placeholder={[`${item.label}开始时间`, `${item.label}结束时间`]} />
    },
    SearchData: item => {
        return <SearchSelect  url={item.url!} label={item.label!}  ></SearchSelect>
    },
    BooleanSelect : item => {
        return <BooleanSelect  style={{minWidth: ((item?.label?.length || 0) + 4 )* 18}} placeholder={'请选择 ' + item.label}  {...item}></BooleanSelect>
    }

}


function SearchForm({ onValuesChange, Items }: ISearchForm) {

    return <Form onValuesChange={onValuesChange} size='small' className='mb-4'>
        <Space direction="horizontal" wrap size="middle">
            {
                Items.map((item) => {
                    const { name, type } = item
                    return <Item key={name} name={name} style={{ marginBottom: 0}} >
                        {
                            ItemTypeFuncDict[type](item)
                        }
                    </Item>
                })
            }
        </Space>
    </Form>
}

export default SearchForm