"use client";
import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { removeLocalStorage } from "@/helper/local_storage";

const LogoutMenu = () => {
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      const response = await axios.post("/api/logout");
      if (response.status === 200) {
        removeLocalStorage("active_user");
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
    setOpen(false);
  };

  const handleClick = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <DropdownMenuItem
        key={"sign-out"}
        className="flex text-red-600 w-full cursor-pointer items-center gap-2"
        onSelect={handleClick}
      >
        <LogOut />
        Logout
      </DropdownMenuItem>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Out</DialogTitle>
            <DialogDescription>
              Jika Anda keluar, Anda harus login kembali untuk mengakses sistem
              ini.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Tidak
            </Button>
            <Button variant="destructive" onClick={handleSignOut}>
              Ya
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LogoutMenu;
