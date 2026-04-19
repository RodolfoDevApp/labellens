"use client";

import { useEffect, useRef, useState } from "react";

type BarcodeDetectorResult = {
  rawValue: string;
};

type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

type CameraScannerProps = {
  onDetected: (barcode: string) => void;
};

type CameraStatus = "idle" | "starting" | "scanning" | "unsupported" | "denied" | "error";

export function CameraScanner({ onDetected }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");

  function stopCamera() {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  useEffect(() => stopCamera, []);

  async function startCamera() {
    if (!window.BarcodeDetector) {
      setStatus("unsupported");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    setStatus("starting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });
      const detector = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e"],
      });
      const video = videoRef.current;

      if (!video) {
        stopCamera();
        setStatus("error");
        return;
      }

      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      setStatus("scanning");

      const tick = async () => {
        if (!videoRef.current || !streamRef.current) {
          return;
        }

        try {
          const results = await detector.detect(videoRef.current);
          const barcode = results.at(0)?.rawValue?.replace(/\D/g, "");

          if (barcode) {
            stopCamera();
            setStatus("idle");
            onDetected(barcode);
            return;
          }
        } catch {
          // Keep camera open. Detection can fail while the frame is still warming up.
        }

        frameRef.current = requestAnimationFrame(tick);
      };

      frameRef.current = requestAnimationFrame(tick);
    } catch (error) {
      stopCamera();
      setStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "error");
    }
  }

  const statusMessage = {
    idle: "Start camera scanning or enter the barcode manually below.",
    starting: "Opening camera...",
    scanning: "Point the barcode inside the frame.",
    unsupported: "Camera barcode detection is not supported here. Manual entry still works.",
    denied: "Camera permission was denied. Manual barcode entry still works.",
    error: "Camera could not start. Manual barcode entry still works.",
  }[status];

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#f0d7ad] bg-[#fff4df] shadow-[0_18px_45px_rgba(88,61,24,0.10)]">
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_0.8fr] md:items-center md:p-5">
        <div className="relative min-h-[220px] overflow-hidden rounded-[1.6rem] border border-[#172319] bg-[#1b271d] shadow-inner">
          <video
            ref={videoRef}
            className="h-full min-h-[220px] w-full object-cover opacity-90"
            playsInline
            muted
          />

          <div className="pointer-events-none absolute inset-0 grid place-items-center p-8">
            <div className="h-28 w-full max-w-sm rounded-3xl border-4 border-[#ffe7ad] shadow-[0_0_0_999px_rgba(0,0,0,0.25)]" />
          </div>
        </div>

        <div>
          <p className="inline-flex rounded-full bg-[#dff6c8] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#0b7a53]">
            Barcode scanner
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-[#18261e]">
            Scan packaged foods.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#5d665d]">
            {statusMessage}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {status === "scanning" || status === "starting" ? (
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setStatus("idle");
                }}
                className="ll-interactive min-h-12 rounded-2xl bg-[#20281f] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(32,40,31,0.18)] hover:bg-[#111811] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
              >
                Stop camera
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startCamera()}
                className="ll-interactive min-h-12 rounded-2xl bg-[#0b7a53] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(11,122,83,0.22)] hover:bg-[#075f41] focus:outline-none focus:ring-2 focus:ring-[#b8e07a]"
              >
                Start camera
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
