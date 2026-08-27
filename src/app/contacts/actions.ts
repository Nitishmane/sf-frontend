"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, ApiUnreachableError } from "@/lib/apiClient";
import {
  apiErrorMessage,
  createContact,
  deleteContact,
  replaceContact,
  toFieldErrors,
} from "@/lib/contacts/api";
import {
  contactInputSchema,
  formDataToAddresses,
  formDataToValues,
  zodFieldErrors,
} from "@/lib/contacts/schema";
import type { Contact, FormState } from "@/lib/contacts/types";

/** Mutations for the contacts UI. Every one of these runs only on the server. */

function invalidate(contactId?: number) {
  revalidatePath("/contacts");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

const UNREACHABLE =
  "Could not reach the Contacts API. Check that the backend is running.";

/**
 * Create (when `contactId` is null) or fully replace a contact.
 *
 * Bind the id at the call site — `saveContactAction.bind(null, contact.id)` —
 * so the form itself never carries a mutable record id.
 */
export async function saveContactAction(
  contactId: number | null,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formDataToValues(formData);
  // Addresses repeat, so they cannot come from the flat field map — they are
  // zipped back out of the parallel `address_*` lists the repeater submits.
  const addresses = formDataToAddresses(formData);

  /** Every failure echoes both halves of the form so nothing is retyped. */
  const fail = (state: Omit<FormState, "status" | "values" | "addresses">): FormState => ({
    ...state,
    status: "error",
    values,
    addresses,
  });

  const parsed = contactInputSchema.safeParse({ ...values, addresses });
  if (!parsed.success) {
    return fail({
      message: "Please fix the highlighted fields.",
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }

  let saved: Contact;
  try {
    saved =
      contactId === null
        ? await createContact(parsed.data)
        : await replaceContact(contactId, parsed.data);
  } catch (error) {
    if (error instanceof ApiUnreachableError) {
      return fail({ message: UNREACHABLE });
    }
    if (error instanceof ApiError) {
      if (error.status === 409) {
        return fail({
          message: "That email address is already taken.",
          fieldErrors: {
            email: apiErrorMessage(error, "This email is already in use."),
          },
        });
      }
      if (error.status === 422) {
        return fail({
          message: "The API rejected these values.",
          fieldErrors: toFieldErrors(error),
        });
      }
      return fail({
        message: apiErrorMessage(error, "The contact could not be saved."),
      });
    }
    throw error;
  }

  invalidate(saved.id);
  // Outside the try/catch: redirect() signals by throwing.
  redirect(`/contacts/${saved.id}`);
}

export interface DeleteResult {
  error?: string;
}

/**
 * Delete a contact. Pass `redirectToList` from the detail page, where staying
 * put would leave the user on a 404.
 */
export async function deleteContactAction(
  contactId: number,
  redirectToList = false,
): Promise<DeleteResult> {
  try {
    await deleteContact(contactId);
  } catch (error) {
    if (error instanceof ApiUnreachableError) return { error: UNREACHABLE };
    if (error instanceof ApiError) {
      return {
        error:
          error.status === 404
            ? "That contact has already been deleted."
            : apiErrorMessage(error, "The contact could not be deleted."),
      };
    }
    throw error;
  }

  invalidate(contactId);
  if (redirectToList) redirect("/contacts");
  return {};
}
