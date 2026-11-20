import { forwardRef } from "react";
import { Input } from "antd";
import type { TextAreaProps, TextAreaRef } from "antd/es/input/TextArea";

const autoSize = { minRows: 1, maxRows: 6 };

export const ExpandableTextField = forwardRef<TextAreaRef, TextAreaProps>(
  function ExpandableTextField({ maxLength = 160, ...props }, ref) {
    return <Input.TextArea
      {...props}
      ref={ref}
      rows={1}
      autoSize={autoSize}
      maxLength={maxLength}
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
