import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { SimulateDeliveryDto } from './dto/simulate-delivery.dto';

@Controller()
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('quartiers')
  searchQuartiers(@Query('q') q: string) {
    return this.deliveryService.searchQuartiers(q);
  }

  /**
   * Règles de livraison publiques (seuil franco, suppléments…).
   * Le frontend les affiche au lieu de dupliquer les montants en dur.
   */
  @Get('livraison/regles')
  getRules() {
    return this.deliveryService.getPublicRules();
  }

  @Post('livraison/simuler')
  simulateDelivery(@Body() dto: SimulateDeliveryDto) {
    return this.deliveryService.simulateDelivery(dto);
  }

  @Get('boutiques')
  listBoutiques() {
    return this.deliveryService.listBoutiques();
  }

  @Get('boutiques/disponibilite')
  getBoutiqueAvailability(@Query('produits') produits: string) {
    return this.deliveryService.getBoutiqueAvailability(produits);
  }

  @Get('boutiques/:id/itineraire')
  getBoutiqueItinerary(
    @Param('id') id: string,
    @Query('from_lat') fromLat?: string,
    @Query('from_lng') fromLng?: string,
  ) {
    return this.deliveryService.getBoutiqueItinerary(
      id,
      fromLat ? Number(fromLat) : undefined,
      fromLng ? Number(fromLng) : undefined,
    );
  }
}
