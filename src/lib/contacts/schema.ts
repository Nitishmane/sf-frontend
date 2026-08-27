import { z } from "zod";
import { ADDRESS_TYPES, type AddressInput, type ContactInput } from "./types";

/**
 * Client/server-shared validation for the contact form.
 *
 * The rules mirror the API's Pydantic models (`ContactCreate` / `ContactReplace`)
 * so the user sees a mistake before a round trip — the API stays the authority,
 * and anything it rejects anyway is surfaced by `toFieldErrors` in `./api.ts`.
 */

/** Optional text: trimmed, and blank becomes `null` (the API clears the field). */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => value || null)
    .nullable()
    .default(null);
}

/** Mirrors `MAX_PHOTO_BYTES` and the data-URL rule in the API's `app/schemas.py`. */
export const MAX_PHOTO_BYTES = 1_500_000;
const PHOTO_DATA_URL = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Decoded byte count of a base64 payload, without allocating the bytes. */
function decodedBytes(dataUrl: string): number {
  const payload = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

/** Mirrors `MAX_ADDRESSES` in the API's `app/schemas.py`. */
export const MAX_ADDRESSES = 10;

export const addressInputSchema = z.object({
  type: z.enum(ADDRESS_TYPES),
  street: optionalText(300, "Street address"),
  city: optionalText(120, "City"),
  state: optionalText(120, "State"),
  postal_code: optionalText(20, "Postal code"),
  country: optionalText(120, "Country"),
  is_primary: z.boolean().default(false),
}) satisfies z.ZodType<AddressInput, unknown>;

function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);
}

export const contactInputSchema = z.object({
  first_name: requiredText(100, "First name"),
  last_name: requiredText(100, "Last name"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(320, "Email must be 320 characters or fewer")
    .pipe(z.email("Enter a valid email address"))
    .transform((value) => value.toLowerCase()),
  phone: optionalText(40, "Phone"),
  company: optionalText(200, "Company"),
  job_title: optionalText(200, "Job title"),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .default(null),
  photo: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .default(null)
    .refine(
      (value) => value === null || PHOTO_DATA_URL.test(value),
      "Photo must be a PNG, JPEG, or WebP image",
    )
    .refine(
      (value) => value === null || decodedBytes(value) <= MAX_PHOTO_BYTES,
      "Photo is too large — choose a smaller image",
    ),
  addresses: z
    .array(addressInputSchema)
    .max(MAX_ADDRESSES, `A contact can have at most ${MAX_ADDRESSES} addresses`)
    .default([]),
}) satisfies z.ZodType<ContactInput, unknown>;

export type ContactFormValues = z.input<typeof contactInputSchema>;

/**
 * Collapse a ZodError into one message per field, keyed by input name.
 *
 * The field union is a parameter because the same collapsing works for an
 * address as well as a contact; it defaults to `ContactInput` so the common
 * call site reads unchanged.
 */
export function zodFieldErrors<Field extends string = keyof ContactInput>(
  error: z.ZodError,
): Partial<Record<Field, string>> {
  const fieldErrors: Partial<Record<Field, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key as Field] = issue.message;
    }
  }
  return fieldErrors;
}

/* ------------------------------------------------------------------ */
/* Form metadata — one source of truth for the fields and their limits */
/* ------------------------------------------------------------------ */

export interface ContactFieldSpec {
  name: keyof ContactInput;
  label: string;
  type?: "text" | "email" | "tel" | "textarea" | "photo";
  required?: boolean;
  maxLength: number;
  placeholder?: string;
  autoComplete?: string;
  /** Column span inside the section grid. */
  wide?: boolean;
}

export interface ContactFieldGroup {
  title: string;
  description: string;
  fields: ContactFieldSpec[];
}

export const CONTACT_FIELD_GROUPS: ContactFieldGroup[] = [
  {
    title: "Photo",
    description: "Optional. Cropped to a square and stored with the contact.",
    fields: [
      {
        name: "photo",
        label: "Photo",
        type: "photo",
        // A data URL, not prose: this bounds the base64 string, not the image.
        maxLength: 2_000_000,
        wide: true,
      },
    ],
  },
  {
    title: "Identity",
    description: "First name, last name, and email are required.",
    fields: [
      {
        name: "first_name",
        label: "First name",
        required: true,
        maxLength: 100,
        placeholder: "Ada",
        autoComplete: "given-name",
      },
      {
        name: "last_name",
        label: "Last name",
        required: true,
        maxLength: 100,
        placeholder: "Lovelace",
        autoComplete: "family-name",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        maxLength: 320,
        placeholder: "ada@example.com",
        autoComplete: "email",
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        maxLength: 40,
        placeholder: "+1-415-555-0101",
        autoComplete: "tel",
      },
    ],
  },
  {
    title: "Work",
    description: "Where they work and what they do.",
    fields: [
      {
        name: "company",
        label: "Company",
        maxLength: 200,
        placeholder: "Analytical Engines",
        autoComplete: "organization",
      },
      {
        name: "job_title",
        label: "Job title",
        maxLength: 200,
        placeholder: "Mathematician",
        autoComplete: "organization-title",
      },
    ],
  },
  // Addresses are deliberately *not* a field group: they repeat, so they are
  // rendered by `AddressFields` and parsed by `formDataToAddresses` below.
  {
    title: "Notes",
    description: "Anything worth remembering. No length limit.",
    fields: [
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        maxLength: 10_000,
        placeholder: "Met at the SF hackathon.",
        wide: true,
      },
    ],
  },
];

export const CONTACT_FIELDS: ContactFieldSpec[] = CONTACT_FIELD_GROUPS.flatMap(
  (group) => group.fields,
);

/** Pull the contact fields out of a submitted form, as raw strings. */
export function formDataToValues(
  formData: FormData,
): Record<keyof ContactInput, string> {
  return Object.fromEntries(
    CONTACT_FIELDS.map((field) => [
      field.name,
      String(formData.get(field.name) ?? ""),
    ]),
  ) as Record<keyof ContactInput, string>;
}

/** The repeated input names one address row contributes to the form. */
const ADDRESS_PARTS = [
  "street",
  "city",
  "state",
  "postal_code",
  "country",
] as const;

/**
 * Rebuild the address list from a submitted form.
 *
 * Each row contributes one entry to `address_type`, `address_street`, and so
 * on, so the Nth entry of every list belongs to the same row — `getAll` keeps
 * document order, which is what makes the zip safe. Rows the user added but
 * left completely blank are dropped rather than sent as empty addresses.
 */
export function formDataToAddresses(formData: FormData): AddressInput[] {
  const types = formData.getAll("address_type").map(String);
  const columns = Object.fromEntries(
    ADDRESS_PARTS.map((part) => [
      part,
      formData.getAll(`address_${part}`).map((value) => String(value).trim()),
    ]),
  ) as Record<(typeof ADDRESS_PARTS)[number], string[]>;

  const primary = new Set(formData.getAll("address_is_primary").map(String));

  return types
    .map((type, index) => ({
      type: (ADDRESS_TYPES as readonly string[]).includes(type)
        ? (type as AddressInput["type"])
        : "Home",
      street: columns.street[index] || null,
      city: columns.city[index] || null,
      state: columns.state[index] || null,
      postal_code: columns.postal_code[index] || null,
      country: columns.country[index] || null,
      is_primary: primary.has(String(index)),
    }))
    .filter((address) =>
      ADDRESS_PARTS.some((part) => address[part] !== null),
    );
}
