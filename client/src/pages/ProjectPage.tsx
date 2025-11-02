import { Link } from "react-router-dom";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";

const ProjectPage = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container py-8 pt-24">
      {/* Back Button */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/" className="flex items-center space-x-2">
            <ChevronLeft className="h-4 w-4" />
            <span>All Active Projects</span>
          </Link>
        </Button>
      </div>

      {/* Project Registration Message */}
      <div className="flex justify-center items-center min-h-[400px]">
        <Card className="max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-6" />
            <h1 className="font-heading text-2xl font-bold mb-4">Uh oh, looks like you still need to register your project!</h1>
            <p className="text-muted-foreground mb-6">
              Contact a member of staff.
            </p>
            <Button asChild>
              <Link to="/" className="flex items-center space-x-2">
                <span>Return to Home</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
};

export default ProjectPage; 