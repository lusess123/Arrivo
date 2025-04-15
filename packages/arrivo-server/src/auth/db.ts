// import { customAlphabet } from "nanoid";
export const importDynamic = new Function(
  'modulePath',
  'return import(modulePath)',
);

import { format } from 'date-fns';

let customAlphabet;
let uniQueAnoid;
let rand5Aniod;
let rand6Aniod;
let rand4Aniod;
let rand15Aniod;
let rand10Aniod;
// 定义一个包含数字的字符集合
const numbers = '0123456789';

const alphabet = '0123456789';
importDynamic('nanoid').then((res) => {
  customAlphabet = res.customAlphabet;
  uniQueAnoid = customAlphabet(
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    33,
  );
  rand5Aniod = customAlphabet(alphabet, 5);

  // 创建一个生成 6 位数验证码的函数
  rand6Aniod = customAlphabet(numbers, 6);
  // 创建一个生成 6 位数验证码的函数
  rand4Aniod = customAlphabet(numbers, 4);
  rand10Aniod = customAlphabet(
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    10,
  );
  rand15Aniod = customAlphabet(numbers, 15);
});

export function generateUniqueId() {
  // const { customAlphabet } = await importDynamic("nanoid");

  const timestamp = format(new Date(), 'yyyyMMddHHmmssSSS'); // Format timestamp to YYYYMMDDHHmmssSSS
  const randomString = uniQueAnoid(); // Generate a random string
  const id = timestamp + randomString;

  // Ensure the ID is exactly 50 characters long
  return id.padEnd(50, '0').slice(0, 50);
}
export function generateUniqueId32() {
  // const { customAlphabet } = await importDynamic("nanoid");

  const timestamp = format(new Date(), 'yyyyMMddHHmmssSSS'); // Format timestamp to YYYYMMDDHHmmssSSS
  const randomString = rand15Aniod(); // Generate a random string
  const id = timestamp + randomString;

  // Ensure the ID is exactly 50 characters long
  return id.padEnd(32, '0').slice(0, 32);
}

export function genRandomId() {
  return rand5Aniod();
}

export function genRandomId6() {
  return rand6Aniod();
}
export function genLink() {
  return rand10Aniod();
}

export function genCode() {
  return rand4Aniod();
}

export function listToString(list: string[] | number[] = []) {
  return list.join(',');
}

// export default generateUniqueId;
