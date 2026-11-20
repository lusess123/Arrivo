import { forwardRef } from "react";
import { Input } from "antd";
import type { TextAreaProps, TextAreaRef } from "antd/es/input/TextArea";

const autoSize = { minRows: 1, maxRows: 6 };

export const TaskTitleField = forwardRef<TextAreaRef, TextAreaProps>(
  function TaskTitleField(props, ref) {
    return <Input.TextArea
      {...props}
      ref={ref}
      rows={1}
      autoSize={autoSize}
      maxLength={160}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          (event.ctrlKey || event.metaKey) &&
          !event.nativeEvent.isComposing
        ) {
          event.preventDefault();
          if (!event.repeat) event.currentTarget.form?.requestSubmit();
        }
      }}
    />;
  },
);
