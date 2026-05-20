import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Github } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UnitCardProps {
  unitNumber: string;          // "001", "014" — zero-padded
  title: string;
  author: string;
  description: string;
  track: string;
  isWinner?: boolean;
  isM2?: boolean;
  date?: string;               // "FEB 04"
  prize?: string;              // "$4,000"
  demoUrl?: string;
  githubUrl?: string;
  projectUrl?: string;
  className?: string;
  onClick?: () => void;
}

export function UnitCard({
  unitNumber,
  title,
  author,
  description,
  track,
  isWinner,
  isM2,
  date,
  prize,
  demoUrl,
  githubUrl,
  projectUrl,
  className,
  onClick,
}: UnitCardProps) {
  return (
    <Card
      className={cn(
        "lcd cursor-pointer transition-transform duration-150 hover:-translate-y-[1px] relative",
        className
      )}
      onClick={onClick}
    >
      {(isWinner || isM2) && (
        <div className="absolute top-3 right-3 flex gap-1 z-10">
          {isWinner && (
            <span className="bg-display text-shell px-2 py-[2px] font-mono text-[9px] font-bold tracking-[0.12em]">
              WINNER
            </span>
          )}
          {isM2 && (
            <span className="border border-display text-display px-[7px] py-[1px] font-mono text-[9px] font-bold tracking-[0.12em]">
              M2
            </span>
          )}
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="label-hw-dim mb-2">
          UNIT {unitNumber}{date && ` · ${date}`}
        </div>
        <h3 className="font-mono text-xl font-bold text-display tracking-tight line-clamp-1">
          {title}
        </h3>
        <div className="label-hw-dim mt-1">BY {author.toUpperCase()}</div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-[12px] text-body leading-[1.65] line-clamp-3">{description}</p>
      </CardContent>

      <CardFooter className="pt-3 border-t border-hairline-subtle flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="font-mono text-[9px] tracking-[0.14em] border-hairline text-label-mid bg-transparent"
          >
            {track.toUpperCase()}
          </Badge>
          {prize && (
            <span className="font-mono text-[10px] font-bold text-display">{prize}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="led led-sm led-pulse" aria-label="active" />
          {demoUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-label-mid hover:text-display"
              onClick={(e) => {
                e.stopPropagation();
                window.open(demoUrl, "_blank");
              }}
              aria-label="View demo"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
          {githubUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-label-mid hover:text-display"
              onClick={(e) => {
                e.stopPropagation();
                window.open(githubUrl, "_blank");
              }}
              aria-label="View on GitHub"
            >
              <Github className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
