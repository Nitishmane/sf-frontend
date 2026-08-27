"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

/**
 * Square crop editor backed by a hidden input, so the photo travels with the
 * ordinary form POST like every other field.
 *
 * The canvas re-encodes whatever the user picked down to a 256px JPEG (~25 KB).
 * That is what keeps the payload under the 1 MB server-action body limit
 * without touching `next.config.ts`, and it means a 4 MB phone photo and a
 * 40 KB icon cost the API exactly the same.
 */

const OUTPUT_SIZE = 256;
const JPEG_QUALITY = 0.85;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export default function PhotoField({
  name,
  label,
  defaultValue = "",
  error,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  error?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [localError, setLocalError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragFrom = useRef<{ x: number; y: number } | null>(null);

  // Decoding a file is async, so a slow earlier pick can land after a faster
  // later one — or after Remove, resurrecting a photo the user just deleted.
  // Every load claims a generation; a callback that no longer owns the current
  // one has been superseded and must not touch state.
  const generation = useRef(0);

  const inputId = `field-${name}`;
  const errorId = `${inputId}-error`;
  const shownError = localError ?? error;

  // Redraw and re-export whenever the crop changes. Not debounced: at 256px the
  // encode is sub-millisecond, and keeping the hidden input in lockstep with
  // the canvas means there is no "unsaved crop" state to get wrong.
  useEffect(() => {
    if (!image) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return; // jsdom has no 2D context

    const cover = Math.max(
      OUTPUT_SIZE / image.naturalWidth,
      OUTPUT_SIZE / image.naturalHeight,
    );
    const scale = cover * zoom;
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;

    // Never let the drag expose an empty edge.
    const limitX = Math.max(0, (width - OUTPUT_SIZE) / 2);
    const limitY = Math.max(0, (height - OUTPUT_SIZE) / 2);
    const x = clamp(offset.x, -limitX, limitX);
    const y = clamp(offset.y, -limitY, limitY);

    // JPEG has no alpha channel; without this a transparent PNG turns black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.drawImage(
      image,
      (OUTPUT_SIZE - width) / 2 + x,
      (OUTPUT_SIZE - height) / 2 + y,
      width,
      height,
    );

    setValue(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
  }, [image, zoom, offset]);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Guard before doing any work: a wrong file should cost nothing.
    if (!ACCEPTED.includes(file.type)) {
      setLocalError("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setLocalError("That image is over 5 MB. Choose a smaller one.");
      return;
    }

    setLocalError(null);

    const mine = ++generation.current;
    const current = () => generation.current === mine;

    // Drop the old photo the moment a new one is picked, so the preview and
    // the hidden input agree at every instant. Submitting mid-decode then
    // saves nothing — matching the empty preview on screen — rather than
    // silently saving the *previous* photo while showing neither.
    const previous = value;
    setImage(null);
    setValue("");
    setBusy(true);

    const fail = (message: string) => {
      if (!current()) return;
      setLocalError(message);
      setValue(previous); // put back what we cleared
      setBusy(false);
    };

    const reader = new FileReader();
    reader.onerror = () => fail("That file could not be read.");
    reader.onload = () => {
      if (!current()) return;
      const loaded = new window.Image();
      loaded.onload = () => {
        if (!current()) return;
        setImage(loaded);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setBusy(false);
      };
      loaded.onerror = () => fail("That file is not an image we can read.");
      loaded.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function handleRemove() {
    // Claim a fresh generation so any decode still in flight is orphaned and
    // cannot restore the photo after this.
    generation.current += 1;
    setImage(null);
    setValue("");
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setLocalError(null);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragFrom.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragFrom.current || !canvasRef.current) return;
    // The canvas is displayed smaller than it is; convert CSS px to canvas px.
    const rect = canvasRef.current.getBoundingClientRect();
    const ratio = rect.width ? OUTPUT_SIZE / rect.width : 1;
    const dx = (event.clientX - dragFrom.current.x) * ratio;
    const dy = (event.clientY - dragFrom.current.y) * ratio;
    dragFrom.current = { x: event.clientX, y: event.clientY };
    setOffset((previous) => ({ x: previous.x + dx, y: previous.y + dy }));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    dragFrom.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-2sm font-medium text-foreground">
        {label}
        <span className="ml-1.5 text-2xs font-normal text-muted-foreground">
          optional
        </span>
      </span>

      <input type="hidden" name={name} value={value} readOnly />

      <div className="flex items-start gap-4">
        <div className="shrink-0">
          {image ? (
            <canvas
              ref={canvasRef}
              width={OUTPUT_SIZE}
              height={OUTPUT_SIZE}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="Drag to reposition the photo"
              className="h-24 w-24 cursor-grab touch-none rounded-full border border-border object-cover active:cursor-grabbing"
            />
          ) : value ? (
            /* eslint-disable-next-line @next/next/no-img-element --
               This is a base64 data URL. next/image exists to run a remote URL
               through a loader and optimizer; there is no remote URL here, and
               the bytes are already 256px and optimized by the canvas above. */
            <img
              src={value}
              alt="Current contact photo"
              className="h-24 w-24 rounded-full border border-border object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className={`flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground ${
                busy ? "animate-pulse" : ""
              }`}
            >
              <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <label
              htmlFor={inputId}
              className="mb-1 block text-2sm text-muted-foreground"
            >
              {busy ? "Preparing photo…" : "PNG, JPEG, or WebP, up to 5 MB."}
            </label>
            <input
              ref={fileRef}
              id={inputId}
              type="file"
              accept={ACCEPTED.join(",")}
              onChange={handleFile}
              aria-invalid={shownError ? true : undefined}
              aria-describedby={shownError ? errorId : undefined}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-input file:px-3 file:py-1.5 file:text-sm file:text-foreground hover:file:bg-input/80"
            />
          </div>

          {image ? (
            <div>
              <label
                htmlFor={`${inputId}-zoom`}
                className="mb-1 block text-2sm text-muted-foreground"
              >
                Zoom
              </label>
              <input
                id={`${inputId}-zoom`}
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-primary"
              />
            </div>
          ) : null}

          {value || image ? (
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 text-2sm text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remove photo
            </button>
          ) : null}
        </div>
      </div>

      {shownError ? (
        <p id={errorId} role="alert" className="mt-1.5 text-2sm text-destructive">
          {shownError}
        </p>
      ) : null}
    </div>
  );
}
