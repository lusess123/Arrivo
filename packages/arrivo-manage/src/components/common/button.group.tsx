import { EllipsisOutlined } from "@ant-design/icons";
import { Button, Dropdown, Popconfirm, Space } from "antd";
import React from "react";
interface IButtonItemProps {
  label: string;
  onClick?: () => void;
  dropdown?: boolean;
  show?: boolean;
  key?: string;
  danger?: boolean;
  confirm?: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    onConfirm: () => void;
  };
}

interface IButtonGroup {
  items: IButtonItemProps[];
  count?: number;
}

function ButtonItem(props: IButtonItemProps) {
  if (props.confirm) {
    return (
      <Popconfirm
        title={props.confirm.title}
        description={props.confirm.description}
        onConfirm={props.confirm.onConfirm}
        okText="确定"
        cancelText="取消"
      >
        <Button
          type="text"
        //   danger={!!props.danger}
        //   className="!text-[#10A37F] text-[13px]"
          size="small"
          className={`${props.danger ? '!text-[red]':  !props.dropdown && props.show && '!text-[#10A37F]' } text-[13px]`}
        >
          {props.label}
        </Button>
      </Popconfirm>
    );
  }
  return (
    <Button
      onClick={props.onClick}
      
      
      type="text"
    //   danger={!!props.danger}
    //   danger

      className={`${props.danger ? '!text-[red]': (!props.dropdown && props.show) && '!text-[#10A37F]' } text-[13px]`}
      size="small"
    >
      {props.label}
    </Button>
  );
}
function ButtonGroup(props: IButtonGroup) {
  const { items, count = 3 } = props;
  const showItems = items.filter((item) => !!item.show || item.show === undefined);
  if (showItems.length === 0) {
    return <div></div>;
  }
  const showItems1 = showItems.slice(0, count);
  const showItems2 = showItems.slice(count);
  // -------
  return (
    <Space>
           <Space size={1} split={<div className="w-[1px] h-[10px] bg-[#6E6E80]"></div>}>
      {showItems1.map((item) => {
         const { key ,  ...props } = item
         return <ButtonItem   {...props}  key={key}  />;
      })}
    </Space>
           {showItems2.length > 0 && (
        <Dropdown
          
          menu={{
            className: "px-0",
            items: showItems2.map((item) => {
              const { key ,  ...props } = item
              return  {
                key: key!,
                label: <ButtonItem dropdown key={key}  {...props} />
              }
            }),
          }}
        >
          <EllipsisOutlined className="hover:cursor-pointer" />
        </Dropdown>
      )}
    </Space>
 

  );
}

export default ButtonGroup;
