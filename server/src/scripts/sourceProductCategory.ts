const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae");

export function sourceProductCategory(name: string, supplier: string): string {
  const product = normalized(name);
  const origin = normalized(supplier);
  const has = (pattern: RegExp) => pattern.test(product);

  if (has(/ampoules? led|plats? 1\/2 gastro/)) return "Matériel et équipement";
  if (has(/friskies|croquettes? pour (?:chien|chat)/)) return "Alimentation animale";
  if (has(/detergent|degraiss|desinfect|lave.vaisselle|\bvselle\b|\bpaic\b|lavet|frange|gants?|nitril|rasoir|dentifrice|papier toil|\bpap toil\b|essuie|nettoyant|liquide vaisselle/)) return "Hygiène et entretien";
  if (has(/^barquette|^bqt|couverc|couvero|^couv |gobelet|fourch|cuillere|assiette|^bot [0-9]|^kit couvert|^pique bambou|^bte |^bol soupe|sac kraft|emballage|^pot |^coupe dessert|^agit bois|^salad rd|boite repas/)
    || origin.includes("gie de salaise")) return "Emballages et service";
  if (has(/charbon|allume.feu|buchettes/) || origin.includes("comptoir plus")) return "Combustibles";
  if (has(/glace|sorbet|\bc\.or\b|\bg cor\b/)) return "Glaces et sorbets";

  if (origin.includes("cave saint-desirat") || origin.includes("vins gary")
    || has(/\bvin\b|\bvd[p]?\b|\bigp\b|\baop\b.*(?:rouge|rose|blanc|saint.joseph|pouilly|bordeaux)|\bbib\b|cotes du rhone|viognier|syrah|chinian/)) return "Vins";
  if (origin.includes("brasserie du loup blanc") || has(/biere|\bfut\b|dunkelweizen|chananass|triple 33 cl/)) return "Bières";
  if (has(/coca|limonade|soda|monster|^jus |^sirop|eau min|^eau |^cafe|espresso|lavazza|^the |vodka|pastis|rhum|whisky|picon|campari/)) return "Boissons";

  if (has(/saumon|thon|cabillaud|colin|sandre|sole |merou|merlu|truite|st pierre|saint.pierre|loup de mer|crevette|calamar|surimi|fruits? de mer|noix st.jacques|huitre|grenouille|poisson/)) return "Poissons et fruits de mer";
  if (has(/jambon|lardon|rosette|sauciss|merguez|godiveaux|chipolata|chorizo|andouillette|boudin|caillette|pate en croute|museau|carpaccio|terrine|poitrine fumee|richelieu/)) return "Charcuterie";
  if (has(/boeuf|porc|veau|poulet|dinde|canard|lapin|pintade|porcelet|agneau|entrecote|bavette|paleron|rumst|onglet|magret|foie gras|coquelet|hampe|viande|roti|saute |travers |jarret|coq |kebab|faux.filet|tend(?:e|re) de tranche|\bcoeur tt\b|basse cote|rond de gite|dessous de palette|\bos canon\b|\bpoire pad\b|tartare a l.indienne|noix de joue|cote d.agneau/)
    || origin.includes("boucherie robin")) return "Viandes";

  if (has(/mozzarella|emmental|parmesan|parmigiano|raclette|reblochon|brie|camembert|roquefort|morbier|cheddar|comte|beaufort|cantal|chevre|burrata|saint.marcellin|fromage|buche chevre/)
    || origin.includes("fromager de salaise")) return "Fromages";
  if (!has(/farine/) && has(/beurre|creme (?!marron|de marron)|mascarpone|yaourt|\blait\b|oeuf|faisselle|brousse/)) return "Frais";

  if (has(/pate feuilletee/)) return "Pâtisserie";
  if (has(/creme (?:de )?marron|marrons? naturel|olives?|cornichon|moutarde|huile|vinaigre|\briz\b|macaroni|cellentani|farine|semoule|couscous|lentilles|\bpate\b|ravioles?|taboule|lasagne|spaghetti|farfalle|gnocchi|crozet|sucre|\bsel\b|poivre|epice|chipotle|bouillon|levure|chapelure|mais |pois chiche|tomates? (?:pele|conca|confite|cube)|\btomate pelse\b|crouton|tabasco|nutella|gelatine|melange trois riz|perli.ble|haricots? lingots|cracotte|mel aper|bonbon|haribo|tirlibibi|ricola|ananas tranche|petit.tran|spec.nie/)) return "Épicerie";
  if (has(/pommes? de terre|^pdt|tomates? |^tomates?$|salade|batavia|chene (?:vert|rouge|blond)|feuille de chene|laitue|\bail\b|oignon|carotte|poireau|navet|celeri|champignon|concombre|radis|betterave|roquette|persil|ciboulette|courgette|poivron|choucroute/)) return "Légumes";
  if (has(/pepites? framboise/)) return "Pâtisserie";
  if (has(/fraise|framboise|\bmure|kiwi|pomelo|citron|pommes? (?!de terre)|poires? (?!pad)|peche|abricot|orange|ananas|mangue/)) return "Fruits";

  if (has(/gaufre|chocolat|guanaja|dulcey|jivara|canele|patisserie|dessert|gateau|biscuit|muffin|cookie|cr.glacee|pepites? framboise|meringue|feuille de brick|pate feuilletee/)
    || origin.includes("valrhona")) return "Pâtisserie";
  if (has(/baguette|\bpain\b|croissant|brioche/) || origin.includes("boulangerie morandat")) return "Boulangerie";

  // An illegible source must remain reviewable; a supplier alone cannot establish its product type.
  return "À identifier";
}
