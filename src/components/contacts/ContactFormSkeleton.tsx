/**
 * Skeleton matching the shape of a contact form page: back link, page header,
 * then a few field groups. Shared by the `new` and `edit` loading states.
 */
export default function ContactFormSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8" aria-busy="true">
      <span className="sr-only">{label}</span>

      <div>
        <div className="h-5 w-28 animate-pulse rounded bg-secondary" />
        <div className="mt-2 h-8 w-52 animate-pulse rounded bg-secondary" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-secondary" />
      </div>

      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, group) => (
          <div key={group} className="space-y-4">
            <div className="space-y-2 border-b border-hairline pb-2">
              <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
              <div className="h-4 w-56 animate-pulse rounded bg-secondary" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, field) => (
                <div key={field} className="space-y-1.5">
                  <div className="h-4 w-20 animate-pulse rounded bg-secondary" />
                  <div className="h-9 w-full animate-pulse rounded-md bg-secondary" />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2 border-t border-hairline pt-4">
          <div className="h-9 w-32 animate-pulse rounded-md bg-secondary" />
          <div className="h-9 w-20 animate-pulse rounded-md bg-secondary" />
        </div>
      </div>
    </div>
  );
}
