import {
  avatarHue,
  formatAddress,
  formatTimestamp,
  groupAddresses,
  initials,
  jobLine,
  mapsUrl,
} from "@/lib/contacts/format";
import { makeContact } from "../../mocks/handlers";
import type { Address } from "@/lib/contacts/types";

function makeAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: 1,
    type: "Home",
    street: null,
    city: "San Francisco",
    state: "CA",
    postal_code: null,
    country: "USA",
    is_primary: false,
    ...overrides,
  };
}

describe("initials", () => {
  it("takes the first letter of each name", () => {
    expect(initials({ first_name: "ada", last_name: "lovelace" })).toBe("AL");
  });
});

describe("avatarHue", () => {
  it("is stable for the same seed and within the hue range", () => {
    expect(avatarHue("ada@example.com")).toBe(avatarHue("ada@example.com"));
    expect(avatarHue("ada@example.com")).toBeGreaterThanOrEqual(0);
    expect(avatarHue("ada@example.com")).toBeLessThan(360);
  });

  it("separates different seeds", () => {
    expect(avatarHue("ada@example.com")).not.toBe(avatarHue("grace@example.com"));
  });
});

describe("formatTimestamp", () => {
  it("renders UTC regardless of the machine's zone", () => {
    expect(formatTimestamp("2026-08-19T17:04:53.743932Z")).toBe(
      "19 Aug 2026, 17:04 UTC",
    );
  });

  it("degrades to a dash on garbage input", () => {
    expect(formatTimestamp("not a date")).toBe("—");
  });
});

describe("jobLine", () => {
  it("joins the title and the company", () => {
    expect(jobLine(makeContact())).toBe("Mathematician at Analytical Engines");
  });

  it("falls back to whichever one is set", () => {
    expect(jobLine(makeContact({ company: null }))).toBe("Mathematician");
    expect(jobLine(makeContact({ job_title: null }))).toBe("Analytical Engines");
    expect(jobLine(makeContact({ job_title: null, company: null }))).toBeNull();
  });
});

describe("formatAddress", () => {
  it("skips the parts that are not filled in", () => {
    expect(formatAddress(makeAddress())).toBe("San Francisco, CA, USA");
  });

  it("pairs the state with the postal code", () => {
    expect(
      formatAddress(makeAddress({ street: "1 Market St", postal_code: "94105" })),
    ).toBe("1 Market St, San Francisco, CA 94105, USA");
  });

  it("returns null when every part is empty", () => {
    expect(
      formatAddress(
        makeAddress({ city: null, state: null, country: null, postal_code: null }),
      ),
    ).toBeNull();
  });
});

describe("groupAddresses", () => {
  it("orders the buckets Home, Work, Other regardless of input order", () => {
    const grouped = groupAddresses([
      makeAddress({ id: 1, type: "Other" }),
      makeAddress({ id: 2, type: "Work" }),
      makeAddress({ id: 3, type: "Home" }),
    ]);

    expect(grouped.map((group) => group.type)).toEqual(["Home", "Work", "Other"]);
  });

  it("keeps insertion order inside a bucket", () => {
    const grouped = groupAddresses([
      makeAddress({ id: 7, type: "Work", city: "London" }),
      makeAddress({ id: 4, type: "Work", city: "Paris" }),
    ]);

    expect(grouped[0].addresses.map((a) => a.city)).toEqual(["London", "Paris"]);
  });

  it("drops empty buckets rather than rendering headings for them", () => {
    const grouped = groupAddresses([makeAddress({ type: "Home" })]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].type).toBe("Home");
  });

  it("returns nothing for a contact with no addresses", () => {
    expect(groupAddresses([])).toEqual([]);
  });
});

describe("mapsUrl", () => {
  it("encodes the formatted address into a search link", () => {
    expect(mapsUrl(makeAddress({ street: "1 Market St" }))).toBe(
      "https://www.google.com/maps/search/?api=1&query=1%20Market%20St%2C%20San%20Francisco%2C%20CA%2C%20USA",
    );
  });

  it("returns null when there is nothing to search for", () => {
    expect(
      mapsUrl(
        makeAddress({ city: null, state: null, country: null, postal_code: null }),
      ),
    ).toBeNull();
  });
});

describe("contact fixtures", () => {
  it("defaults to no addresses", () => {
    expect(makeContact().addresses).toEqual([]);
  });
});
