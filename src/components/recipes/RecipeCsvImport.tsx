import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Button from "../common/Button";
import Modal from "../common/Modal";
import type { Product } from "../../types";
import { mapRecipeColumns, readRecipeCsvFile, validateImportRows, type CsvDocument, type ImportedIngredient, type ImportRow } from "../../features/recipes/recipeCsv";
import "./RecipeCsvImport.css";

export default function RecipeCsvImport({ products, onClose, onApply }: { products: Product[]; onClose: () => void; onApply: (ingredients: ImportedIngredient[]) => void }) {
  const [document, setDocument] = useState<CsvDocument | null>(null);
  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState({ product: "", quantity: "", unit: "" });
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const request = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (document) heading.current?.focus(); }, [document, reviewing]);
  useEffect(() => () => { request.current++; }, []);
  const read = async (event: ChangeEvent<HTMLInputElement>) => {
    const current = ++request.current;
    const file = event.target.files?.[0];
    setError(""); setReading(false);
    if (!file) return;
    setDocument(null); setFileName(""); setRows(null); setReviewing(false); setColumns({ product: "", quantity: "", unit: "" });
    setReading(true);
    try {
      const parsed = await readRecipeCsvFile(file);
      if (current === request.current) { setDocument(parsed); setFileName(file.name); setRows(null); setReviewing(false); setColumns({ product: "", quantity: "", unit: "" }); }
    } catch (cause) {
      if (current === request.current) setError(cause instanceof TypeError ? "Le fichier doit être encodé en UTF-8." : cause instanceof Error ? cause.message : "Impossible de lire le fichier.");
    } finally { if (current === request.current) setReading(false); }
  };
  const review = () => {
    if (!document) return;
    try {
      if (Object.values(columns).some((value) => value === "")) throw new Error("Associez les trois colonnes demandées.");
      const mapped = mapRecipeColumns(document, { product: Number(columns.product), quantity: Number(columns.quantity), unit: Number(columns.unit) });
      setRows((current) => current ?? mapped); setReviewing(true);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Colonnes invalides."); }
  };
  const update = (index: number, patch: Partial<ImportRow>) => setRows((current) => current?.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) ?? null);
  const validation = rows ? validateImportRows(rows, products) : null;
  return <Modal isOpen onClose={onClose} title="Importer une fiche CSV" width="xl">
    <div className="recipe-csv-import">
      <p>Importez les ingrédients d’une fiche. Les prix et fournisseurs du fichier ne modifient pas le catalogue.</p>
      <p>Colonnes nécessaires : produit, quantité brute et unité. Une recette ne sera créée qu’après vérification dans l’éditeur.</p>
      {!reviewing && <><label>Fichier CSV<input type="file" accept=".csv,text/csv" onChange={(event) => void read(event)} /></label>
        {reading && <p role="status">Lecture du fichier…</p>}
        {document && <><h3 ref={heading} tabIndex={-1}>Associer les colonnes</h3><p>Fichier chargé : {fileName}</p><fieldset><legend>Colonnes du fichier</legend>
          {([['product', 'Produit'], ['quantity', 'Quantité brute'], ['unit', 'Unité']] as const).map(([key, label]) => <label key={key}>{label}<select value={columns[key]} onChange={(event) => { setRows(null); setColumns((current) => ({ ...current, [key]: event.target.value })); }}>
            <option value="">Choisir une colonne</option>{document.headers.map((header, index) => <option key={index} value={index}>{header}</option>)}
          </select></label>)}
        </fieldset></>}
      </>}
      {reviewing && rows && <><h3 ref={heading} tabIndex={-1}>Vérifier les ingrédients</h3><p>Associez chaque ligne à un produit existant. L’unité doit être identique à celle du catalogue ; aucune conversion n’est faite.</p>
        {!products.length && <p role="status">Aucun produit dans le catalogue. Ajoutez les produits nécessaires avant d’importer cette fiche.</p>}
        <div className="recipe-csv-rows">{rows.map((row, index) => <fieldset key={index}><legend>Ligne {row.line} · {row.source || "produit manquant"}</legend>
          <label>Désignation du fichier<input value={row.source} onChange={(event) => update(index, { source: event.target.value })} /></label>
          <label>Produit du catalogue<select value={row.productId} onChange={(event) => update(index, { productId: event.target.value })}>
            <option value="">Choisir un produit</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.unit})</option>)}
          </select></label>
          <label>Quantité brute<input inputMode="decimal" value={row.quantity} onChange={(event) => update(index, { quantity: event.target.value })} /></label>
          <label>Unité du fichier<input value={row.unit} onChange={(event) => update(index, { unit: event.target.value })} /></label>
        </fieldset>)}</div>
        {validation && validation.errors.length > 0 && <div role="status"><p>À corriger avant de continuer :</p><ul>{validation.errors.map((message, index) => <li key={index}>{message}</li>)}</ul></div>}
      </>}
      {error && <p role="alert">{error}</p>}
      <div className="recipe-csv-actions"><Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        {reviewing && rows ? <><Button type="button" variant="outline" onClick={() => { setReviewing(false); setError(""); }}>Retour aux colonnes</Button>
          <Button type="button" disabled={!validation || validation.errors.length > 0} onClick={() => { if (validation && validation.errors.length === 0) onApply(validation.ingredients); }}>Revoir dans l’éditeur</Button></> :
          <Button type="button" disabled={!document || reading} onClick={review}>Associer les produits</Button>}
      </div>
    </div>
  </Modal>;
}
