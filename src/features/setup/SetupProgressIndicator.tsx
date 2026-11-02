const labels = ["Restaurant", "Équipe", "Fournisseurs", "Récapitulatif"];
export default function SetupProgressIndicator({ index }: { index: number }) {
  return <ol className="setup-progress" aria-label="Progression de la configuration">{labels.map((label, position) => <li key={label} aria-current={position === index ? "step" : undefined}>
    <span aria-hidden="true">{position + 1}</span> {label}{position < index && <span className="setup-progress-done"> · terminé</span>}
  </li>)}</ol>;
}
