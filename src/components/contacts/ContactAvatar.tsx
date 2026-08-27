import type { CSSProperties } from "react";
import { avatarHue, initials } from "@/lib/contacts/format";
import type { Contact } from "@/lib/contacts/types";

const SIZES = {
  sm: "h-8 w-8 text-2xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

/** The contact's photo when they have one; otherwise an initials bubble
 *  tinted with a hue derived from their email. */
export default function ContactAvatar({
  contact,
  size = "md",
}: {
  contact: Pick<Contact, "first_name" | "last_name" | "email"> & {
    photo?: string | null;
  };
  size?: keyof typeof SIZES;
}) {
  if (contact.photo) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element --
         The src is a base64 data URL, so there is nothing for next/image's
         loader to fetch or its optimizer to resize. The bytes were already
         downscaled to 256px by PhotoField before they were stored. */
      <img
        src={contact.photo}
        alt=""
        aria-hidden="true"
        className={`inline-block shrink-0 select-none rounded-full object-cover ${SIZES[size]}`}
      />
    );
  }

  const style = {
    "--avatar-hue": avatarHue(contact.email),
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      style={style}
      className={`contact-avatar inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-semibold ${SIZES[size]}`}
    >
      {initials(contact)}
    </span>
  );
}
