export type Review = { id: string; firstName: string; city?: string; rating: number; text: Record<"fr" | "ar", string>; photo?: string };
// Add only verified customer-supplied reviews here. Empty slots are explicitly labelled placeholders.
export const reviews: Review[] = [];
