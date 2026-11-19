export function displayServiceNote(note: string, clientPresentation: boolean) {
  const workshopPrefix = "Service simulé par l’atelier documentaire.";
  return clientPresentation && note.startsWith(workshopPrefix) ? note.slice(workshopPrefix.length).trimStart() : note;
}
