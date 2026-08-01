import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsAdminService } from './products.admin.service';
import { AdjustStockDto, CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { UserRole } from '../entities/user.entity';
import { ProductEntity } from '../entities/product.entity';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly admin: ProductsAdminService,
  ) {}

  @Get()
  findAll(): Promise<ProductEntity[]> {
    return this.products.findAll();
  }

  // Doit précéder `:id`, sinon « admin » serait interprété comme un identifiant.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin')
  findAllForAdmin() {
    return this.admin.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.admin.create(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProductEntity> {
    const product = await this.products.findOne(id);
    if (!product) throw new NotFoundException('Produit introuvable.');
    return product;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.admin.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.admin.deactivate(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id/stock')
  stock(@Param('id') id: string) {
    return this.admin.stockFor(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
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
