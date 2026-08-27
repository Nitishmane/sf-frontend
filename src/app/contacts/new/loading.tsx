import ContactFormSkeleton from "@/components/contacts/ContactFormSkeleton";

/** Instant feedback while the new-contact segment streams in. */
export default function NewContactLoading() {
  return <ContactFormSkeleton label="Loading form…" />;
}
