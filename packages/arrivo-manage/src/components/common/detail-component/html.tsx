import 'bytemd/dist/index.css';
import { IComponentProps } from '../component';

import { get } from '@/utils/util';
import gfm from '@bytemd/plugin-gfm';
import { Editor } from '@bytemd/react';
import { message } from 'antd';
import 'bytemd/dist/index.css'
import './html.css'
import { remark } from 'remark'
import html from 'remark-html'
import { useEffect, useState } from 'react';

const plugins = [
  gfm(),
  // Add more plugins here
];
function removeQueryParameters(url: string): string {
  // 使用 URL 构造函数解析 URL
  const parsedUrl = new URL(url);
  // 清除 search 字段来移除查询参数
  parsedUrl.search = '';
  // 返回没有查询参数的 URL
  return parsedUrl.toString();
}
export const HTML = (props: IComponentProps) => {
  return (
    <Editor
      value={props.value || ''}
      plugins={plugins}
      uploadImages={async (files) => {
        return Promise.all(
          files.map(async (file) => {
            try {
              const [{ data }] = await get({
                url: 'oss/signedurl',
                data: {
                  object: file.name,
                },
              });
              const formData = new FormData();
              formData.append('file', file);
              const res = await fetch(data, {
                method: 'PUT',
                headers: new Headers({
                'Content-Type': 'application/x-www-form-urlencoded',
                }),
                body: file,
              });
              if(res.ok) {
                return { url : removeQueryParameters(data) + '?x-oss-process=image/quality,q_80', alt:'', title: file.name}
              } 
              
             
            } catch (e: any) {
              message.error('上传失败: ' + e?.message);
            }
            return { url : '', alt:'', title: file.name}

          }),
        );
      }}
      onChange={(v) => {
        props.onChange(v);
      }}
    />
  );
};

async function markdownToHtml(markdown: string) {
  const result = await remark().use(html).process(markdown)
  return result.toString()
}
export function HTMLDetail(props: IComponentProps) {

  const [content , setContent] = useState<string>('')

  useEffect(function() {
    
     
    (async  function() {

      const contentHTML = await markdownToHtml(props.value);
      setContent(contentHTML)
       
     })()


  } , [props.value])

  return <div dangerouslySetInnerHTML={{__html : content}}></div>

}


