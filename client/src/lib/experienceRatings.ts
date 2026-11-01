// Event experience ratings a builder gives when they submit a project. Every
// category is required, scored 1 to 5. Keep the ids in sync with
// server/api/constants/experienceRatings.js. No em-dashes in copy.

export const RATING_MIN = 1;
export const RATING_MAX = 5;

export const EXPERIENCE_RATING_CATEGORIES = [
  { id: "overall", label: "Overall experience" },
  { id: "organisation", label: "Organisation & logistics" },
  { id: "support", label: "Mentors & organiser support" },
  { id: "tools", label: "Sponsor tools & docs" },
] as const;

export type ExperienceRatingCategory = (typeof EXPERIENCE_RATING_CATEGORIES)[number]["id"];

/** What the form sends: every category scored. */
export type ExperienceRatings = Record<ExperienceRatingCategory, number>;

/** The form's in-progress state: a category stays unset until rated. */
export type ExperienceRatingsDraft = Partial<ExperienceRatings>;

/** The rating's DOM id, used to mark it red and scroll to it. */
export const ratingFieldId = (id: ExperienceRatingCategory) => `rate-${id}`;

export const isRatingsComplete = (r: ExperienceRatingsDraft): r is ExperienceRatings =>
  EXPERIENCE_RATING_CATEGORIES.every(({ id }) => {
    const v = r[id];
    return typeof v === "number" && Number.isInteger(v) && v >= RATING_MIN && v <= RATING_MAX;
  });
