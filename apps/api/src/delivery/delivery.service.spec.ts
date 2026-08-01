import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BoutiqueEntity } from '../entities/boutique.entity';
import { ProductEntity } from '../entities/product.entity';
import { QuartierEntity } from '../entities/quartier.entity';
import { ReglesLivraisonEntity } from '../entities/regles-livraison.entity';
import { StockEntity } from '../entities/stock.entity';
import { TarifLivraisonEntity } from '../entities/tarif-livraison.entity';
import { ZoneEntity } from '../entities/zone.entity';
import { DeliveryService } from './delivery.service';

const REGLES = {
  id: 'singleton',
  seuil_franco: 50_000,
  poids_inclus_kg: 5,
  prix_par_kg_supplementaire: 200,
  supplement_fragile: 1_000,
  supplement_chaine_froid: 2_000,
  supplement_express: 1_500,
  supplement_boutique_eloignee: 1_000,
  livraison_active: true,
} as ReglesLivraisonEntity;

const ZONE = {
  id: 'zone-1',
  code: 'Z1',
  libelle: 'Proximité',
  delai_estime: 'sous 2h',
  livraison_disponible: true,
  actif: true,
} as ZoneEntity;

const QUARTIER = {
  id: 'q-1',
  nom: 'Melen',
  slug: 'melen',
  alias: [],
  zone_id: 'zone-1',
  boutique_defaut_id: 'b-1',
  latitude: 3.864,
  longitude: 11.498,
  actif: true,
} as QuartierEntity;

const BOUTIQUE = {
  id: 'b-1',
  nom: 'Boutique Melen',
  code: 'MELEN',
  quartier: 'Melen',
  point_repere: 'Face École de Police',
  latitude: 3.859,
  longitude: 11.487,
  telephone: '+237 6XX',
  gere_chaine_froid: false,
  actif: true,
  ordre_affichage: 1,
} as BoutiqueEntity;

const produit = (patch: Partial<ProductEntity> = {}): ProductEntity =>
  ({
    id: 'p1',
    name: { fr: 'Produit', en: 'Product' },
    price: 10_000,
    poids_kg: 1,
    est_fragile: false,
    necessite_chaine_froid: false,
    livraison_autorisee: true,
    necessite_ordonnance: false,
    actif: true,
    ...patch,
  }) as ProductEntity;

