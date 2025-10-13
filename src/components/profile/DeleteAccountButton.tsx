import { useState, useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface DeleteAccountButtonProps {
  onDelete?: () => void;
}

/**
 * Button that opens a confirmation dialog before deleting account
 * User must type "DELETE" to confirm the action
 */
export function DeleteAccountButton({ onDelete }: DeleteAccountButtonProps) {
  const confirmInputId = useId();

  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmValid = confirmText === "DELETE";

  const handleDelete = useCallback(async () => {
    // Guard clause: early return if validation fails
    if (!isConfirmValid) return;

    setIsDeleting(true);

    // Call the onDelete handler if provided (will connect to API later)
    if (onDelete) {
      await onDelete();
    }

    setIsDeleting(false);
    setOpen(false);
    setConfirmText("");
  }, [isConfirmValid, onDelete]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    setConfirmText("");
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="rounded-lg border border-destructive bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors">
          Delete Account
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>Delete Account</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            This action <strong>cannot be undone</strong>. This will permanently delete your account and remove all your
            data from our servers, including:
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>All your flashcard decks</li>
            <li>All your flashcards</li>
            <li>Your learning progress and statistics</li>
            <li>Your account information</li>
          </ul>
        </div>

        <div className="space-y-2">
          <label htmlFor={confirmInputId} className="text-sm font-medium">
            Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm:
          </label>
          <input
            id={confirmInputId}
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="DELETE"
            disabled={isDeleting}
            aria-label="Type DELETE to confirm account deletion"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!isConfirmValid || isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
