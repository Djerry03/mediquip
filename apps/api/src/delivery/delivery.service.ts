import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BoutiqueEntity } from '../entities/boutique.entity';
import { ZoneEntity } from '../entities/zone.entity';
import { QuartierEntity } from '../entities/quartier.entity';
import { TarifLivraisonEntity } from '../entities/tarif-livraison.entity';
import { ReglesLivraisonEntity } from '../entities/regles-livraison.entity';
import { StockEntity } from '../entities/stock.entity';
import { ProductEntity } from '../entities/product.entity';
import { normalizeForSearch } from '../common/slug';

/** Résultat possible d'une simulation de livraison. */
export type DeliveryMode = 'tarif' | 'devis' | 'retrait_obligatoire' | 'indisponible';

export type DeliverySimulation = {
  mode: DeliveryMode;
  frais: number | null;
  detail: { libelle: string; montant: number }[];
  franco_applique?: boolean;
  montant_restant_pour_franco?: number;
  boutique_expedition?: { id: string; nom: string };
  zone_code_snapshot?: string;
  delai_estime?: string;
  message?: string | null;
};

const TARIF_BASE_PAR_DEFAUT = 1000;

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(BoutiqueEntity)
    private readonly boutiqueRepo: Repository<BoutiqueEntity>,
    @InjectRepository(ZoneEntity)
    private readonly zoneRepo: Repository<ZoneEntity>,
    @InjectRepository(QuartierEntity)
    private readonly quartierRepo: Repository<QuartierEntity>,
    @InjectRepository(TarifLivraisonEntity)
    private readonly tarifLivraisonRepo: Repository<TarifLivraisonEntity>,
    @InjectRepository(ReglesLivraisonEntity)
    private readonly reglesRepo: Repository<ReglesLivraisonEntity>,
    @InjectRepository(StockEntity)
    private readonly stockRepo: Repository<StockEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
  ) {}

  /** Distance à vol d'oiseau en kilomètres. */
  calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Règles exposées publiquement. Les suppléments internes (boutique
   * éloignée) restent privés : ils ne concernent pas le client.
   */
  async getPublicRules() {
    const regles = await this.reglesRepo.findOne({ where: { id: 'singleton' } });
    if (!regles) {
      return {
        seuil_franco: 0,
        poids_inclus_kg: 0,
        prix_par_kg_supplementaire: 0,
        supplement_fragile: 0,
        supplement_chaine_froid: 0,
        supplement_express: 0,
        livraison_active: false,
      };
    }

    return {
      seuil_franco: regles.seuil_franco,
      poids_inclus_kg: regles.poids_inclus_kg,
      prix_par_kg_supplementaire: regles.prix_par_kg_supplementaire,
      supplement_fragile: regles.supplement_fragile,
      supplement_chaine_froid: regles.supplement_chaine_froid,
      supplement_express: regles.supplement_express,
      livraison_active: regles.livraison_active,
    };
  }

  async listBoutiques() {
    const boutiques = await this.boutiqueRepo.find({
      where: { actif: true },
      order: { ordre_affichage: 'ASC' },
    });

    return boutiques.map((b) => ({
      id: b.id,
      code: b.code,
      nom: b.nom,
      quartier: b.quartier,
      point_repere: b.point_repere,
      telephone: b.telephone,
      whatsapp: b.whatsapp,
      latitude: b.latitude,
      longitude: b.longitude,
      horaires: b.horaires,
      gere_chaine_froid: b.gere_chaine_froid,
    }));
  }

  findQuartier(id: string) {
    return this.quartierRepo.findOne({ where: { id, actif: true } });
  }

  async searchQuartiers(q: string) {
    if (!q || q.trim().length < 2) return [];
    const needle = normalizeForSearch(q);
    if (!needle) return [];

    const [quartiers, zones] = await Promise.all([
      this.quartierRepo.find({ where: { actif: true } }),
      this.zoneRepo.find(),
    ]);

    return quartiers
      .map((quartier) => {
        const zone = zones.find((z) => z.id === quartier.zone_id);
        const nomNormalise = normalizeForSearch(quartier.nom);

        // Un préfixe vaut mieux qu'une occurrence au milieu du nom,
        // qui vaut elle-même mieux qu'une correspondance sur un alias.
        let score = 0;
        if (nomNormalise.startsWith(needle)) score = 3;
        else if (nomNormalise.includes(needle)) score = 2;
        else if (
          Array.isArray(quartier.alias) &&
          quartier.alias.some((al) => normalizeForSearch(al).includes(needle))
        ) {
          score = 1;
        }

        return {
          id: quartier.id,
          nom: quartier.nom,
          slug: quartier.slug,
          zone_code: zone ? zone.code : null,
          livraison_disponible: zone ? zone.livraison_disponible : false,
          latitude: quartier.latitude,
          longitude: quartier.longitude,
          score,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.nom.localeCompare(b.nom))
      .slice(0, 10)
      .map(({ score, ...rest }) => rest);
  }

  async simulateDelivery(dto: {
    quartier_id: string;
    panier: { produit_id: string; quantite: number }[];
    express?: boolean;
  }): Promise<DeliverySimulation> {
    // 1. Interrupteur global : permet de suspendre la livraison sans déployer.
    const regles = await this.reglesRepo.findOne({ where: { id: 'singleton' } });
    if (!regles || !regles.livraison_active) {
      return {
        mode: 'indisponible',
        frais: null,
        detail: [],
        message: 'Livraison temporairement indisponible.',
      };
    }

    // 2. Quartier et zone.
    const quartier = await this.quartierRepo.findOne({
      where: { id: dto.quartier_id, actif: true },
    });
    if (!quartier) throw new NotFoundException('Quartier introuvable.');

    const zone = await this.zoneRepo.findOne({ where: { id: quartier.zone_id } });
    if (!zone || !zone.livraison_disponible) {
      return {
        mode: 'devis',
        frais: null,
        detail: [],
        zone_code_snapshot: zone?.code,
        delai_estime: zone ? zone.delai_estime : 'sur devis',
        message:
          'Livraison par transporteur ou agence. Contactez-nous sur WhatsApp pour obtenir un devis.',
      };
    }

    // 3. Contraintes logistiques portées par les produits.
    const productIds = dto.panier.map((item) => item.produit_id);
    const products = productIds.length
      ? await this.productRepo.find({ where: { id: In(productIds) } })
      : [];

    let totalWeight = 0;
    let containsFragile = false;
    let containsColdChain = false;
    let containsNoDelivery = false;
    let cartTotalValue = 0;

    for (const item of dto.panier) {
      const p = products.find((prod) => prod.id === item.produit_id);
      if (!p) continue;
      totalWeight += p.poids_kg * item.quantite;
      if (p.est_fragile) containsFragile = true;
      if (p.necessite_chaine_froid) containsColdChain = true;
      if (!p.livraison_autorisee) containsNoDelivery = true;
      cartTotalValue += p.price * item.quantite;
    }

    if (containsNoDelivery) {
      return {
        mode: 'retrait_obligatoire',
        frais: null,
        detail: [],
        message:
          'Certains produits de votre panier imposent un retrait en boutique physique.',
      };
    }

    // 4. Choix de la boutique d'expédition selon le stock réellement disponible.
    const [activeBoutiques, stocks] = await Promise.all([
      this.boutiqueRepo.find({ where: { actif: true } }),
      this.stockRepo.find(),
    ]);

    const hasFullStock = (boutique: BoutiqueEntity) => {
      if (containsColdChain && !boutique.gere_chaine_froid) return false;
      return dto.panier.every((item) => {
        const st = stocks.find(
          (s) => s.boutique_id === boutique.id && s.produit_id === item.produit_id,
        );
        return !!st && st.quantite >= item.quantite;
      });
    };

    const storesWithFullStock = activeBoutiques.filter(hasFullStock);

    let selectedBoutique =
      activeBoutiques.find((b) => b.id === quartier.boutique_defaut_id) || activeBoutiques[0];
    let isFarBoutique = false;
    let stockNote: string | null = null;

    if (!selectedBoutique) {
      return {
        mode: 'indisponible',
        frais: null,
        detail: [],
        message: 'Aucune boutique active ne peut expédier votre commande.',
      };
    }

    if (storesWithFullStock.length > 0) {
      const defaultInStock = storesWithFullStock.find(
        (b) => b.id === quartier.boutique_defaut_id,
      );
      if (defaultInStock) {
        selectedBoutique = defaultInStock;
      } else {
        // La boutique par défaut n'a pas tout : on expédie depuis la plus proche.
        let minDistance = Infinity;
        for (const bt of storesWithFullStock) {
          const dist =
            quartier.latitude != null && quartier.longitude != null
              ? this.calculateHaversine(
                  bt.latitude,
                  bt.longitude,
                  quartier.latitude,
                  quartier.longitude,
                )
              : Infinity;
          if (dist < minDistance) {
            minDistance = dist;
            selectedBoutique = bt;
          }
        }
        if (minDistance === Infinity) selectedBoutique = storesWithFullStock[0];
        isFarBoutique = true;
      }
    } else {
      stockNote =
        'Certains articles ne sont pas en stock dans votre boutique de rattachement. Un transfert inter-boutique (+24h) sera nécessaire.';
    }

    // 5. Calcul des frais.
    const detailLines: { libelle: string; montant: number }[] = [];
    let finalFee = 0;
    let francoApplied = false;

    if (regles.seuil_franco > 0 && cartTotalValue >= regles.seuil_franco) {
      francoApplied = true;
      detailLines.push({ libelle: 'Livraison offerte (seuil franco atteint)', montant: 0 });
    } else {
      const customRate = await this.tarifLivraisonRepo.findOne({
        where: { boutique_id: selectedBoutique.id, zone_id: zone.id, actif: true },
      });
      const baseFee = customRate ? customRate.montant : TARIF_BASE_PAR_DEFAUT;
      detailLines.push({
        libelle: `Tarif de base (${zone.libelle}) depuis ${selectedBoutique.nom}`,
        montant: baseFee,
      });
      finalFee = baseFee;

      if (totalWeight > regles.poids_inclus_kg) {
        const kgSup = Math.ceil(totalWeight - regles.poids_inclus_kg);
        const montant = kgSup * regles.prix_par_kg_supplementaire;
        detailLines.push({ libelle: `Surcharge poids (${kgSup} kg sup.)`, montant });
        finalFee += montant;
      }

      if (containsFragile) {
        detailLines.push({
          libelle: 'Supplément matériel fragile',
          montant: regles.supplement_fragile,
        });
        finalFee += regles.supplement_fragile;
      }

      if (containsColdChain) {
        detailLines.push({
          libelle: 'Supplément chaîne du froid',
          montant: regles.supplement_chaine_froid,
        });
        finalFee += regles.supplement_chaine_froid;
      }

      if (dto.express) {
        detailLines.push({
          libelle: 'Supplément livraison express',
          montant: regles.supplement_express,
        });
        finalFee += regles.supplement_express;
      }

      if (isFarBoutique) {
        detailLines.push({
          libelle: 'Supplément expédition depuis une boutique éloignée',
          montant: regles.supplement_boutique_eloignee,
        });
        finalFee += regles.supplement_boutique_eloignee;
      }

      // Arrondi à la centaine supérieure : pas de monnaie en dessous de 100 FCFA.
      finalFee = Math.ceil(finalFee / 100) * 100;
    }

    return {
      mode: 'tarif',
      frais: finalFee,
      detail: detailLines,
      franco_applique: francoApplied,
      montant_restant_pour_franco: Math.max(0, regles.seuil_franco - cartTotalValue),
      boutique_expedition: { id: selectedBoutique.id, nom: selectedBoutique.nom },
      zone_code_snapshot: zone.code,
      delai_estime: zone.delai_estime,
      message: stockNote,
    };
  }

  /**
   * Disponibilité par boutique pour un panier donné.
   * `produits` a la forme "p1:2,p7:1".
   */
  async getBoutiqueAvailability(produitsParam: string) {
    if (!produitsParam) return [];

    const items = produitsParam
      .split(',')
      .map((entry) => {
        const [id, qty] = entry.split(':');
        return { id: (id || '').trim(), qty: Math.max(1, Number(qty) || 1) };
      })
      .filter((item) => item.id);

    if (items.length === 0) return [];

    const [activeBoutiques, stocks] = await Promise.all([
      this.boutiqueRepo.find({ where: { actif: true }, order: { ordre_affichage: 'ASC' } }),
      this.stockRepo.find(),
    ]);

    const { jour, heure } = this.heureLocaleDouala();

    return activeBoutiques.map((bt) => {
      const availableCount = items.filter((item) => {
        const st = stocks.find((s) => s.boutique_id === bt.id && s.produit_id === item.id);
        return !!st && st.quantite >= item.qty;
      }).length;

      const disponibilite =
        availableCount === items.length
          ? 'disponible'
          : availableCount > 0
            ? 'partielle'
            : 'indisponible';

      const todayHours = bt.horaires ? bt.horaires[jour] : null;
      const ouvert =
        !!todayHours?.ouv && !!todayHours?.fer && heure >= todayHours.ouv && heure <= todayHours.fer;

      return {
        id: bt.id,
        nom: bt.nom,
        code: bt.code,
        quartier: bt.quartier,
        point_repere: bt.point_repere,
        telephone: bt.telephone,
        whatsapp: bt.whatsapp,
        latitude: bt.latitude,
        longitude: bt.longitude,
        disponibilite,
        items_disponibles: `${availableCount}/${items.length}`,
        ouvert_maintenant: ouvert,
        horaires_aujourdhui: todayHours ? `${todayHours.ouv} - ${todayHours.fer}` : 'Fermé',
      };
    });
  }

  async getBoutiqueItinerary(id: string, fromLat?: number, fromLng?: number) {
    const boutique = await this.boutiqueRepo.findOne({ where: { id, actif: true } });
    if (!boutique) throw new NotFoundException('Boutique introuvable.');

    const hasOrigin = Number.isFinite(fromLat) && Number.isFinite(fromLng);

    return {
      boutique: { id: boutique.id, nom: boutique.nom },
      google_maps: `https://www.google.com/maps/dir/?api=1&destination=${boutique.latitude},${boutique.longitude}&travelmode=driving`,
      waze: `https://waze.com/ul?ll=${boutique.latitude},${boutique.longitude}&navigate=yes`,
      distance_km: hasOrigin
        ? Math.round(
            this.calculateHaversine(
              fromLat as number,
              fromLng as number,
              boutique.latitude,
              boutique.longitude,
            ) * 10,
          ) / 10
        : null,
      point_repere: boutique.point_repere,
      telephone: boutique.telephone,
    };
  }

  /** Yaoundé est en UTC+1 toute l'année (pas d'heure d'été). */
  private heureLocaleDouala(): { jour: string; heure: string } {
    const nowUtcMs = Date.now();
    const local = new Date(nowUtcMs + 3600 * 1000);
    const jours = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
    const hh = String(local.getUTCHours()).padStart(2, '0');
    const mm = String(local.getUTCMinutes()).padStart(2, '0');
    return { jour: jours[local.getUTCDay()], heure: `${hh}:${mm}` };
  }
}
