import React from 'react'
import { IComponentProps } from '../component'
import dayjs from 'dayjs'

export function DateTimeDetail(props: IComponentProps) {
  return (
    <div>
      { props.value ? dayjs(props.value).format("YYYY-MM-DD HH:mm:ss") : null}
    </div>
  )
}