import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ProductEntity } from '../entities/product.entity';
import { BoutiqueEntity } from '../entities/boutique.entity';
import { ZoneEntity } from '../entities/zone.entity';
import { QuartierEntity } from '../entities/quartier.entity';
import { TarifLivraisonEntity } from '../entities/tarif-livraison.entity';
import { ReglesLivraisonEntity } from '../entities/regles-livraison.entity';
import { StockEntity } from '../entities/stock.entity';
import { UserEntity, UserRole } from '../entities/user.entity';
import { slugify } from '../common/slug';
import { PRODUCT_SEED } from '../data/products.seed';
import {
  BOUTIQUES_SEED,
  ZONES_SEED,
  TARIFS_DEF_FCFA,
  REGLES_DEFAULT,
  QUARTIERS_SEED,
} from '../data/delivery.seed';

/**
 * Amorçage de la base au premier démarrage.
 *
 * Chaque étape est idempotente : elle ne s'exécute que si la table
 * correspondante est vide, sauf le compte administrateur qui est
 * réconcilié à chaque démarrage à partir des variables d'environnement.
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(BoutiqueEntity)
    private readonly boutiqueRepository: Repository<BoutiqueEntity>,
    @InjectRepository(ZoneEntity)
    private readonly zoneRepository: Repository<ZoneEntity>,
    @InjectRepository(QuartierEntity)
    private readonly quartierRepository: Repository<QuartierEntity>,
    @InjectRepository(TarifLivraisonEntity)
    private readonly tarifLivraisonRepository: Repository<TarifLivraisonEntity>,
    @InjectRepository(ReglesLivraisonEntity)
    private readonly reglesLivraisonRepository: Repository<ReglesLivraisonEntity>,
    @InjectRepository(StockEntity)
    private readonly stockRepository: Repository<StockEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedProducts();
    await this.seedBoutiques();
    await this.seedZones();
    await this.seedReglesLivraison();
    await this.seedQuartiers();
    await this.seedTarifs();
    await this.seedStocks();
    await this.ensureAdminUser();
  }

  private async seedProducts() {
    if ((await this.productRepository.count()) > 0) return;
    this.logger.log(`Amorçage de ${PRODUCT_SEED.length} produit(s).`);
    await this.productRepository.save(
      PRODUCT_SEED.map((p) => this.productRepository.create({ ...p, actif: true })),
    );
  }

  private async seedBoutiques() {
    if ((await this.boutiqueRepository.count()) > 0) return;
    this.logger.log('Amorçage des boutiques.');
    await this.boutiqueRepository.save(BOUTIQUES_SEED);
  }

  private async seedZones() {
    if ((await this.zoneRepository.count()) > 0) return;
    this.logger.log('Amorçage des zones.');
    await this.zoneRepository.save(ZONES_SEED);
  }

  private async seedReglesLivraison() {
    if ((await this.reglesLivraisonRepository.count()) > 0) return;
    this.logger.log('Amorçage des règles de livraison.');
    await this.reglesLivraisonRepository.save(REGLES_DEFAULT);
  }

  private async seedQuartiers() {
    if ((await this.quartierRepository.count()) > 0) return;
    this.logger.log('Amorçage des quartiers.');

    const zones = await this.zoneRepository.find();
    const boutiques = await this.boutiqueRepository.find();

    const quartiers = QUARTIERS_SEED.map((q) => {
      const zone = zones.find((z) => z.code === q.zone);
      const boutique = boutiques.find((b) => b.code === q.boutique_defaut);
      return {
        nom: q.nom,
        slug: slugify(q.nom),
        alias: (q as any).alias || [],
        zone_id: zone ? zone.id : '',
        boutique_defaut_id: boutique ? boutique.id : '',
        latitude: q.lat,
        longitude: q.lng,
        actif: true,
      };
    });

    await this.quartierRepository.save(quartiers);
  }

  private async seedTarifs() {
    if ((await this.tarifLivraisonRepository.count()) > 0) return;
    this.logger.log('Amorçage de la matrice tarifaire boutique × zone.');

    const boutiques = await this.boutiqueRepository.find();
    const zones = await this.zoneRepository.find();

    const tarifs = boutiques.flatMap((boutique) =>
      zones.map((zone) => ({
        boutique_id: boutique.id,
        zone_id: zone.id,
        montant: TARIFS_DEF_FCFA[zone.code as keyof typeof TARIFS_DEF_FCFA] ?? 0,
        actif: true,
      })),
    );

    await this.tarifLivraisonRepository.save(tarifs);
  }

  /**
   * Stocks de départ volontairement inégaux entre boutiques : cela exerce
   * la logique de routage (boutique par défaut → boutique la plus proche
   * → transfert inter-boutique) du service de livraison.
   */
  private async seedStocks() {
    if ((await this.stockRepository.count()) > 0) return;
    this.logger.log('Amorçage des stocks par boutique.');

    const boutiques = await this.boutiqueRepository.find();
    const products = await this.productRepository.find();

    const quantiteParBoutique = (codeBoutique: string, produitId: string): number => {
      switch (codeBoutique) {
        // Ngousso est l'entrepôt principal : tout y est disponible.
        case 'NGOUSSO':
          return 10;
        case 'MELEN':
          return ['p2', 'p4', 'p7', 'p8', 'p9'].includes(produitId) ? 12 : 0;
        case 'CRADAT':
          return ['p1', 'p3', 'p6', 'p10', 'pack-cabinet'].includes(produitId) ? 15 : 0;
        default:
          return 0;
      }
    };

    const stocks = products.flatMap((product) =>
      boutiques.map((boutique) => ({
        produit_id: product.id,
        boutique_id: boutique.id,
        quantite: quantiteParBoutique(boutique.code, product.id),
      })),
    );

    await this.stockRepository.save(stocks);
  }

  /**
   * Crée (ou remet à jour) le compte administrateur à partir de
   * ADMIN_EMAIL / ADMIN_PASSWORD. Aucun identifiant n'est codé en dur :
   * si la variable manque, aucun compte admin n'est créé.
   */
  private async ensureAdminUser() {
    const email = this.config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!email || !password) {
      this.logger.warn(
        'ADMIN_EMAIL / ADMIN_PASSWORD absents : aucun compte administrateur créé.',
      );
      return;
    }

    if (password === 'change-me-before-production') {
      this.logger.warn(
        'ADMIN_PASSWORD est resté à sa valeur par défaut. Changez-le avant toute mise en ligne.',
      );
    }

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      if (existing.role !== UserRole.ADMIN) {
        existing.role = UserRole.ADMIN;
        await this.userRepository.save(existing);
      }
      return;
    }

    await this.userRepository.save(
      this.userRepository.create({
        email,
        passwordHash: await bcrypt.hash(password, 12),
        fullName: 'Administrateur Mediquipe',
        role: UserRole.ADMIN,
        emailVerified: true,
      }),
    );
    this.logger.log(`Compte administrateur créé : ${email}`);
  }
}
