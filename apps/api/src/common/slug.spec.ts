import { normalizeForSearch, slugify } from './slug';

describe('slugify', () => {
  it('supprime les accents et normalise la casse', () => {
    expect(slugify('Ngoa-Ekellé')).toBe('ngoa-ekelle');
    expect(slugify('Périphérie')).toBe('peripherie');
    expect(slugify('Concentrateur d’oxygène')).toBe('concentrateur-d-oxygene');
  });

  it('ne laisse ni tiret en tête ni en fin', () => {
    expect(slugify('  Mvog-Mbi  ')).toBe('mvog-mbi');
    expect(slugify('--Odza--')).toBe('odza');
  });
});

describe('normalizeForSearch', () => {
  it('rend équivalentes les graphies d’un même quartier', () => {
    const attendu = normalizeForSearch('Ngoa-Ekellé');
    expect(normalizeForSearch('ngoa ekelle')).toBe(attendu);
    expect(normalizeForSearch('NGOA-EKELLE')).toBe(attendu);
    expect(normalizeForSearch('Ngoa   Ekéllé')).toBe(attendu);
  });

  it('supprime toute ponctuation', () => {
    expect(normalizeForSearch("Biyem-Assi")).toBe('biyemassi');
    expect(normalizeForSearch('Etoug Ebe')).toBe('etougebe');
  });
});
