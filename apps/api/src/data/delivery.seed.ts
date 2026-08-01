export const BOUTIQUES_SEED = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    code: 'NGOUSSO',
    nom: 'Pharmacie Bleue Ngousso',
    quartier: 'Ngousso',
    point_repere: 'En face du carrefour Ngousso, montée de l’hôpital',
    latitude: 3.898,
    longitude: 11.541,
    telephone: '+237 698 642 205',
    whatsapp: '+237 698 642 205',
    horaires: {
      lun: { ouv: '08:00', fer: '21:00' },
      mar: { ouv: '08:00', fer: '21:00' },
      mer: { ouv: '08:00', fer: '21:00' },
      jeu: { ouv: '08:00', fer: '21:00' },
      ven: { ouv: '08:00', fer: '21:00' },
      sam: { ouv: '09:00', fer: '20:00' },
      dim: { ouv: '10:00', fer: '18:00' }
    },
    gere_chaine_froid: true,
    actif: true,
    ordre_affichage: 1
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    code: 'MELEN',
    nom: 'Boutique Melen',
    quartier: 'Melen',
    point_repere: 'Face École de Police, à côté de la station Tradex',
    latitude: 3.859,
    longitude: 11.487,
    telephone: '+237 658 476 862',
    whatsapp: '+237 658 476 862',
    horaires: {
      lun: { ouv: '08:00', fer: '20:00' },
      mar: { ouv: '08:00', fer: '20:00' },
      mer: { ouv: '08:00', fer: '20:00' },
      jeu: { ouv: '08:00', fer: '20:00' },
      ven: { ouv: '08:00', fer: '20:00' },
      sam: { ouv: '08:00', fer: '18:00' },
      dim: null // fermé
    },
    gere_chaine_froid: false,
    actif: true,
    ordre_affichage: 2
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    code: 'CRADAT',
    nom: 'Boutique Cradat',
    quartier: 'Cradat / Nlongkak',
    point_repere: 'Entrée Cradat, Immeuble Don Bosco 2e étage',
    latitude: 3.879,
    longitude: 11.515,
    telephone: '+237 658 764 216',
    whatsapp: '',
    horaires: {
      lun: { ouv: '08:00', fer: '19:00' },
      mar: { ouv: '08:00', fer: '19:00' },
      mer: { ouv: '08:00', fer: '19:00' },
      jeu: { ouv: '08:00', fer: '19:00' },
      ven: { ouv: '08:00', fer: '19:00' },
      sam: { ouv: '09:00', fer: '17:00' },
      dim: null
    },
    gere_chaine_froid: true,
    actif: true,
    ordre_affichage: 3
  }
];

export const ZONES_SEED = [
  { id: '20000000-0000-4000-8000-000000000001', code: 'Z1', libelle: 'Proximité', delai_estime: 'sous 2h', livraison_disponible: true, actif: true },
  { id: '20000000-0000-4000-8000-000000000002', code: 'Z2', libelle: 'Urbain', delai_estime: 'sous 4h', livraison_disponible: true, actif: true },
  { id: '20000000-0000-4000-8000-000000000003', code: 'Z3', libelle: 'Périphérie', delai_estime: 'sous 24h', livraison_disponible: true, actif: true },
  { id: '20000000-0000-4000-8000-000000000004', code: 'Z4', libelle: 'Hors Yaoundé', delai_estime: 'sur devis', livraison_disponible: false, actif: true }
];

export const TARIFS_DEF_FCFA = { Z1: 1000, Z2: 2000, Z3: 3000, Z4: 0 };

export const REGLES_DEFAULT = {
  id: 'singleton',
  seuil_franco: 50000,
  poids_inclus_kg: 5,
  prix_par_kg_supplementaire: 200,
  supplement_fragile: 1000,
  supplement_chaine_froid: 2000,
  supplement_express: 1500,
  supplement_boutique_eloignee: 1000,
  livraison_active: true
};

