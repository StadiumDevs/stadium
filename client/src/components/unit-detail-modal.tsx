import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Github } from "lucide-react";

interface Unit {
  unitNumber: string;
  title: string;
  author: string;
  description: string;
  longDescription?: string;
  track: string;
  isWinner?: boolean;
  isM2?: boolean;
  prize?: string;
  date?: string;
  demoUrl?: string;
  githubUrl?: string;
  projectUrl?: string;
}

interface UnitDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit;
}

export function UnitDetailModal({ open, onOpenChange, unit }: UnitDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="lcd max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="label-hw-dim mb-2">
            UNIT {unit.unitNumber}{unit.date && ` · ${unit.date}`}
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="font-mono text-3xl font-bold text-display tracking-tight">
                {unit.title}
              </DialogTitle>
              <DialogDescription className="label-hw-dim mt-2">
                BY {unit.author.toUpperCase()}
              </DialogDescription>
            </div>
            <div className="flex gap-1">
              {unit.isWinner && (
                <span className="bg-display text-shell px-2 py-1 font-mono text-[10px] font-bold tracking-[0.12em]">
                  WINNER
                </span>
              )}
              {unit.isM2 && (
                <span className="border border-display text-display px-2 py-1 font-mono text-[10px] font-bold tracking-[0.12em]">
                  M2
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-4 bg-hairline-subtle" />

        <div className="space-y-4">
          <div>
            <div className="label-hw mb-2">TRACK</div>
            <Badge
              variant="outline"
              className="font-mono text-[10px] tracking-[0.14em] border-hairline text-label-mid bg-transparent"
            >
              {unit.track.toUpperCase()}
            </Badge>
          </div>

          {unit.prize && (
            <div>
              <div className="label-hw mb-2">PRIZE</div>
              <div className="font-mono text-display font-bold">{unit.prize}</div>
            </div>
          )}

          <div>
            <div className="label-hw mb-2">DESCRIPTION</div>
            <p className="text-body leading-relaxed">
              {unit.longDescription || unit.description}
            </p>
          </div>

          <Separator className="bg-hairline-subtle" />

          <div className="flex gap-2">
            {unit.demoUrl && (
              <Button className="flex-1" onClick={() => window.open(unit.demoUrl, "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                VIEW DEMO
              </Button>
            )}
            {unit.projectUrl && (
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => window.open(unit.projectUrl, "_blank")}
              >
                PROJECT PAGE
              </Button>
            )}
            {unit.githubUrl && (
              <Button
                variant="outline"
                size="icon"
                className="text-label-mid hover:text-display"
                onClick={() => window.open(unit.githubUrl, "_blank")}
                aria-label="View on GitHub"
              >
                <Github className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
