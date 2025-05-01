import 'umi/typings';

declare module '*.less' {
    const classes: { [key: string]: string };
    export default classes;
  }

declare module 'classnames';
declare module '*.png';
declare module '*.module.less';
