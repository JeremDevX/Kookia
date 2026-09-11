import Modal from "../common/Modal";
import Button from "../common/Button";
import Badge from "../common/Badge";
interface Integration { id: string; name: string; shortName: string; gradient: string; }
interface IntegrationModalProps { isOpen: boolean; onClose: () => void; integration: Integration | null; }

export default function IntegrationModal({ isOpen, onClose, integration }: IntegrationModalProps) {
  if (!integration) return null;
  return <Modal isOpen={isOpen} onClose={onClose} title={`Connexion ${integration.name}`} width="md">
    <div className="flex flex-col gap-lg">
      <Badge label="Non disponible" status="neutral" />
      <p>Aucun connecteur {integration.name} n’est implémenté. Aucune clé API n’est enregistrée et aucune synchronisation n’a été effectuée.</p>
      <p>Vous pouvez gérer vos stocks, enregistrer vos productions et saisir vos factures manuellement. Les données de démonstration ne proviennent pas d’une connexion à votre caisse.</p>
      <Button variant="outline" onClick={onClose}>Fermer</Button>
    </div>
  </Modal>;
}
