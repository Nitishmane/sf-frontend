import ContactFormSkeleton from "@/components/contacts/ContactFormSkeleton";

/**
 * Skeleton while the edit page fetches the contact.
 *
 * Trade-off: streaming starts before the fetch resolves, so an edit URL for a
 * missing ID answers 200 (with a noindex'd 404 page) instead of a hard 404.
 * The detail route deliberately has no `loading.tsx` to keep its real 404
 * (see e2e/contacts.spec.ts); for the edit form we prefer the instant feedback.
 */
export default function EditContactLoading() {
  return <ContactFormSkeleton label="Loading contact…" />;
}
