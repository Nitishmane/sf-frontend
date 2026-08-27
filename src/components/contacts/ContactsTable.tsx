import Link from "next/link";
import { ArrowDown, ArrowUp, Pencil } from "lucide-react";
import ContactAvatar from "./ContactAvatar";
import DeleteContactButton from "./DeleteContactButton";
import SortHeader from "./SortHeader";
import { buttonClasses } from "@/components/ui/Button";
import { jobLine } from "@/lib/contacts/format";
import { sortHref, type ContactListQuery } from "@/lib/contacts/query";
import type { Contact, SortField } from "@/lib/contacts/types";

const MOBILE_SORT_FIELDS: { field: SortField; label: string }[] = [
  { field: "last_name", label: "Name" },
  { field: "email", label: "Email" },
  { field: "company", label: "Company" },
];

/** Sort pills for the card view, which has no column headers to click. */
function MobileSortLinks({ query }: { query: ContactListQuery }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-2sm">
      <span className="text-muted-foreground">Sort by</span>
      {MOBILE_SORT_FIELDS.map(({ field, label }) => {
        const active = query.sortBy === field;
        return (
          <Link
            key={field}
            href={sortHref(query, field)}
            scroll={false}
            aria-label={`Sort by ${label.toLowerCase()}${
              active
                ? `, currently ${query.order === "asc" ? "ascending" : "descending"}`
                : ""
            }`}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors ${
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {active ? (
              query.order === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              )
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

/** Stacked card per contact, so nothing truncates on a phone. */
function ContactCards({
  contacts,
  query,
}: {
  contacts: Contact[];
  query: ContactListQuery;
}) {
  return (
    <div className="space-y-3">
      <MobileSortLinks query={query} />

      <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-border bg-card">
        {contacts.map((contact) => {
          const subtitle = jobLine(contact);

          return (
            <li key={contact.id} className="flex items-start gap-3 px-4 py-3">
              <ContactAvatar contact={contact} size="md" />

              <div className="min-w-0 flex-1">
                <Link
                  href={`/contacts/${contact.id}`}
                  className="block break-words font-medium text-foreground hover:text-primary"
                >
                  {contact.full_name}
                </Link>
                {subtitle ? (
                  <span className="block break-words text-2sm text-muted-foreground">
                    {subtitle}
                  </span>
                ) : null}
                <a
                  href={`mailto:${contact.email}`}
                  className="mt-1 block break-words text-2sm text-muted-foreground hover:text-primary"
                >
                  {contact.email}
                </a>
                {contact.phone ? (
                  <a
                    href={`tel:${contact.phone}`}
                    className="block break-words text-2sm text-muted-foreground hover:text-primary"
                  >
                    {contact.phone}
                  </a>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/contacts/${contact.id}/edit`}
                  aria-label={`Edit ${contact.full_name}`}
                  className={buttonClasses("ghost", "sm")}
                >
                  <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                </Link>
                <DeleteContactButton
                  contactId={contact.id}
                  contactName={contact.full_name}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The contacts list: stacked cards below `sm` (where table columns would
 * truncate), the sortable table from `sm` up.
 */
export default function ContactsTable({
  contacts,
  query,
}: {
  contacts: Contact[];
  query: ContactListQuery;
}) {
  return (
    <>
      <div className="sm:hidden">
        <ContactCards contacts={contacts} query={query} />
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card sm:block">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Contacts, sorted by {query.sortBy.replace("_", " ")} {query.order}
        </caption>
        <thead className="border-b border-hairline bg-secondary/40 text-left text-2sm font-medium">
          <tr>
            <SortHeader field="last_name" label="Name" query={query} />
            <SortHeader field="email" label="Email" query={query} />
            <th scope="col" className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">
              Phone
            </th>
            <SortHeader
              field="company"
              label="Company"
              query={query}
              className="hidden lg:table-cell"
            />
            <th scope="col" className="px-4 py-2.5 text-right text-muted-foreground">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {contacts.map((contact) => {
            const subtitle = jobLine(contact);

            return (
              <tr
                key={contact.id}
                className="border-b border-hairline last:border-b-0 transition-colors hover:bg-secondary/30"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <ContactAvatar contact={contact} size="sm" />
                    <div className="min-w-0">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="block truncate font-medium text-foreground hover:text-primary"
                      >
                        {contact.full_name}
                      </Link>
                      {subtitle ? (
                        <span className="block truncate text-xs text-muted-foreground lg:hidden">
                          {subtitle}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>

                <td className="max-w-[16rem] px-4 py-2.5">
                  <a
                    href={`mailto:${contact.email}`}
                    className="block truncate text-muted-foreground hover:text-primary"
                  >
                    {contact.email}
                  </a>
                </td>

                <td className="hidden whitespace-nowrap px-4 py-2.5 text-muted-foreground sm:table-cell">
                  {contact.phone ? (
                    <a href={`tel:${contact.phone}`} className="hover:text-primary">
                      {contact.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>

                <td className="hidden max-w-[14rem] px-4 py-2.5 text-muted-foreground lg:table-cell">
                  <span className="block truncate">
                    {contact.company ?? (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </span>
                </td>

                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/contacts/${contact.id}/edit`}
                      aria-label={`Edit ${contact.full_name}`}
                      className={buttonClasses("ghost", "sm")}
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                    <DeleteContactButton
                      contactId={contact.id}
                      contactName={contact.full_name}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
