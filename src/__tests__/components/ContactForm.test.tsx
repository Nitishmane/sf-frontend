import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "@/components/contacts/ContactForm";
import { makeContact } from "../mocks/handlers";
import type { FormState } from "@/lib/contacts/types";

function renderForm(action: jest.Mock, contact?: ReturnType<typeof makeContact>) {
  return render(
    <ContactForm
      action={action as never}
      contact={contact}
      submitLabel="Create contact"
      cancelHref="/contacts"
    />,
  );
}

describe("ContactForm", () => {
  it("renders every editable field", () => {
    renderForm(jest.fn());

    expect(screen.getByLabelText(/first name/i)).toBeRequired();
    expect(screen.getByLabelText(/last name/i)).toBeRequired();
    expect(screen.getByLabelText(/^email/i)).toBeRequired();
    expect(screen.getByLabelText(/phone/i)).not.toBeRequired();
    expect(screen.getByLabelText(/notes/i).tagName).toBe("TEXTAREA");
  });

  it("prefills from an existing contact", () => {
    renderForm(jest.fn(), makeContact());

    expect(screen.getByLabelText(/first name/i)).toHaveValue("Ada");
    expect(screen.getByLabelText(/^email/i)).toHaveValue("ada@example.com");
    // Nulls become empty inputs rather than the string "null".
    expect(screen.getByLabelText(/notes/i)).toHaveValue("");
  });

  it("prefills the repeater from the contact's existing addresses", () => {
    renderForm(
      jest.fn(),
      makeContact({
        addresses: [
          {
            id: 7,
            type: "Work",
            street: "1 Market St",
            city: "San Francisco",
            state: null,
            postal_code: null,
            country: null,
            is_primary: true,
          },
        ],
      }),
    );

    expect(screen.getByLabelText(/street address/i)).toHaveValue("1 Market St");
    expect(screen.getByLabelText(/^type/i)).toHaveValue("Work");
    expect(screen.getByLabelText(/primary address/i)).toBeChecked();
    // Null parts are empty inputs, same as the flat fields above.
    expect(screen.getByLabelText(/postal code/i)).toHaveValue("");
  });

  it("offers an empty state instead of a blank row when there are no addresses", () => {
    renderForm(jest.fn(), makeContact());

    expect(screen.getByText(/no addresses yet/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/street address/i)).not.toBeInTheDocument();
  });

  it("submits the entered values to the action", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(action);

    await userEvent.type(screen.getByLabelText(/first name/i), "Grace");
    await userEvent.type(screen.getByLabelText(/last name/i), "Hopper");
    await userEvent.type(screen.getByLabelText(/^email/i), "grace@example.com");
    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));

    await waitFor(() => expect(action).toHaveBeenCalled());

    const formData = action.mock.calls[0][1];
    expect(formData.get("first_name")).toBe("Grace");
    expect(formData.get("email")).toBe("grace@example.com");
  });

  // The whole one-to-many story rides on this: rows added in the browser have
  // to arrive as parallel `address_*` lists that line up by index.
  it("submits each added address as a parallel entry", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(action);

    await userEvent.click(screen.getByRole("button", { name: /add an address/i }));
    await userEvent.type(screen.getByLabelText(/city/i), "London");
    await userEvent.click(
      screen.getByRole("button", { name: /add another address/i }),
    );

    const cities = screen.getAllByLabelText(/city/i);
    await userEvent.type(cities[1], "Paris");
    await userEvent.selectOptions(screen.getAllByLabelText(/^type/i)[1], "Work");
    await userEvent.click(screen.getAllByLabelText(/primary address/i)[1]);

    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));
    await waitFor(() => expect(action).toHaveBeenCalled());

    const formData = action.mock.calls[0][1];
    expect(formData.getAll("address_city")).toEqual(["London", "Paris"]);
    expect(formData.getAll("address_type")).toEqual(["Home", "Work"]);
    // Only the chosen row submits, and it carries its index rather than "on".
    expect(formData.getAll("address_is_primary")).toEqual(["1"]);
  });

  it("shows the summary and the per-field errors the action returns", async () => {
    const action = jest.fn(
      async (): Promise<FormState> => ({
        status: "error",
        message: "That email address is already taken.",
        fieldErrors: { email: "This email is already in use." },
        values: { first_name: "Grace" },
      }),
    );
    renderForm(action);

    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.map((node) => node.textContent)).toEqual(
      expect.arrayContaining([
        "That email address is already taken.",
        "This email is already in use.",
      ]),
    );
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  // `formDataToValues()` only reads fields registered in CONTACT_FIELD_GROUPS,
  // so a photo that is not a real field spec is absent from the PUT body and
  // the API clears it. These two guard that path.
  it("renders an existing photo into the hidden photo input", () => {
    const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const { container } = renderForm(jest.fn(), makeContact({ photo }));

    expect(
      container.querySelector('input[type="hidden"][name="photo"]'),
    ).toHaveValue(photo);
  });

  it("submits an untouched photo back unchanged", async () => {
    const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(action, makeContact({ photo }));

    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));
    await waitFor(() => expect(action).toHaveBeenCalled());

    expect(action.mock.calls[0][1].get("photo")).toBe(photo);
  });

  it("submits an empty photo for a contact without one", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(action, makeContact());

    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));
    await waitFor(() => expect(action).toHaveBeenCalled());

    expect(action.mock.calls[0][1].get("photo")).toBe("");
  });

  it("links back out without submitting", () => {
    renderForm(jest.fn());
    expect(screen.getByRole("link", { name: /cancel/i })).toHaveAttribute(
      "href",
      "/contacts",
    );
  });
});
