import { useEffect, useRef, useState, type FormEvent } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import Input from "../common/Input";
import { useInventoryCatalog } from "../../features/inventory/useInventoryCatalog";
import { saveSupplier } from "../../services/restaurantService";
import type { Supplier } from "../../types";

export default function SupplierSettings() {
  const { suppliers, loading, error, refetch } = useInventoryCatalog();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const firstSupplierActionRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const retryFocusPending = useRef(false);

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
      setEditing(null);
    }
    catch (error) { setMessage(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  };
  return <Card title="Fournisseurs">
    {loading && <p role="status">Chargement des fournisseurs…</p>}
    {error ? <div role="alert"><p>{message || error.message}</p>
      <Button ref={retryButtonRef} type="button" variant="outline" disabled={loading || saving} onClick={retryCatalog}>Réessayer</Button>
    </div> : message && <p role="alert">{message}</p>}
    {notice && <p role="status">{notice}</p>}
    {suppliers.map((supplier, index) => <div key={supplier.id} className="integration-item"><div><strong>{supplier.name}</strong><p>{supplier.email} · {supplier.phone}</p></div><Button ref={index === 0 ? firstSupplierActionRef : undefined} type="button" disabled={saving} variant="outline" onClick={() => { setEditing(supplier); setCreating(false); setMessage(""); setNotice(""); }}>Modifier</Button></div>)}
    <Button ref={suppliers.length === 0 ? firstSupplierActionRef : undefined} type="button" disabled={saving || loading || Boolean(error)} onClick={() => { setEditing({ id: crypto.randomUUID(), name: "", email: "", phone: "" }); setCreating(true); setMessage(""); setNotice(""); }}>Ajouter un fournisseur</Button>
    {editing && <form ref={formRef} onSubmit={submit} className="form-grid">
      <h3>{creating ? "Nouveau fournisseur" : "Modifier le fournisseur"}</h3>
      <Input id="supplier-name" label="Nom" required value={editing.name} disabled={saving} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
      <Input id="supplier-email" label="Email" type="email" required value={editing.email} disabled={saving} onChange={(event) => setEditing({ ...editing, email: event.target.value })} />
      <Input id="supplier-phone" label="Téléphone" type="tel" value={editing.phone} disabled={saving} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} />
      <div className="flex gap-sm"><Button type="submit" disabled={saving}>Enregistrer</Button><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(null)}>Annuler</Button></div>
    </form>}
  </Card>;
}
