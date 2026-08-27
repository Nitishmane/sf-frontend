import {
  CONTACT_FIELDS,
  MAX_ADDRESSES,
  addressInputSchema,
  contactInputSchema,
  formDataToAddresses,
  formDataToValues,
  zodFieldErrors,
} from "@/lib/contacts/schema";
import type { AddressInput } from "@/lib/contacts/types";

function values(overrides: Record<string, string> = {}) {
  return {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "Ada@Example.com",
    phone: "",
    company: "",
    job_title: "",
    notes: "",
    ...overrides,
  };
}

describe("contactInputSchema", () => {
  it("lowercases the email and nulls out the blanks", () => {
    const parsed = contactInputSchema.parse(values());

    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.phone).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it("trims what the user typed", () => {
    expect(contactInputSchema.parse(values({ company: "  Acme  " })).company).toBe(
      "Acme",
    );
  });

  it("requires the three fields the API requires", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: " ", last_name: "", email: "" }),
    );

    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name is required",
      last_name: "Last name is required",
      email: "Email is required",
    });
  });

  it("rejects a malformed email", () => {
    const result = contactInputSchema.safeParse(values({ email: "not-an-email" }));
    expect(zodFieldErrors(result.error!).email).toBe("Enter a valid email address");
  });

  it("enforces the API's length limits", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: "a".repeat(101), company: "c".repeat(201) }),
    );

    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name must be 100 characters or fewer",
      company: "Company must be 200 characters or fewer",
    });
  });

  it("defaults addresses to an empty list", () => {
    expect(contactInputSchema.parse(values()).addresses).toEqual([]);
  });

  it("rejects more addresses than the API accepts", () => {
    const result = contactInputSchema.safeParse({
      ...values(),
      addresses: Array.from({ length: MAX_ADDRESSES + 1 }, () => ({
        type: "Home",
        street: "",
        city: "London",
        state: "",
        postal_code: "",
        country: "",
        is_primary: false,
      })),
    });

    expect(result.success).toBe(false);
  });
});

describe("addressInputSchema", () => {
  const address = (overrides: Record<string, unknown> = {}) => ({
    type: "Home",
    street: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    is_primary: false,
    ...overrides,
  });

  it("nulls out the blanks the way the contact fields do", () => {
    const parsed = addressInputSchema.parse(address({ city: "  London  " }));

    expect(parsed.city).toBe("London");
    expect(parsed.street).toBeNull();
    expect(parsed.country).toBeNull();
  });

  it("enforces the postal code length the API enforces", () => {
    const result = addressInputSchema.safeParse(
      address({ postal_code: "9".repeat(21) }),
    );

    expect(zodFieldErrors<keyof AddressInput>(result.error!).postal_code).toBe(
      "Postal code must be 20 characters or fewer",
    );
  });

  it("rejects a type the API's enum does not have", () => {
    expect(addressInputSchema.safeParse(address({ type: "Vacation" })).success).toBe(
      false,
    );
  });
});

describe("formDataToAddresses", () => {
  /** Build the parallel `address_*` lists the repeater submits. */
  function formWith(rows: Record<string, string>[], primaryIndex?: number) {
    const formData = new FormData();
    for (const row of rows) {
      formData.append("address_type", row.type ?? "Home");
      for (const part of ["street", "city", "state", "postal_code", "country"]) {
        formData.append(`address_${part}`, row[part] ?? "");
      }
    }
    if (primaryIndex !== undefined) {
      formData.append("address_is_primary", String(primaryIndex));
    }
    return formData;
  }

  it("zips the parallel lists back into rows, in order", () => {
    const addresses = formDataToAddresses(
      formWith([
        { type: "Work", city: "San Francisco", state: "CA" },
        { type: "Home", city: "London", country: "UK" },
      ]),
    );

    expect(addresses).toHaveLength(2);
    expect(addresses[0]).toMatchObject({ type: "Work", city: "San Francisco" });
    expect(addresses[1]).toMatchObject({ type: "Home", city: "London" });
  });

  it("drops rows the user added but left blank", () => {
    const addresses = formDataToAddresses(
      formWith([{ type: "Home", city: "London" }, { type: "Work" }]),
    );

    expect(addresses).toHaveLength(1);
    expect(addresses[0].city).toBe("London");
  });

  it("marks only the row whose index was submitted as primary", () => {
    const addresses = formDataToAddresses(
      formWith([{ city: "London" }, { city: "Paris" }], 1),
    );

    expect(addresses.map((a) => a.is_primary)).toEqual([false, true]);
  });

  it("falls back to Home for a type it does not recognise", () => {
    const addresses = formDataToAddresses(
      formWith([{ type: "Vacation", city: "Nice" }]),
    );

    expect(addresses[0].type).toBe("Home");
  });

  it("returns an empty list when no rows were submitted", () => {
    expect(formDataToAddresses(new FormData())).toEqual([]);
  });
});

describe("formDataToValues", () => {
  it("pulls every known field out, defaulting to an empty string", () => {
    const formData = new FormData();
    formData.set("first_name", "Grace");
    formData.set("email", "grace@example.com");
    formData.set("ignored", "nope");

    const extracted = formDataToValues(formData);

    expect(extracted.first_name).toBe("Grace");
    expect(extracted.last_name).toBe("");
    expect(Object.keys(extracted).sort()).toEqual(
      CONTACT_FIELDS.map((field) => field.name).sort(),
    );
  });
});
