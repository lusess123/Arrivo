// Depends on tencentcloud-sdk-nodejs version 4.0.3 or higher
import * as tencentcloud from 'tencentcloud-sdk-nodejs-sms';
// const tencentcloud = require("tencentcloud-sdk-nodejs-sms");
console.log('tencentcloud:', tencentcloud);
const SmsClient = tencentcloud.sms.v20210111.Client;

// 实例化一个认证对象，入参需要传入腾讯云账户 SecretId 和 SecretKey，此处还需注意密钥对的保密
// 代码泄露可能会导致 SecretId 和 SecretKey 泄露，并威胁账号下所有资源的安全性。以下代码示例仅供参考，建议采用更安全的方式来使用密钥，请参见：https://cloud.tencent.com/document/product/1278/85305
// 密钥可前往官网控制台 https://console.cloud.tencent.com/cam/capi 进行获取
const clientConfig = {
  credential: {
    secretId: process.env.SMS_secretId,
    secretKey: process.env.SMS_secretKey,
  },
  region: 'ap-beijing',
  profile: {
    httpProfile: {
      endpoint: 'sms.tencentcloudapi.com',
    },
  },
};

interface ISendParams {
  phoneNumbers: string[];
  vailCode: string;
  id: string;
}
let client: any = new SmsClient(clientConfig);
export async function sendVailCode(param: ISendParams) {
  if (!client) client = new SmsClient(clientConfig);
  const params = {
    PhoneNumberSet: param.phoneNumbers,
    SmsSdkAppId: process.env.SMS_SdkAppId!,
    TemplateId: process.env.SMS_TemplateId!,
    SignName: process.env.SMS_SIGN!,
    TemplateParamSet: [param.vailCode],
    SessionContext: param.id,
  };
  console.log('sendVailCode param:', params, process.env.SMS_SIGN);
  const data = await client.SendSms(params);
  console.log('sendVailCode:', data);
  return data;
}

// 实例化要请求产品的client对象,clientProfile是可选的
