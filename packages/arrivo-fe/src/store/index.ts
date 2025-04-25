import { types, Instance, destroy, detach } from "mobx-state-tree";

export const RootStore = types.model("RootStore", {
   userName: types.optional(types.string, ""),
   userData: types.map(types.frozen())     // 写法 1：直接 any
}).actions(self => ({
  setUserName(name: string) {
    self.userName = name;
  },
  setUserData(data: any) {
    self.userData.set(data.id, data);
  }
}));

export type RootStoreType = Instance<typeof RootStore>;


