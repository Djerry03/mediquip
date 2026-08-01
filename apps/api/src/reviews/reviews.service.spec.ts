import { ReviewsService } from './reviews.service';

/**
 * `displayName` est privée mais porte une règle de confidentialité :
 * on la teste directement plutôt que de la deviner à travers l'API.
 */
const displayName = (fullName: string): string =>
  (ReviewsService.prototype as any).displayName.call(null, fullName);

describe('ReviewsService — anonymisation du nom publié', () => {
  it('ne publie que le prénom et l’initiale du dernier nom', () => {
    expect(displayName('Ariane Ngo Bell')).toBe('Ariane B.');
    expect(displayName('Jean-Paul Mbarga')).toBe('Jean-Paul M.');
  });

  it('laisse un prénom seul intact', () => {
    expect(displayName('Ariane')).toBe('Ariane');
  });

  it('tolère les espaces superflus', () => {
    expect(displayName('   Paul   Etoa   ')).toBe('Paul E.');
  });

  it('ne casse pas sur une chaîne vide', () => {
    expect(displayName('   ')).toBe('Client');
  });
});
