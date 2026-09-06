import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ModeReception } from '../../entities/order.entity';
import { CreateOrderDto } from './create-order.dto';

const baseOrder = {
  clientName: 'Amina Ndzi',
  phone: '699123456',
  items: [{ productId: 'thermometre', qty: 1 }],
  mode_reception: ModeReception.LIVRAISON,
  quartier_id: '0d0960ee-5bc4-4e17-bd94-101c29d78355',
  point_repere_client: 'Face à la pharmacie',
};

async function validationErrors(input: Record<string, unknown>) {
  return validate(plainToInstance(CreateOrderDto, input));
}

describe('CreateOrderDto — clé d’idempotence', () => {
  it('accepte une clé UUID v4 créée pour la tentative de commande', async () => {
    const errors = await validationErrors({
      ...baseOrder,
      idempotenceKey: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    });

    expect(errors).toHaveLength(0);
  });

  it('refuse une clé absente ou dérivée du contenu du panier', async () => {
    const absent = await validationErrors(baseOrder);
    const derived = await validationErrors({
      ...baseOrder,
      idempotenceKey: 'guest#699123456#livraison#thermometre:1',
    });

    expect(absent.some((error) => error.property === 'idempotenceKey')).toBe(true);
    expect(derived.some((error) => error.property === 'idempotenceKey')).toBe(true);
  });
});
