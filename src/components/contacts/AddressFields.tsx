"use client";

import { useId, useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { ADDRESS_LIST_ERROR, MAX_ADDRESSES } from "@/lib/contacts/schema";
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

/**
 * One past the largest key in use.
 *
 * Deriving this from the rows rather than keeping a counter is what makes the
 * component safe to server render: there is no mutable state whose lifetime
 * differs between the server and a freshly loaded browser, so the ids come out
 * identical on both sides and hydration matches.
 */
const nextKeyFor = (rows: readonly Row[]): number =>
  rows.reduce((max, row) => Math.max(max, row.key), -1) + 1;

const toRows = (values: readonly AddressInput[]): Row[] =>
  values.map((value, index) => ({ key: index, value }));

export default function AddressFields({
  defaultValue = [],
  errors,
}: {
  defaultValue?: AddressInput[];
  /** Keyed `"<row index>.<field>"`, plus `"list"` for whole-list failures. */
  errors?: Record<string, string>;
}) {
  const [rows, setRows] = useState<Row[]>(() => toRows(defaultValue));
  const groupId = useId();

  // Resync when the echoed list changes identity, which happens exactly once
  // per rejected submit. This is not cosmetic: `errors` is keyed by position in
  // the *submitted* list, and submitting drops blank rows. A user with an empty
  // row above a bad one would otherwise see the message land on the wrong row.
  // Adopting the echo puts the rendered rows and the error keys back in step.
  const [echoed, setEchoed] = useState(defaultValue);
  if (defaultValue !== echoed) {
    setEchoed(defaultValue);
    setRows(toRows(defaultValue));
  }

  const listError = errors?.[ADDRESS_LIST_ERROR];

  function addRow() {
    setRows((previous) =>
      previous.length >= MAX_ADDRESSES
        ? previous
        : [...previous, { key: nextKeyFor(previous), value: EMPTY }],
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
        <ListError message={listError} />
        <MapPin
          className="mx-auto h-5 w-5 text-muted-foreground"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <p className="mt-2 text-2sm text-muted-foreground">
          No addresses yet.
        </p>
        <button
          type="button"
          onClick={addRow}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-2sm font-medium text-foreground hover:bg-input"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add an address
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ListError message={listError} />

      {rows.map((row, index) => (
        <fieldset
          key={row.key}
          className="rounded-md border border-border p-4"
        >
          <legend className="px-1.5 text-2sm font-medium text-muted-foreground">
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
                className="mb-1.5 block text-2sm font-medium text-foreground"
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
              <label className="inline-flex items-center gap-2 text-2sm text-foreground">
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
              error={errors?.[`${index}.street`]}
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
              error={errors?.[`${index}.city`]}
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
              error={errors?.[`${index}.state`]}
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
              error={errors?.[`${index}.postal_code`]}
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
              error={errors?.[`${index}.country`]}
            />
          </div>

          <button
            type="button"
            onClick={() => removeRow(row.key)}
            className="mt-3 inline-flex items-center gap-1.5 text-2sm text-muted-foreground hover:text-destructive"
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
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-2sm font-medium text-foreground hover:bg-input"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add another address
        </button>
      ) : (
        <p className="text-2sm text-muted-foreground">
          That is the maximum of {MAX_ADDRESSES} addresses.
        </p>
      )}
    </div>
  );
}

/** A failure of the list itself rather than of any one row. */
function ListError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="mb-3 text-2sm font-medium text-destructive"
    >
      {message}
    </p>
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
  error,
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
  error?: string;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;

  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-2sm font-medium text-foreground"
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
        aria-invalid={error ? true : undefined}
        // Points a screen reader at the message rather than leaving it to infer
        // one from proximity, which is what `aria-invalid` alone would do.
        aria-describedby={error ? errorId : undefined}
        className={`${CONTROL} ${error ? "border-destructive" : ""}`}
      />
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-2sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
