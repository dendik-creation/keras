import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  title: string;
  description: string;
  type: "danger" | "warning" | "info" | "success";
  triggerNode?: React.ReactNode;
  confirmAction?: () => void;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (value: boolean) => void;
};

const ConfirmDialog = ({
  title,
  description,
  type,
  triggerNode,
  confirmAction,
  disabled = false,
  open,
  onOpenChange,
}: ConfirmDialogProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const actualOpen = isControlled ? open : internalOpen;

  const handleOpenChange = (value: boolean) => {
    if (value && disabled) return;
    if (isControlled) {
      onOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  };

  return (
    <Dialog open={actualOpen} onOpenChange={handleOpenChange}>
      {triggerNode && (
        <DialogTrigger asChild disabled={disabled}>
          {triggerNode}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Tidak</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              type="submit"
              onClick={confirmAction}
              variant={
                type == "danger"
                  ? "destructive"
                  : type == "warning"
                    ? "outline"
                    : "outline"
              }
            >
              Ya
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
