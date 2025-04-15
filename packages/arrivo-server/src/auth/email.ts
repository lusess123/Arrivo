import nodemailer from 'nodemailer';

interface MailOptions {
  from?: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(options: MailOptions): Promise<string> {
  // 创建邮件发送者对象
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, //'smtp.163.com',
    port: 465,
    secure: true, // 对于 465 端口为true，对于其他端口为false
    auth: {
      user: process.env.EMAIL_USER, // 你的126邮箱账号
      pass: process.env.EMAIL_PASS, // 你的126邮箱密码或者授权码
    },
  });

  // 设置邮件内容
  const mailOptions = {
    from: process.env.EMAIL_USER, // 发送者
    to: options.to || process.env.EMAIL_USER, // 接收者
    subject: options.subject, // 邮件主题
    text: options.text, // 邮件文本内容
    html: options.html, // 邮件HTML内容（可选）
  };

  // 发送邮件并处理结果
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Message sent: ${info.messageId}`);
    return 'ok';
  } catch (error) {
    console.error(`Error sending mail: ${error}`);
    return 'error';
  }
}
