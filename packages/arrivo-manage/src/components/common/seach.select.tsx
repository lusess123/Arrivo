import React, { useCallback, useMemo, useRef, useState } from "react";
import { Select, Spin } from "antd";
import type { SelectProps } from "antd";
import debounce from "lodash/debounce";
import { get } from "../../utils/util";

export interface DebounceSelectProps<ValueType = any>
    extends Omit<SelectProps<ValueType | ValueType[]>, "options" | "children"> {
    fetchOptions: (search: string) => Promise<ValueType[]>;
    debounceTimeout?: number;
}

function DebounceSelect<
    ValueType extends {
        key?: string;
        label: React.ReactNode;
        value: string | number;
    } = any,
>({
    fetchOptions,
    debounceTimeout = 800,
    ...props
}: DebounceSelectProps<ValueType>) {
    const [fetching, setFetching] = useState(false);
    const [options, setOptions] = useState<ValueType[]>([]);
    const fetchRef = useRef(0);

    const debounceFetcher = useMemo(() => {
        const loadOptions = (value: string) => {
            fetchRef.current += 1;
            const fetchId = fetchRef.current;
            setOptions([]);
            setFetching(true);

            fetchOptions(value).then((newOptions) => {
                if (fetchId !== fetchRef.current) {
                    // for fetch callback order
                    return;
                }

                setOptions(newOptions);
                setFetching(false);
            });
        };

        return debounce(loadOptions, debounceTimeout);
    }, [fetchOptions, debounceTimeout]);

    return (
        <Select
            labelInValue
            onFocus={(e) => {
                debounceFetcher(e.target.textContent || "");
            }}
            //   style={{ width: 600 }}
            filterOption={true}
            onSearch={debounceFetcher}
            notFoundContent={fetching ? <Spin size="small" /> : null}
            {...props}
            options={options}
        />
    );
}

// Usage of DebounceSelect
interface UserValue {
    label: string;
    value: string;
}

interface ISearchSelect {
    label: string;
    url: string;
    value?: UserValue[],
    onChange?: any
}

const SearchSelect: React.FC<ISearchSelect> = (props) => {
    const [value, setValue] = useState<UserValue[]>(props.value || []);
    const { url, label } = props;
    const fetchUserList = useCallback(
        async function (text: string): Promise<UserValue[]> {
            const [{ data }]: [any] = await get({
                url,
                data: {
                    pageIndex: 0,
                    pageSize: 50,
                    testTitle: text,
                },
            });
            const options = (data.list || []).map((d: any) => {
                return {
                    value: d.id,
                    label: d.testTitle,
                };
            });
            return options;
        },
        [url]
    );

    return (
        <DebounceSelect
            mode="multiple"
            value={value}
            placeholder={`请选择${label}`}
            fetchOptions={fetchUserList}
            onChange={(newValue) => {
                setValue(newValue as UserValue[]);
                props.onChange(newValue)
            }}
            style={{ width: "100%", minWidth: 300 }}

        />
    );
};

export default SearchSelect;
