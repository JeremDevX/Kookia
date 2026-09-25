import { Link } from "react-router-dom";
import "../styles/Workspace.css";
import "./More.css";

const destinations = [
  { title: "Recettes réalisables", detail: "Consultez les recettes possibles avec les quantités enregistrées.", to: "/recipes" },
  { title: "Bilan", detail: "Retrouvez vos ventes enregistrées et les rapports disponibles.", to: "/analytics" },
  { title: "Restaurant", detail: "Mettez à jour les informations de votre établissement.", to: "/settings" },
  { title: "Fournisseurs", detail: "Retrouvez les coordonnées utilisées pour vos achats.", to: "/settings?section=suppliers" },
  { title: "Connexions", detail: "Consultez l'état des sources automatiques et les replis manuels.", to: "/settings?section=connections" },
  { title: "Mon compte", detail: "Gérez votre profil et votre accès.", to: "/settings?section=account" },
  { title: "Scénarios d'exemple", detail: "Explorez la démonstration, sans la confondre avec vos données.", to: "/predictions" },
  { title: "Historique", detail: "Parcourez documents, stock, recettes et services avec leur niveau de preuve.", to: "/history" },
];

export default function More() {
  return <div className="workspace-page more-page">
    <header className="workspace-header"><div><h1>Plus</h1><p className="workspace-subtitle">Les fonctions utiles de temps en temps.</p></div></header>
    <div className="more-grid">{destinations.map((item) => <section className="more-card" key={item.to}>
      <h2>{item.title}</h2><p>{item.detail}</p><Link to={item.to}>Ouvrir {item.title.toLocaleLowerCase("fr-FR")}</Link>
    </section>)}</div>
    <p className="more-help"><a href="mailto:support@kookia.app?subject=Support%20KookiA">Besoin d'aide ? Contacter Kookia</a></p>
  </div>;
}
