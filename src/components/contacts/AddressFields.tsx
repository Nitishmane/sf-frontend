"use client";

import { useId, useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { MAX_ADDRESSES } from "@/lib/contacts/schema";
import { ADDRESS_TYPES, type AddressInput } from "@/lib/contacts/types";

/**
 * Repeating address rows.
 *
 * Every row emits the same input names — `address_type`, `address_street`, and
 * so on — so the submitted form carries parallel lists that
 * `formDataToAddresses` zips back together by index. That keeps addresses on
 * the ordinary form POST alongside every other field, with no JSON blob and no
 * separate request.
 */

const CONTROL =
  "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-primary focus:bg-input";

const EMPTY: AddressInput = {
  type: "Home",
  street: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
  is_primary: false,
};

/** Rows need a key that survives reordering, and addresses have no stable id
 *  until the server assigns one — so carry a client-side key alongside each. */
type Row = { key: number; value: AddressInput };

let nextKey = 0;
const toRow = (value: AddressInput): Row => ({ key: nextKey++, value });

export default function AddressFields({
  defaultValue = [],
}: {
  defaultValue?: AddressInput[];
}) {
  const [rows, setRows] = useState<Row[]>(() => defaultValue.map(toRow));
  const groupId = useId();

  function addRow() {
    setRows((previous) =>
      previous.length >= MAX_ADDRESSES ? previous : [...previous, toRow(EMPTY)],
    );
  }

  function removeRow(key: number) {
    setRows((previous) => previous.filter((row) => row.key !== key));
  }

  function patchRow(key: number, patch: Partial<AddressInput>) {
    setRows((previous) =>
      previous.map((row) =>
        row.key === key ? { ...row, value: { ...row.value, ...patch } } : row,
      ),
    );
  }

  /** Only one address can be primary, so selecting one clears the rest. */
  function setPrimary(key: number) {
    setRows((previous) =>
      previous.map((row) => ({
        ...row,
        value: { ...row.value, is_primary: row.key === key },
      })),
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center">
        <MapPin
          className="mx-auto h-5 w-5 text-muted-foreground"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <p className="mt-2 text-[13px] text-muted-foreground">
          No addresses yet.
        </p>
        <button
          type="button"
          onClick={addRow}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-input"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add an address
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <fieldset
          key={row.key}
          className="rounded-md border border-border p-4"
        >
          <legend className="px-1.5 text-[13px] font-medium text-muted-foreground">
            Address {index + 1}
          </legend>

          {/* Index, not a boolean: a checkbox only submits when checked, so the
              value identifies which row it came from once they are zipped. */}
          {row.value.is_primary ? (
            <input type="hidden" name="address_is_primary" value={index} />
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${groupId}-type-${row.key}`}
                className="mb-1.5 block text-[13px] font-medium text-foreground"
              >
                Type
              </label>
              <select
                id={`${groupId}-type-${row.key}`}
                name="address_type"
                value={row.value.type}
                onChange={(event) =>
                  patchRow(row.key, {
                    type: event.target.value as AddressInput["type"],
                  })
                }
                className={CONTROL}
              >
                {ADDRESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-[13px] text-foreground">
                <input
                  type="radio"
                  name={`${groupId}-primary`}
                  checked={row.value.is_primary}
                  onChange={() => setPrimary(row.key)}
                  className="accent-primary"
                />
                Primary address
              </label>
            </div>

            <TextInput
              id={`${groupId}-street-${row.key}`}
              name="address_street"
              label="Street address"
              value={row.value.street}
              maxLength={300}
              placeholder="1 Market St, Suite 400"
              autoComplete="street-address"
              wide
              onChange={(street) => patchRow(row.key, { street })}
            />
            <TextInput
              id={`${groupId}-city-${row.key}`}
              name="address_city"
              label="City"
              value={row.value.city}
              maxLength={120}
              placeholder="San Francisco"
              autoComplete="address-level2"
              onChange={(city) => patchRow(row.key, { city })}
            />
            <TextInput
              id={`${groupId}-state-${row.key}`}
              name="address_state"
              label="State / region"
              value={row.value.state}
              maxLength={120}
              placeholder="CA"
              autoComplete="address-level1"
              onChange={(state) => patchRow(row.key, { state })}
            />
            <TextInput
              id={`${groupId}-postal-${row.key}`}
              name="address_postal_code"
              label="Postal code"
              value={row.value.postal_code}
              maxLength={20}
              placeholder="94105"
              autoComplete="postal-code"
              onChange={(postal_code) => patchRow(row.key, { postal_code })}
            />
            <TextInput
              id={`${groupId}-country-${row.key}`}
              name="address_country"
              label="Country"
              value={row.value.country}
              maxLength={120}
              placeholder="USA"
              autoComplete="country-name"
              onChange={(country) => patchRow(row.key, { country })}
            />
          </div>

          <button
            type="button"
            onClick={() => removeRow(row.key)}
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Remove this address
          </button>
        </fieldset>
      ))}

      {rows.length < MAX_ADDRESSES ? (
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-input"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add another address
        </button>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          That is the maximum of {MAX_ADDRESSES} addresses.
        </p>
      )}
    </div>
  );
}

function TextInput({
  id,
  name,
  label,
  value,
  maxLength,
  placeholder,
  autoComplete,
  wide,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  value: string | null;
  maxLength: number;
  placeholder: string;
  autoComplete: string;
  wide?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[13px] font-medium text-foreground"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        value={value ?? ""}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className={CONTROL}
      />
    </div>
  );
}
