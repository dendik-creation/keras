import React from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { ActionDrawerHeader } from "./ActionDrawerHeader";
import { ActionDrawerItem, ActionDrawerItemProps } from "./ActionDrawerItem";

interface ActionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: ActionDrawerItemProps[];
}

export function ActionDrawer({ open, onOpenChange, actions }: ActionDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] rounded-t-[24px] bg-[#F2F2F2] border-t-2 border-black focus-visible:outline-none">
        <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-[#999]" />
        <div className="p-6 focus:outline-none flex flex-col h-full">
          <ActionDrawerHeader title="AKSI JADWAL KRS" />
          <div className="flex flex-col gap-4 mt-6 overflow-y-auto pb-4">
            {actions.map((action) => (
              <ActionDrawerItem key={action.id} {...action} />
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
