"use client";

import { useState, useTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatINR, paiseToRupees } from "@/lib/format";
import { FoodImg } from "@/components/food/FoodImg";
import { Badge, inputClass } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/Button";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  saveFoodItem,
  deleteFoodItem,
  setAvailability,
  saveCategory,
  deleteCategory,
  type FoodFormState,
} from "@/app/actions/admin";

export type AdminItem = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  available: boolean;
  isVeg: boolean;
  prepMinutes: number;
  imageUrl: string | null;
  categoryId: string;
  isSpecial: boolean;
};
export type AdminCategory = {
  id: string;
  name: string;
  emoji: string;
  sortOrder: number;
  items: AdminItem[];
};

function AvailabilitySwitch({ item }: { item: AdminItem }) {
  const [on, setOn] = useState(item.available);
  const [, start] = useTransition();
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => {
        const next = !on;
        setOn(next);
        start(async () => {
          await setAvailability(item.id, next);
        });
      }}
      className={`relative w-10 h-6 rounded-full transition-colors ${on ? "bg-success" : "bg-surface-2 border border-line"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-bg shadow-sm transition-transform ${on ? "translate-x-4" : ""}`}
      />
    </button>
  );
}

function EditSheet({
  item,
  categories,
  onClose,
}: {
  item: AdminItem | "new";
  categories: AdminCategory[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<FoodFormState, FormData>(saveFoodItem, {});
  const isNew = item === "new";
  const d = isNew ? null : item;

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onClose();
    }
  }, [state.ok, router, onClose]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-board/45 animate-[fade_.15s_ease-out]" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-bg border-l border-line shadow-lg overflow-y-auto animate-[slidein_.18s_var(--ease-out)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg">{isNew ? "New dish" : "Edit dish"}</h3>
          <button onClick={onClose} className="text-muted text-xl leading-none">×</button>
        </div>
        <form action={action} className="flex flex-col gap-3">
          {!isNew && <input type="hidden" name="id" value={d!.id} />}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Name</span>
            <input name="name" defaultValue={d?.name} className={inputClass} required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Description</span>
            <input name="description" defaultValue={d?.description ?? ""} className={inputClass} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Price (₹)</span>
              <input
                name="priceRupees"
                type="number"
                min="1"
                step="1"
                defaultValue={d ? paiseToRupees(d.priceCents) : ""}
                className={inputClass}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Prep (min)</span>
              <input
                name="prepMinutes"
                type="number"
                min="1"
                defaultValue={d?.prepMinutes ?? 10}
                className={inputClass}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Category</span>
            <select
              name="categoryId"
              defaultValue={d?.categoryId ?? categories[0]?.id}
              className={inputClass}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Image URL (optional)</span>
            <input name="imageUrl" defaultValue={d?.imageUrl ?? ""} className={inputClass} placeholder="https://…" />
          </label>
          <div className="flex gap-5 mt-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isVeg" defaultChecked={d ? d.isVeg : true} /> Veg
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="available" defaultChecked={d ? d.available : true} /> Available
            </label>
          </div>

          {state.error && (
            <p className="text-sm text-[color:var(--color-danger)]">{state.error}</p>
          )}
          <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "mt-2")}>
            {pending ? "Saving…" : isNew ? "Add dish" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CategoryEditor({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FoodFormState, FormData>(saveCategory, {});
  const [confirmCat, setConfirmCat] = useState<AdminCategory | null>(null);
  const [delPending, startDel] = useTransition();

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      setOpen(false);
    }
  }, [state.ok, router]);

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1.5 text-sm border border-line rounded-[var(--radius-pill)] pl-3 pr-1.5 py-1 bg-surface"
          >
            {c.emoji} {c.name}
            <button
              onClick={() => setConfirmCat(c)}
              className="w-5 h-5 grid place-items-center rounded-full hover:bg-danger-soft text-muted hover:text-[color:var(--color-danger)]"
              aria-label={`Delete ${c.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <button onClick={() => setOpen((o) => !o)} className={buttonClass("secondary", "sm")}>
          {open ? "Close" : "+ Category"}
        </button>
      </div>

      {open && (
        <form action={action} className="mt-3 flex gap-2 items-end flex-wrap bg-surface border border-line rounded-[var(--radius-card)] p-3">
          <label className="flex flex-col gap-1 text-sm">
            Emoji
            <input name="emoji" className={inputClass + " w-16"} defaultValue="🍽️" />
          </label>
          <label className="flex flex-col gap-1 text-sm flex-1 min-w-[140px]">
            Name
            <input name="name" className={inputClass} placeholder="e.g. Chinese" required />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Sort
            <input name="sortOrder" type="number" className={inputClass + " w-16"} defaultValue={categories.length} />
          </label>
          <button className={buttonClass("primary", "sm")} disabled={pending}>
            {pending ? "…" : "Add"}
          </button>
          {state.error && <p className="text-sm text-[color:var(--color-danger)] w-full">{state.error}</p>}
        </form>
      )}

      <ConfirmDialog
        open={!!confirmCat}
        title={`Delete "${confirmCat?.name}"?`}
        body="Only empty categories can be removed. Its dishes must be moved or deleted first."
        onCancel={() => setConfirmCat(null)}
        pending={delPending}
        onConfirm={() =>
          startDel(async () => {
            const res = await deleteCategory(confirmCat!.id);
            if (!res.ok) alert(res.error);
            setConfirmCat(null);
            router.refresh();
          })
        }
      />
    </div>
  );
}

export function AdminMenu({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminItem | "new" | null>(null);
  const [confirmItem, setConfirmItem] = useState<AdminItem | null>(null);
  const [delPending, startDel] = useTransition();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl">Menu</h1>
        <button onClick={() => setEditing("new")} className={buttonClass("primary", "sm")}>
          + Add dish
        </button>
      </div>

      <CategoryEditor categories={categories} />

      <div className="flex flex-col gap-6">
        {categories.map((c) => (
          <section key={c.id}>
            <h2 className="font-display text-sm text-muted mb-2">
              {c.emoji} {c.name} · {c.items.length}
            </h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {c.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 items-center bg-surface border border-line rounded-[var(--radius-card)] p-2.5"
                >
                  <FoodImg
                    name={item.name}
                    imageUrl={item.imageUrl}
                    className="w-12 h-12 rounded-[10px] object-cover border border-line shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-grid place-items-center w-3 h-3 border shrink-0"
                        style={{ borderColor: item.isVeg ? "var(--color-success)" : "var(--color-danger)" }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: item.isVeg ? "var(--color-success)" : "var(--color-danger)" }}
                        />
                      </span>
                      <span className="text-sm font-medium truncate">{item.name}</span>
                      {item.isSpecial && <Badge tone="accent">Special</Badge>}
                    </div>
                    <span className="text-xs text-muted tabular">{formatINR(item.priceCents)}</span>
                  </div>
                  <AvailabilitySwitch item={item} />
                  <button
                    onClick={() => setEditing(item)}
                    className="w-8 h-8 grid place-items-center rounded-full hover:bg-surface-2"
                    aria-label="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setConfirmItem(item)}
                    className="w-8 h-8 grid place-items-center rounded-full hover:bg-danger-soft text-muted hover:text-[color:var(--color-danger)]"
                    aria-label="Delete"
                  >
                    🗑
                  </button>
                </div>
              ))}
              {c.items.length === 0 && (
                <p className="text-sm text-muted">No dishes in this section yet.</p>
              )}
            </div>
          </section>
        ))}
      </div>

      {editing && (
        <EditSheet item={editing} categories={categories} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={!!confirmItem}
        title={`Delete "${confirmItem?.name}"?`}
        body="This removes it from the menu. If it appears in past orders it's hidden instead, so history stays intact."
        onCancel={() => setConfirmItem(null)}
        pending={delPending}
        onConfirm={() =>
          startDel(async () => {
            await deleteFoodItem(confirmItem!.id);
            setConfirmItem(null);
            router.refresh();
          })
        }
      />
    </div>
  );
}
