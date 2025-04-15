import { useState } from 'react'
import { IDict  } from 'arrivo-server'
import { post } from '@/utils/util'
import { createStore } from 'hox'

export function useDictContextInternal() {
    const [dicts, setDicts] = useState<Record<string, IDict>>({})
    function getDict(dictName: string) {
        return dicts[dictName]
    }

    async function fetchDict(names: string[]) {
        const noNames = names.filter(a => !dicts[a])
        const [{ data }] = await post({
            url: 'mdd/meta',
            data: {
                names: noNames
            }
        })
        setDicts({
            ...dicts,
            ...data
        })

    }       

    return {
        getDict,
        fetchDict
    }
}

export const [useDictContext, DictContextProvider] = createStore(useDictContextInternal)

export function DictContextProviderParent(props: any) {
    return <DictContextProvider>{props.children}</DictContextProvider>
}
