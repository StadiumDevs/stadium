import { Card, CardContent } from "@/components/ui/card"
import { Hammer, Clock, Trophy } from "lucide-react"
import { motion } from "framer-motion"

interface M2StatusOverviewProps {
  buildingCount: number
  underReviewCount: number
  graduatesCount: number
  onFilterClick?: (status: 'building' | 'under_review' | 'completed' | null) => void
  activeFilter?: string | null
}

export function M2StatusOverview({ 
  buildingCount, 
  underReviewCount, 
  graduatesCount,
  onFilterClick,
  activeFilter
}: M2StatusOverviewProps) {
  const total = buildingCount + underReviewCount + graduatesCount

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Building */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card 
          className={`border-primary/30 bg-primary/5 hover:border-primary/50 transition-all cursor-pointer ${
            activeFilter === 'building' ? 'ring-2 ring-primary shadow-lg' : ''
          }`}
          onClick={() => onFilterClick?.(activeFilter === 'building' ? null : 'building')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Building</p>
                <p className="text-3xl font-bold">{buildingCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Weeks 1-4</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Hammer className="h-6 w-6 text-primary" />
              </div>
            </div>
            {activeFilter === 'building' && (
              <p className="text-xs text-primary mt-2">Click to clear filter</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Under Review */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card 
          className={`border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50 transition-all cursor-pointer ${
            activeFilter === 'under-review' ? 'ring-2 ring-orange-500 shadow-lg' : ''
          }`}
          onClick={() => onFilterClick?.(activeFilter === 'under-review' ? null : 'under_review')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Under Review</p>
                <p className="text-3xl font-bold">{underReviewCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Weeks 5-6</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
            </div>
            {activeFilter === 'under-review' && (
              <p className="text-xs text-orange-500 mt-2">Click to clear filter</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Graduates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card 
          className={`border-green-500/30 bg-green-500/5 hover:border-green-500/50 transition-all cursor-pointer ${
            activeFilter === 'completed' ? 'ring-2 ring-green-500 shadow-lg' : ''
          }`}
          onClick={() => onFilterClick?.(activeFilter === 'completed' ? null : 'completed')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">M2 Graduates</p>
                <p className="text-3xl font-bold">{graduatesCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Completed</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-green-500" />
              </div>
            </div>
            {activeFilter === 'completed' && (
              <p className="text-xs text-green-500 mt-2">Click to clear filter</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

