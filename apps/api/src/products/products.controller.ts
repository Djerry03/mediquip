import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ProductsService } from './products.service';
import { ProductsAdminService } from './products.admin.service';
import {
  AdjustStockDto,
  CreateProductDto,
  ImportCsvDto,
  ReorderImagesDto,
  SetFeaturedDto,
  UpdateProductDto,
} from './dto/product.dto';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { UserRole } from '../entities/user.entity';
import { ProductEntity } from '../entities/product.entity';
import { MAX_IMAGE_BYTES } from '../common/image-upload';

/** Toutes les routes d'écriture exigent un administrateur authentifié. */
const AdminOnly = () => UseGuards(JwtAuthGuard, RolesGuard);

@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly admin: ProductsAdminService,
  ) {}

  // -------------------------------------------------------------- Public

  @Get()
  findAll(): Promise<ProductEntity[]> {
    return this.products.findAll();
  }

  /** Sélection vedette de l'accueil, manuelle ou automatique par défaut. */
  @Get('featured')
  findFeatured(@Query('limit') limit?: string) {
    return this.products.findFeatured(limit ? Math.min(12, Number(limit) || 4) : 4);
  }

  // --------------------------------------------------------- Back-office
  // Ces routes littérales précèdent `:id`, sinon « admin » ou « categories »
  // seraient interprétés comme des identifiants de produit.

  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Get('admin')
  findAllForAdmin() {
    return this.admin.findAll();
  }

  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Get('admin/categories')
  categories() {
    return this.admin.categories();
  }

  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Get('admin/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(@Res({ passthrough: true }) res: Response) {
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="catalogue-mediquipe-${date}.csv"`);
    return this.admin.exportCsv();
  }

  /**
   * Import en masse. `dryRun` permet de contrôler le fichier et de compter
   * les créations et mises à jour sans rien écrire.
   */
  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Post('admin/import')
  importCsv(@Body() dto: ImportCsvDto) {
    return this.admin.importCsv(dto.content, dto.dryRun === true);
  }

  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Get('admin/featured')
  featured() {
    return this.admin.featured();
  }

  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Patch('admin/featured')
  setFeatured(@Body() dto: SetFeaturedDto) {
    return this.admin.setFeatured(dto.productIds);
  }

  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.admin.create(dto);
  }

  // ---------------------------------------------------- Public par ident.

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProductEntity> {
    const product = await this.products.findOne(id);
    if (!product) throw new NotFoundException('Produit introuvable.');
    return product;
  }

  // ------------------------------------------------- Back-office par ident.

  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Get(':id/admin')
  findOneForAdmin(@Param('id') id: string) {
    return this.admin.findOne(id);
  }

  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.admin.update(id, dto);
  }

  /** Retrait du catalogue public, sans perdre l'historique des commandes. */
  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.admin.deactivate(id);
  }

  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.admin.reactivate(id);
  }

  /** Suppression définitive, refusée si le produit a déjà été commandé. */
  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Delete(':id/permanent')
  destroy(@Param('id') id: string) {
    return this.admin.destroy(id);
  }

  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }))
  addImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.admin.addImage(id, file);
  }

  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Delete(':id/images')
  removeImage(@Param('id') id: string, @Query('url') url: string) {
    return this.admin.removeImage(id, url);
  }

  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Patch(':id/images/order')
  reorderImages(@Param('id') id: string, @Body() dto: ReorderImagesDto) {
    return this.admin.reorderImages(id, dto.images);
  }

  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Get(':id/stock')
  stock(@Param('id') id: string) {
    return this.admin.stockFor(id);
  }

  @AdminOnly()
  @Roles(UserRole.ADMIN)
  @Patch(':id/stock')
  adjustStock(
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.admin.adjustStock(id, dto, admin);
  }
}
