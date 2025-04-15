export const userNamePattern = /^[a-zA-Z0-9_]{3,16}$/;

export const phoneNumberPattern =
  /1(?:(?:3[0-9])|(?:4[01456879])|(?:5[0-35-9])|(?:6[2567])|(?:7[0-8])|(?:8[0-9])|(?:9[0-35-9]))\d{8}/;

export const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const moonshotFiles: string[] =
  '.jpg .pdf .txt .csv .doc .docx .xls .xlsx .ppt .pptx .md .jpeg .png .bmp .gif .svg .svgz .webp .ico .xbm .dib .pjp .tif .pjpeg .avif .dot .apng .epub .tiff .jfif .html .json .mobi .log .go .h .c .cpp .cxx .cc .cs .java .js .css .jsp .php .py .py3 .asp .yaml .yml .ini .conf .ts .tsx'.split(
    ' ',
  );

export const MaxWordSize = 10000;
export const MaxFileLength = 50;
