import React, { useState } from "react";
import { Upload, Button, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import OSS from "ali-oss";

const UploadToOSS = ({ region, accessKeyId, accessKeySecret, stsToken, bucket } : any) => {
  const [client] = useState(
    new OSS({
      region,
      accessKeyId,
      accessKeySecret,
      stsToken,
      bucket,
    })
  );

  const handleUpload = async ({ file }: any) => {
    try {
      const result = await client.put(file.name, file, {
        meta: { temp: "demo" } as any,
        mime: "json",
        headers: { "Content-Type": "text/plain" },
      });
      message.success(`上传成功: ${result.name}`);
      console.log(result);
    } catch (e) {
      message.error(`上传失败: ${e.message}`);
      console.log(e);
    }
  };

  return (
    <Upload
      customRequest={handleUpload}
      showUploadList={false}
    >
      <Button icon={<UploadOutlined />}>上传文件</Button>
    </Upload>
  );
};

export default UploadToOSS;