import { message } from 'antd';
import axios from 'axios'
import { AxiosRequestConfig } from 'axios';
/**
 * 检查值是否为 ISO 8601 日期字符串并转换为 Date 对象
 * @param {any} value - 要检查和转换的值
 * @returns {any} - 如果是日期字符串，则返回 Date 对象，否则返回原值
 */
export function convertToDateIfString(value: any) {
    // 检查是否为字符串
    if (typeof value === 'string') {
      // 检查是否符合 ISO 8601 日期格式
    //   const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
    //   if (isoDatePattern.test(value)) {
        // 转换为 Date 对象
        return new Date(value);
    //   }
    }
    // 返回原值
    return value;
  }
  
  export const asyncHandle = <T, U = any>(
    promise: Promise<T>
  ): Promise<[U | null, T | null]> => {
    if (!promise || typeof promise.then !== 'function') {
      return Promise.reject(new Error('requires promises as the param')).catch(
        (err: U) => {
          return [err, null];
        }
      );
    }
  
    return promise
      .then((result: T): [null, T] => {
        return [null, result];
      })
      .catch((err: U): [U, null] => {
        return [err, null];
      });
  };

  export interface IAjaxOps {
    url: string;
    data?: any;
    method?: 'post' | 'get'
    errorResponse?: (error: any) => any
  }

  const ajaxOps = {
    urlheader: '/api/',

  }

  export function match(matches: any, pathname: string) {
    return matches.find((pattern: any) => {
      const regex = new RegExp(pattern);
      const result = regex.test(pathname);
      return result
    });
  }

  function isPromise(value: any) {
    return (typeof value === 'object' && typeof value.then === 'function') || value instanceof Promise;
  }
  

  export async function axiosCall(ops : IAjaxOps) {
    // const handle = asyncHandle(axios.get)
    const axiosMethod = ops.method === 'get' ? axios.get : axios.post;
    const newData = ops.method === 'get' ? { params: ops.data } :  ops.data ;
    const [error, response] = await asyncHandle(axiosMethod(ajaxOps.urlheader +  ops.url, newData))
    if(error) {
      if(ops.errorResponse) {

        const errorResponseReturn = ops.errorResponse(error)
        if(isPromise(errorResponseReturn)) {
           const res = await errorResponseReturn
           if(res) {
               return await axiosCall(ops)
           }

        } else {
          return  [undefined, errorResponseReturn] as any
        }
        
      } else {
        const msg = error?.response?.data?.message || error?.message 
        if(message) {
          message.error(msg)
        }
        const errorRes = error && error.response && error.response.data
        return [undefined,errorRes] as any;
      }
    
    }else {
      return [response?.data || response, undefined] as any;
    }
  }

  export async function get(ops : IAjaxOps) {
    return axiosCall({ ...ops, method: 'get' })
  }

  export async function post(ops : IAjaxOps) {
    return axiosCall({ ...ops, method: 'post' })
  }


  interface StreamResponse {
    success: boolean;
    data?: string;
    error?: any;
}

interface StreamResponse {
  success: boolean;
  error?: any;
}

export async function fetchStream<T>(
  url: string,
  data: T,
  onData: (chunk: string) => void,
  config?: RequestInit
): Promise<StreamResponse> {
  try {
      const response = await fetch(url, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded', // 设置请求头
                'Accept': 'text/event-stream', // 设置接收流式响应的请求头
          

              ...config?.headers,
          },
         
          body: JSON.stringify(data),
          ...config,
      });

      if (!response.body) {
          throw new Error('ReadableStream not supported in this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) {
              const chunk = decoder.decode(value, { stream: !done });
              onData(chunk); // 调用回调函数处理每一个数据块
          }
      }

      return { success: true };
  } catch (error) {
      return { success: false, error };
  }
}



// import { AxiosRequestConfig } from 'axios';

interface StreamResponse {
    success: boolean;
    error?: any;
}

export async function fetchStream2<T>(
    url: string,
    data: T,
    onData: (chunk: any) => void,
    config?: AxiosRequestConfig
): Promise<StreamResponse> {
    try {
        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json',
                ...config?.headers,
            },
            responseType: 'stream',
            ...config,
        });

        const reader = response.data.getReader();
        const decoder = new TextDecoder('utf-8');

        let done = false;

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            const chunk = decoder.decode(value, { stream: true });
            try {
                const json = JSON.parse(chunk.trim().replace(/^data: /, ''));
                onData(json); // 调用回调函数处理每一个数据块
            } catch (e) {
                console.error('Error parsing JSON chunk:', e);
            }
        }

        return { success: true };
    } catch (error) {
        return { success: false, error };
    }
}

export async function  asyncFun(fun: ()=> void) {
      await fun()
}


/**
 * 获取文件扩展名
 * @param {string} fileName - 文件名
 * @return {string} - 文件扩展名或空字符串
 */
export function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.slice(dotIndex) : '';
}

// hash.ts
/**
 * 计算文件或数据的SHA-256哈希值
 * @param {ArrayBuffer} data - 文件数据
 * @returns {Promise<string>} - 返回哈希值的16进制字符串
 */
export async function calculateHash(data: ArrayBuffer): Promise<string> {
  // 使用Web Crypto API计算hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // 将hashBuffer转换为Uint8Array
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // 将Uint8Array转换为16进制字符串
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}




// 使用示例
// convertHtmlToPdf('content-to-pdf', 'example.pdf');



