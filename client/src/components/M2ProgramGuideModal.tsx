import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Lightbulb, 
  CheckCircle2,
  Trophy,
  MessageSquare,
  Target
} from "lucide-react";

interface M2ProgramGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function M2ProgramGuideModal({ open, onOpenChange }: M2ProgramGuideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-heading flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            Milestone 2 Accelerator Program
          </DialogTitle>
          <DialogDescription>
            A 6-week post-hackathon support program for WebZero hackathon winners
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* What is M2 */}
          <section>
            <h2 className="text-2xl font-heading mb-3 flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              What is the M2 Accelerator?
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The Milestone 2 (M2) Accelerator is a <strong>6-week post-hackathon support program</strong> designed 
              to help winning teams from WebZero hackathons to complete their second milestone and become grant-ready. 
              The program provides structured mentorship, financial support, and resources to transform hackathon 
              projects into fundable products.
            </p>
            <div className="mt-4 p-4 bg-primary/5 border-l-4 border-primary rounded-r">
              <p className="text-sm">
                <strong>Current Cohort:</strong> Third iteration, supporting winners of the{" "}
                <a 
                  href="https://luma.com/sub0hack" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  sub0 Hack
                </a>
                , Buenos Aires (Nov 14-16, 2025)
              </p>
            </div>
          </section>

          <Separator />

          {/* Timeline */}
          <section>
            <h2 className="text-2xl font-heading mb-4 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              Program Timeline
            </h2>
            <Card className="bg-secondary/30">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1 whitespace-nowrap">6 Weeks</Badge>
                    <div>
                      <p className="font-medium">November 17 - January 5</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Week 0:</strong> Setup and planning
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Week 1:</strong> Required mentor alignment session
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Weeks 2-4:</strong> Building with ongoing mentor support
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Weeks 5-6:</strong> Final reviews and evaluations
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Financial Support */}
          <section>
            <h2 className="text-2xl font-heading mb-4 flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-green-500" />
              Financial Support
            </h2>
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-500">$4,000</p>
                    <p className="text-sm text-muted-foreground">per team</p>
                  </div>
                  <Separator />
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start gap-2">
                      <Badge className="bg-green-500">M1</Badge>
                      <div>
                        <p className="font-medium">$2,000</p>
                        <p className="text-muted-foreground">Paid upon program start</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="bg-green-500">M2</Badge>
                      <div>
                        <p className="font-medium">$2,000</p>
                        <p className="text-muted-foreground">Paid upon completion & approval</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Who Can Participate */}
          <section>
            <h2 className="text-2xl font-heading mb-4 flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Who Can Participate?
            </h2>
            <Card className="bg-secondary/30">
              <CardContent className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <p>
                      <strong>4 winning teams</strong> selected from the sub0 hackathon main track
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p>
                      Must have completed <strong>Milestone 1</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Target className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <p>
                      Must commit to completing <strong>Milestone 2 within 6 weeks</strong>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* What You'll Get */}
          <section>
            <h2 className="text-2xl font-heading mb-4">What You'll Get</h2>
            
            <div className="space-y-4">
              {/* Expert Mentorship */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Expert Mentorship
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>5-8 experienced mentors supporting the cohort</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Each team receives 1 primary + 1 backup mentor</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Required Week 1 check-in to align on your milestone goals</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Optional additional mentor sessions whenever you need guidance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Final evaluation and feedback from your assigned mentor</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Program Support */}
              <Card className="bg-secondary/30">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Program Support
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Dedicated Telegram chat for your team</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Weekly progress check-ins and feedback</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Direct access to the WebZero program team</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Clear milestone agreements done alongside mentors so you know exactly what success looks like</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Post-Program Benefits */}
              <Card className="bg-green-500/5 border-green-500/20">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-green-500" />
                    Post-Program Benefits
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">•</span>
                      <span>Grant application assistance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">•</span>
                      <span>Investor introductions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">•</span>
                      <span>Access to the alumni network</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">•</span>
                      <span>Ongoing ecosystem support</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          {/* How It Works */}
          <section>
            <h2 className="text-2xl font-heading mb-4 flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              How It Works
            </h2>
            <div className="space-y-3">
              <Card className="bg-secondary/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Badge className="bg-primary text-primary-foreground">1</Badge>
                    <div className="flex-1">
                      <p className="font-medium mb-1">Week 0</p>
                      <p className="text-sm text-muted-foreground">
                        Join your team chat, submit your participation form, and start planning your Milestone 2 scope
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-secondary/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Badge className="bg-primary text-primary-foreground">2</Badge>
                    <div className="flex-1">
                      <p className="font-medium mb-1">Week 1</p>
                      <p className="text-sm text-muted-foreground">
                        Meet with your assigned mentor to finalize and document your Milestone 2 plan
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-secondary/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Badge className="bg-primary text-primary-foreground">3</Badge>
                    <div className="flex-1">
                      <p className="font-medium mb-1">Weeks 2-4</p>
                      <p className="text-sm text-muted-foreground">
                        Build your project with weekly updates and mentor support available
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-secondary/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Badge className="bg-primary text-primary-foreground">4</Badge>
                    <div className="flex-1">
                      <p className="font-medium mb-1">Weeks 5-6</p>
                      <p className="text-sm text-muted-foreground">
                        Submit your completed work for review, present to mentors, and receive final approval
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-4 p-4 bg-green-500/10 border-l-4 border-green-500 rounded-r">
                <p className="text-sm">
                  <strong className="text-green-500">💰 Final Payment:</strong> Upon approval, your final M2 payment is processed within 7 business days.
                </p>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

