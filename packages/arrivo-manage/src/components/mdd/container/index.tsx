import { DetailContainer } from './detail.container'
import { FormContainer } from './form.container'
import { ListContainer } from './list.container'


export const ContainerRenderComponents: Record<string, any> = {
    'form': FormContainer,
    'list': ListContainer,
    'detail': DetailContainer
}