import { useEffect, useRef, useState, type FormEvent } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import Input from "../common/Input";
import { useInventoryCatalog } from "../../features/inventory/useInventoryCatalog";
import { saveSupplier } from "../../services/restaurantService";
import type { Supplier } from "../../types";
import { useAuth } from "../../features/auth/context/AuthContext";
import { clearSupplierDraft, readSupplierDraft, saveSupplierDraft } from "./supplierDraft";

export default function SupplierSettings({ onEditingChange }: { onEditingChange?: (editing: boolean) => void } = {}) {
  const { suppliers, loading, error, refetch } = useInventoryCatalog();
  const { user } = useAuth();
  const [draft] = useState(() => user ? readSupplierDraft(user.id) : null);
  const [editing, setEditing] = useState<Supplier | null>(draft?.supplier ?? null);
  const [creating, setCreating] = useState(draft?.creating ?? false);
  const edit = (supplier: Supplier | null, isCreating = creating) => {
    if (user) {
      if (supplier) saveSupplierDraft(user.id, { supplier, creating: isCreating });
      else clearSupplierDraft(user.id);
    }
    setEditing(supplier); onEditingChange?.(supplier !== null);
  };
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const firstSupplierActionRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const retryFocusPending = useRef(false);

  useEffect(() => {
    if (!editing) return;
    onEditingChange?.(true);
  }, [editing, onEditingChange]);

  useEffect(() => {
    if (loading || !retryFocusPending.current) return;
    retryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (error) retryButtonRef.current?.focus();
    else if (editing) formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    else firstSupplierActionRef.current?.focus();
  }, [editing, error, loading, suppliers]);

  const retryCatalog = () => {
    retryFocusPending.current = document.activeElement === retryButtonRef.current;
    void refetch();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!editing || saving) return;
    setSaving(true); setMessage(""); setNotice("");
    try {
      await saveSupplier(editing, creating);
      setNotice(creating ? "Fournisseur ajouté." : "Fournisseur modifié.");
      await refetch();
      edit(null);
    }
    catch (error) { setMessage(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  };
  return <Card title="Fournisseurs" className="suppliers-card">
    {loading && <p role="status">Chargement des fournisseurs…</p>}
    {error ? <div role="alert"><p>{message || error.message}</p>
      <Button ref={retryButtonRef} type="button" variant="outline" disabled={loading || saving} onClick={retryCatalog}>Réessayer</Button>
    </div> : message && <p role="alert">{message}</p>}
    {notice && <p role="status">{notice}</p>}
    {suppliers.map((supplier, index) => <div key={supplier.id} className="integration-item"><div><strong>{supplier.name}</strong><p>{supplier.email} · {supplier.phone}</p></div><Button ref={index === 0 ? firstSupplierActionRef : undefined} type="button" disabled={saving || editing !== null} variant="outline" onClick={() => { edit(supplier, false); setCreating(false); setMessage(""); setNotice(""); }}>Modifier</Button></div>)}
    <Button ref={suppliers.length === 0 ? firstSupplierActionRef : undefined} type="button" disabled={saving || loading || Boolean(error) || editing !== null} onClick={() => { edit({ id: crypto.randomUUID(), name: "", email: "", phone: "" }, true); setCreating(true); setMessage(""); setNotice(""); }}>Ajouter un fournisseur</Button>
    {editing && <form ref={formRef} onSubmit={submit} className="form-grid supplier-form">
      <h3>{creating ? "Nouveau fournisseur" : "Modifier le fournisseur"}</h3>
      <Input id="supplier-name" label="Nom" placeholder="Nom du fournisseur" required value={editing.name} disabled={saving} onChange={(event) => edit({ ...editing, name: event.target.value })} />
      <Input id="supplier-email" label="Email" type="email" placeholder="adresse@exemple.fr" required value={editing.email} disabled={saving} onChange={(event) => edit({ ...editing, email: event.target.value })} />
      <Input id="supplier-phone" label="Téléphone" type="tel" placeholder="Facultatif" value={editing.phone} disabled={saving} onChange={(event) => edit({ ...editing, phone: event.target.value })} />
      <fieldset disabled={saving}><legend>Jours de livraison (Europe/Paris)</legend>
        {["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].map((day, index) => <label key={day}><input type="checkbox" checked={editing.deliveryWeekdays?.includes(index) ?? false} onChange={(event) => edit({ ...editing, deliveryWeekdays: event.target.checked ? [...(editing.deliveryWeekdays ?? []), index].sort() : (editing.deliveryWeekdays ?? []).filter((value) => value !== index) })} /> {day} </label>)}
      </fieldset>
      <Input id="supplier-lead" label="Délai de commande (jours calendaires)" type="number" min="0" max="60" value={editing.leadTimeDays ?? ""} disabled={saving} onChange={(event) => edit({ ...editing, leadTimeDays: event.target.value === "" ? null : Number(event.target.value) })} />
      <Input id="supplier-cutoff" label="Heure limite de commande (Europe/Paris)" type="time" value={editing.orderCutoffTime ?? ""} disabled={saving} onChange={(event) => edit({ ...editing, orderCutoffTime: event.target.value || null })} />
      <p>Sans contraintes renseignées, l’horizon d’achat reste à confirmer. Après l’heure limite, le calcul part du lendemain.</p>
      <div className="flex gap-sm"><Button type="submit" disabled={saving}>Enregistrer</Button><Button type="button" variant="outline" disabled={saving} onClick={() => edit(null)}>Annuler</Button></div>
    </form>}
  </Card>;
}
