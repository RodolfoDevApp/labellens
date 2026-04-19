"use client";

import { useState } from "react";
import { lookupProductBarcode, type ProductItemDto } from "@/shared/api/foods-api";
import { MenuDrawer } from "@/features/food-search/components/MenuDrawer";
import { MenuFloatingButton } from "@/features/food-search/components/MenuFloatingButton";
import { MenuSnackbar } from "@/features/food-search/components/MenuSnackbar";
import { useFoodSearch } from "@/features/food-search/hooks/useFoodSearch";
import { CameraScanner } from "./CameraScanner";
import { ProductResultCard } from "./ProductResultCard";

type LookupStatus = "idle" | "loading" | "success" | "not_found" | "error";

function BarcodeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
      <path d="M4 5v14M7 5v14M11 5v14M14 5v14M18 5v14M20 5v14" />
    </svg>
  );
}

function normalizeBarcode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}

export function ScannerPanel() {
  const [barcode, setBarcode] = useState("3017624010701");
  const [product, setProduct] = useState<ProductItemDto | null>(null);
  const [status, setStatus] = useState<LookupStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    menuItems,
    menuTotals,
    isMenuOpen,
    setIsMenuOpen,
    lastAddedLabel,
    clearLastAddedLabel,
    addToMenu,
    increaseMenuItem,
    decreaseMenuItem,
    updateMenuItemGrams,
    removeFromMenu,
    clearMenu,
  } = useFoodSearch();

  async function runLookup(nextBarcode = barcode) {
    const normalizedBarcode = normalizeBarcode(nextBarcode);

    if (normalizedBarcode.length < 8) {
      setStatus("error");
      setErrorMessage("Enter at least 8 barcode digits.");
      setProduct(null);
      return;
    }

    setBarcode(normalizedBarcode);
    setStatus("loading");
    setProduct(null);
    setErrorMessage(null);

    try {
      const result = await lookupProductBarcode(normalizedBarcode);
      setProduct(result.product);
      setStatus("success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Product lookup failed.";
      setProduct(null);
      setErrorMessage(message);
      setStatus(message.toLowerCase().includes("does not have") ? "not_found" : "error");
    }
  }

  return (
    <section className="space-y-5 pb-24">
      <CameraScanner
        onDetected={(detectedBarcode) => {
          setBarcode(detectedBarcode);
          void runLookup(detectedBarcode);
        }}
      />

      <section className="rounded-[2rem] border border-[#f0d7ad] bg-[#fff8ea] p-4 shadow-[0_18px_45px_rgba(88,61,24,0.10)] sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#0b7a53]">
              Manual fallback
            </p>
            <h2 className="mt-1 text-2xl font-black leading-tight text-[#18261e]">
              Enter barcode
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#5d665d]">
              Camera permissions should never block the flow. Type the code when scanning fails.
            </p>
          </div>

          <form
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:min-w-[560px]"
            onSubmit={(event) => {
              event.preventDefault();
              void runLookup();
            }}
          >
            <label className="grid gap-1 text-xs font-black text-[#465246]">
              Barcode
              <input
                value={barcode}
                onChange={(event) => setBarcode(normalizeBarcode(event.target.value))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="3017624010701"
                className="min-h-14 rounded-2xl border border-[#f0d7ad] bg-[#fff4df] px-4 text-lg font-black text-[#18261e] outline-none hover:border-[#ddb668] focus:border-[#0b7a53] focus:ring-2 focus:ring-[#c9f0a0]"
              />
            </label>

            <button
              type="submit"
              disabled={status === "loading"}
              className="ll-interactive flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#0b7a53] px-6 text-sm font-black text-white shadow-[0_12px_28px_rgba(11,122,83,0.22)] hover:bg-[#075f41] focus:outline-none focus:ring-2 focus:ring-[#b8e07a] disabled:cursor-wait disabled:opacity-60 sm:self-end"
            >
              <BarcodeIcon />
              {status === "loading" ? "Looking up..." : "Lookup"}
            </button>
          </form>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {["3017624010701", "5449000000996"].map((sampleBarcode) => (
            <button
              key={sampleBarcode}
              type="button"
              onClick={() => {
                setBarcode(sampleBarcode);
                void runLookup(sampleBarcode);
              }}
              className="ll-interactive rounded-full border border-[#d8e7bd] bg-[#edfbdf] px-4 py-2 text-xs font-black text-[#0b6b47] hover:bg-[#dff6c8] focus:outline-none focus:ring-2 focus:ring-[#b8e07a]"
            >
              {sampleBarcode}
            </button>
          ))}
        </div>
      </section>

      {status === "idle" ? (
        <div className="rounded-[2rem] border border-[#f0d7ad] bg-[#fff4df] p-5 text-sm font-bold text-[#5d665d] shadow-sm">
          Scan a packaged product or try one of the fixture barcodes.
        </div>
      ) : null}

      {status === "loading" ? (
        <div className="rounded-[2rem] border border-[#f0d7ad] bg-[#fff4df] p-5 text-sm font-bold text-[#5d665d] shadow-sm">
          Looking up Open Food Facts...
        </div>
      ) : null}

      {status === "not_found" ? (
        <div className="rounded-[2rem] border border-[#f5d27a] bg-[#fff0b8] p-5 text-sm font-bold text-[#664b00] shadow-sm">
          Product not found. Try another barcode or search generic foods instead.
        </div>
      ) : null}

      {status === "error" ? (
        <div className="rounded-[2rem] border border-[#f0d2c7] bg-[#fff0ea] p-5 text-sm font-bold text-[#9b392f] shadow-sm">
          Could not lookup product.
          {errorMessage ? <p className="mt-2 text-xs">{errorMessage}</p> : null}
        </div>
      ) : null}

      {product ? (
        <ProductResultCard product={product} onAddToMenu={addToMenu} />
      ) : null}

      <MenuSnackbar
        message={lastAddedLabel}
        onViewMenu={() => {
          clearLastAddedLabel();
          setIsMenuOpen(true);
        }}
        onDismiss={clearLastAddedLabel}
      />

      <MenuFloatingButton
        itemCount={menuItems.length}
        energyKcal={menuTotals.energyKcal}
        onOpen={() => setIsMenuOpen(true)}
      />

      <MenuDrawer
        isOpen={isMenuOpen}
        items={menuItems}
        totals={menuTotals}
        onClose={() => setIsMenuOpen(false)}
        onIncrease={increaseMenuItem}
        onDecrease={decreaseMenuItem}
        onUpdateGrams={updateMenuItemGrams}
        onRemove={removeFromMenu}
        onClear={clearMenu}
      />
    </section>
  );
}
