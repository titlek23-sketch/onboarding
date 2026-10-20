import { requireRole } from "@/lib/roles";
import { createClient, selectAll } from "@/lib/supabase/server";
import FaqSearch, { type Faq } from "./FaqSearch";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  await requireRole("hire");
  const supabase = await createClient();
  const faqs = await selectAll<Faq>(
    supabase,
    "faq",
    "faq_id, category, question, aliases, short_answer, detail, department",
    "faq_id"
  );

  return <FaqSearch faqs={faqs} />;
}
