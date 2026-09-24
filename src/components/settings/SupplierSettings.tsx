import { useState, type FormEvent } from "react";
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
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!editing || saving) return;
    setSaving(true); setMessage("");
    try { await saveSupplier(editing, creating); await refetch(); setEditing(null); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  };
  return <Card title="Fournisseurs">
    {loading && <p role="status">Chargement des fournisseurs…</p>}
    {(error || message) && <p role="alert">{message || error?.message}</p>}
    {suppliers.map((supplier) => <div key={supplier.id} className="integration-item"><div><strong>{supplier.name}</strong><p>{supplier.email} · {supplier.phone}</p></div><Button variant="outline" disabled={saving} onClick={() => { setEditing(supplier); setCreating(false); setMessage(""); }}>Modifier</Button></div>)}
    <Button disabled={saving} onClick={() => { setEditing({ id: crypto.randomUUID(), name: "", email: "", phone: "" }); setCreating(true); setMessage(""); }}>Ajouter un fournisseur</Button>
    {editing && <form onSubmit={submit} className="form-grid">
      <h3>{creating ? "Nouveau fournisseur" : "Modifier le fournisseur"}</h3>
      <Input id="supplier-name" label="Nom" required value={editing.name} disabled={saving} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
      <Input id="supplier-email" label="Email" type="email" required value={editing.email} disabled={saving} onChange={(event) => setEditing({ ...editing, email: event.target.value })} />
      <Input id="supplier-phone" label="Téléphone" type="tel" value={editing.phone} disabled={saving} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} />
      <div className="flex gap-sm"><Button type="submit" disabled={saving}>Enregistrer</Button><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(null)}>Annuler</Button></div>
    </form>}
  </Card>;
}
