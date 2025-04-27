import React, { useState } from 'react';
import { Button, Select ,Input } from 'antd';

import { SourceMap } from '../../data'

// import { HTML } from '../../components/common/detail-component/html'

const list = Object.keys(SourceMap);



const Tool: React.FC = () => {
    // SourceMap
    const [source, setSource] = useState<string>('')
    const [title, setTitle] = useState<string>('')
    const [content, setContent] = useState<string>('')
    return <div className='flex flex-col gap-2'>
        <div>
            <Select 
            value={source}
            allowClear
            placeholder='请选择'
            className='w-full'
            onChange={(value) => {
                if (value) {
                    setSource(value)
                    setContent(JSON.stringify(SourceMap[value][1], null,2))
                    setTitle(SourceMap[value][0])
                } else {
                    setSource('')
                    setContent('')
                    setTitle('')
                }
            }}
            options={list.map(key => {
                const ss = SourceMap[key]
                return { label: ss[0], value: key }
            })} />
        </div>
        <div>
            <Button type='primary' onClick={() => {
                // console.log(text)
            }}>提交</Button>
        </div>
        <div>
            <Input.TextArea rows={1} value={title} onChange={(e) => {
                setTitle(e.target.value)
            }} />
        </div>
        <div>
            <Input.TextArea autoSize value={content} onChange={(e) => {
                setContent(e.target.value)
            }} />
        </div>
        <div>
            <Button type='primary' onClick={() => {
                // console.log(text)
            }}>提交</Button>
        </div>
    </div>;
};

export default Tool;