export const QUARTIERS_SEED = [
  { nom: 'Nlongkak', zone: 'Z1', boutique_defaut: 'CRADAT', lat: 3.882, lng: 11.518 },
  { nom: 'Bastos', zone: 'Z1', boutique_defaut: 'CRADAT', lat: 3.896, lng: 11.512 },
  { nom: 'Hippodrome', zone: 'Z1', boutique_defaut: 'CRADAT', lat: 3.871, lng: 11.515 },
  { nom: 'Elig-Essono', zone: 'Z1', boutique_defaut: 'CRADAT', alias: ['Elig Essono'], lat: 3.875, lng: 11.523 },
  { nom: 'Centre administratif', zone: 'Z1', boutique_defaut: 'CRADAT', lat: 3.867, lng: 11.513 },
  { nom: 'Tsinga', zone: 'Z2', boutique_defaut: 'CRADAT', lat: 3.888, lng: 11.498 },
  { nom: 'Briqueterie', zone: 'Z2', boutique_defaut: 'CRADAT', lat: 3.878, lng: 11.503 },
  { nom: 'Messa', zone: 'Z2', boutique_defaut: 'CRADAT', lat: 3.872, lng: 11.501 },
  { nom: 'Mokolo', zone: 'Z2', boutique_defaut: 'CRADAT', lat: 3.869, lng: 11.502 },
  { nom: 'Madagascar', zone: 'Z2', boutique_defaut: 'CRADAT', lat: 3.881, lng: 11.493 },
  { nom: 'Mvog-Mbi', zone: 'Z2', boutique_defaut: 'CRADAT', alias: ['Mvog Mbi', 'Mvogmbi'], lat: 3.844, lng: 11.520 },
  { nom: 'Mvog-Ada', zone: 'Z2', boutique_defaut: 'CRADAT', alias: ['Mvog Ada'], lat: 3.855, lng: 11.529 },
  { nom: 'Nsam', zone: 'Z2', boutique_defaut: 'CRADAT', lat: 3.818, lng: 11.509 },
  { nom: 'Melen', zone: 'Z1', boutique_defaut: 'MELEN', lat: 3.864, lng: 11.498 },
  { nom: 'Ngoa-Ekellé', zone: 'Z1', boutique_defaut: 'MELEN', alias: ['Ngoa Ekelle', 'Ngoa-Ekelle'], lat: 3.861, lng: 11.512 },
  { nom: 'Obili', zone: 'Z1', boutique_defaut: 'MELEN', lat: 3.860, lng: 11.491 },
  { nom: 'Etoug-Ebe', zone: 'Z2', boutique_defaut: 'MELEN', alias: ['Etoug Ebe', 'Etougebe'], lat: 3.854, lng: 11.479 },
  { nom: 'Biyem-Assi', zone: 'Z2', boutique_defaut: 'MELEN', alias: ['Biyem Assi', 'Biyemassi'], lat: 3.840, lng: 11.488 },
  { nom: 'Mvolyé', zone: 'Z2', boutique_defaut: 'MELEN', alias: ['Mvolye'], lat: 3.849, lng: 11.506 },
  { nom: 'Mendong', zone: 'Z3', boutique_defaut: 'MELEN', lat: 3.834, lng: 11.470 },
  { nom: 'Simbock', zone: 'Z3', boutique_defaut: 'MELEN', lat: 3.821, lng: 11.472 },
  { nom: 'Nkolbisson', zone: 'Z3', boutique_defaut: 'MELEN', lat: 3.867, lng: 11.455 },
  { nom: 'Ahala', zone: 'Z3', boutique_defaut: 'MELEN', lat: 3.791, lng: 11.503 },
  { nom: 'Ngousso', zone: 'Z1', boutique_defaut: 'NGOUSSO', lat: 3.891, lng: 11.547 },
  { nom: 'Essos', zone: 'Z1', boutique_defaut: 'NGOUSSO', lat: 3.868, lng: 11.539 },
  { nom: 'Mfandena', zone: 'Z1', boutique_defaut: 'NGOUSSO', lat: 3.879, lng: 11.536 },
  { nom: 'Omnisport', zone: 'Z1', boutique_defaut: 'NGOUSSO', lat: 3.882, lng: 11.533 },
  { nom: 'Nkolmesseng', zone: 'Z2', boutique_defaut: 'NGOUSSO', lat: 3.895, lng: 11.562 },
  { nom: 'Emana', zone: 'Z2', boutique_defaut: 'NGOUSSO', lat: 3.921, lng: 11.528 },
  { nom: 'Etoudi', zone: 'Z2', boutique_defaut: 'NGOUSSO', lat: 3.912, lng: 11.528 },
  { nom: 'Mimboman', zone: 'Z2', boutique_defaut: 'NGOUSSO', lat: 3.858, lng: 11.558 },
  { nom: 'Ekounou', zone: 'Z2', boutique_defaut: 'NGOUSSO', lat: 3.835, lng: 11.537 },
  { nom: 'Odza', zone: 'Z3', boutique_defaut: 'NGOUSSO', lat: 3.805, lng: 11.535 },
  { nom: 'Nkoabang', zone: 'Z3', boutique_defaut: 'NGOUSSO', lat: 3.856, lng: 11.602 },
  { nom: 'Soa', zone: 'Z3', boutique_defaut: 'NGOUSSO', lat: 3.985, lng: 11.602 },
  { nom: 'Obala', zone: 'Z4', boutique_defaut: 'CRADAT', lat: 4.167, lng: 11.533 },
  { nom: 'Mfou', zone: 'Z4', boutique_defaut: 'CRADAT', lat: 3.717, lng: 11.633 },
  { nom: 'Mbalmayo', zone: 'Z4', boutique_defaut: 'CRADAT', lat: 3.517, lng: 11.500 }
];