describe('DeliveryService — calcul des frais', () => {
  let service: DeliveryService;
  let repos: Record<string, any>;

  const build = async (overrides: Partial<Record<string, any>> = {}) => {
    repos = {
      boutique: { find: jest.fn().mockResolvedValue([BOUTIQUE]), findOne: jest.fn() },
      zone: { find: jest.fn().mockResolvedValue([ZONE]), findOne: jest.fn().mockResolvedValue(ZONE) },
      quartier: {
        find: jest.fn().mockResolvedValue([QUARTIER]),
        findOne: jest.fn().mockResolvedValue(QUARTIER),
      },
      tarif: { findOne: jest.fn().mockResolvedValue({ montant: 1_000 }) },
      regles: { findOne: jest.fn().mockResolvedValue(REGLES) },
      stock: {
        find: jest.fn().mockResolvedValue([{ produit_id: 'p1', boutique_id: 'b-1', quantite: 50 }]),
      },
      product: { find: jest.fn().mockResolvedValue([produit()]) },
      ...overrides,
    };

    const module = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: getRepositoryToken(BoutiqueEntity), useValue: repos.boutique },
        { provide: getRepositoryToken(ZoneEntity), useValue: repos.zone },
        { provide: getRepositoryToken(QuartierEntity), useValue: repos.quartier },
        { provide: getRepositoryToken(TarifLivraisonEntity), useValue: repos.tarif },
        { provide: getRepositoryToken(ReglesLivraisonEntity), useValue: repos.regles },
        { provide: getRepositoryToken(StockEntity), useValue: repos.stock },
        { provide: getRepositoryToken(ProductEntity), useValue: repos.product },
      ],
    }).compile();

    service = module.get(DeliveryService);
  };

  const simuler = (quantite = 1, express = false) =>
    service.simulateDelivery({
      quartier_id: 'q-1',
      panier: [{ produit_id: 'p1', quantite }],
      express,
    });

  it('applique le tarif de base de la zone', async () => {
    await build();
    const res = await simuler();

    expect(res.mode).toBe('tarif');
    expect(res.frais).toBe(1_000);
    expect(res.zone_code_snapshot).toBe('Z1');
  });

  it('offre la livraison au-delà du seuil franco', async () => {
    await build({ product: { find: jest.fn().mockResolvedValue([produit({ price: 60_000 })]) } });
    const res = await simuler();

    expect(res.frais).toBe(0);
    expect(res.franco_applique).toBe(true);
  });

  it('facture le poids au-delà du forfait inclus', async () => {
    await build({ product: { find: jest.fn().mockResolvedValue([produit({ poids_kg: 12 })]) } });
    const res = await simuler();

    // 1000 de base + 7 kg × 200 = 2400, arrondi à la centaine supérieure.
    expect(res.frais).toBe(2_400);
  });

  it('ajoute le supplément fragile', async () => {
    await build({ product: { find: jest.fn().mockResolvedValue([produit({ est_fragile: true })]) } });
    expect((await simuler()).frais).toBe(2_000);
  });

  it('ajoute le supplément express', async () => {
    await build();
    expect((await simuler(1, true)).frais).toBe(2_500);
  });

  it('arrondit à la centaine supérieure', async () => {
    await build({
      product: { find: jest.fn().mockResolvedValue([produit({ poids_kg: 5.4 })]) },
    });
    const res = await simuler();

    expect(res.frais! % 100).toBe(0);
  });

  it('impose le retrait si un produit n’est pas livrable', async () => {
    await build({
      product: { find: jest.fn().mockResolvedValue([produit({ livraison_autorisee: false })]) },
    });
    const res = await simuler();

    expect(res.mode).toBe('retrait_obligatoire');
    expect(res.frais).toBeNull();
  });

  it('bascule en devis hors zone de livraison', async () => {
    await build({
      zone: {
        find: jest.fn().mockResolvedValue([ZONE]),
        findOne: jest.fn().mockResolvedValue({ ...ZONE, livraison_disponible: false }),
      },
    });
    const res = await simuler();

    expect(res.mode).toBe('devis');
  });

  it('respecte l’interrupteur global de livraison', async () => {
    await build({
      regles: { findOne: jest.fn().mockResolvedValue({ ...REGLES, livraison_active: false }) },
    });
    const res = await simuler();

    expect(res.mode).toBe('indisponible');
  });

  it('signale un transfert quand aucune boutique n’a tout le stock', async () => {
    await build({ stock: { find: jest.fn().mockResolvedValue([]) } });
    const res = await simuler();

    expect(res.mode).toBe('tarif');
    expect(res.message).toMatch(/transfert/i);
  });

  it('écarte une boutique sans chaîne du froid pour un produit thermosensible', async () => {
    await build({
      product: {
        find: jest.fn().mockResolvedValue([produit({ necessite_chaine_froid: true })]),
      },
    });
    const res = await simuler();

    // La seule boutique ne gère pas le froid : transfert requis, et supplément appliqué.
    expect(res.message).toMatch(/transfert/i);
    expect(res.frais).toBe(3_000);
  });
});

describe('DeliveryService — distance', () => {
  it('calcule une distance cohérente entre deux quartiers de Yaoundé', async () => {
    const module = await Test.createTestingModule({
      providers: [
        DeliveryService,
        ...[
          BoutiqueEntity,
          ZoneEntity,
          QuartierEntity,
          TarifLivraisonEntity,
          ReglesLivraisonEntity,
          StockEntity,
          ProductEntity,
        ].map((entity) => ({ provide: getRepositoryToken(entity), useValue: {} })),
      ],
    }).compile();

    const service = module.get(DeliveryService);
    // Melen → Ngousso : environ 6 km à vol d'oiseau.
    const km = service.calculateHaversine(3.864, 11.498, 3.891, 11.547);

    expect(km).toBeGreaterThan(4);
    expect(km).toBeLessThan(8);
    expect(service.calculateHaversine(3.864, 11.498, 3.864, 11.498)).toBe(0);
  });
});
