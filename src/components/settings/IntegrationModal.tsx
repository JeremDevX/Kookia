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
      <p>{integration.name} n’est pas connecté. Aucune donnée de caisse n’est importée.</p>
      <p>En attendant, saisissez vos factures et vos stocks manuellement.</p>
      <Button variant="outline" onClick={onClose}>Fermer</Button>
    </div>
  </Modal>;
}
