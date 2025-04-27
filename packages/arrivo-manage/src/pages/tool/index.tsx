import React, { useState } from 'react';
import { Button, Select ,Input, message } from 'antd';

import { SourceMap } from '../../data'
import { asyncHandle } from '../../utils/util'
import axios from 'axios'

// import { HTML } from '../../components/common/detail-component/html'

const list = Object.keys(SourceMap);



const Tool: React.FC = () => {
    // SourceMap
    const [source, setSource] = useState<string>('')
    const [title, setTitle] = useState<string>('')
    const [content, setContent] = useState<string>('')
    return <div className='flex flex-col gap-2 pb-8'>
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
        {/* <div>
            <Button type='primary' onClick={() => {
                // console.log(text)
            }}>提交</Button>
        </div> */}
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
        <div className='fixed bottom-4 w-full justify-center items-center flex'>
            <Button type='primary' onClick={async () => {
                if (!title) {
                    message.error('请输入标题')
                    return
                }
                if (!content) {
                    message.error('请输入内容')
                    return
                }
                const [err, res] = await asyncHandle(axios.post('api/article/createArticle', {
                    title,
                    sentences: JSON.parse(content || '[]')
                }))
                if (err) {
                    message.error(err.message)
                }
                if (res) {
                    message.success('创建成功')
                }
            }}>提交</Button>
        </div>
    </div>;
};

export default Tool;