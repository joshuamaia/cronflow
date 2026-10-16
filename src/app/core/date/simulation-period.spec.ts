import { TestBed } from '@angular/core/testing';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { PtBrDateAdapter } from './pt-br-date-adapter';
import { addDays, getLocalTimeZone, resolvePeriod } from './simulation-period';

describe('resolvePeriod', () => {
  it('usa o início do dia inicial e o fim do dia final (inclusivos)', () => {
    const result = resolvePeriod(new Date(2026, 9, 16, 15, 42), new Date(2026, 9, 20, 3, 0));
    expect(result).toEqual({
      valid: true,
      startMs: new Date(2026, 9, 16, 0, 0, 0, 0).getTime(),
      endMs: new Date(2026, 9, 20, 23, 59, 59, 999).getTime(),
    });
  });

  it('aceita data final igual à inicial', () => {
    expect(resolvePeriod(new Date(2026, 9, 16), new Date(2026, 9, 16)).valid).toBe(true);
  });

  it('rejeita data final anterior à inicial', () => {
    expect(resolvePeriod(new Date(2026, 9, 16), new Date(2026, 9, 15))).toEqual({
      valid: false,
      message: 'A data final deve ser maior ou igual à data inicial.',
    });
  });

  it('rejeita datas ausentes ou inválidas', () => {
    expect(resolvePeriod(null, new Date()).valid).toBe(false);
    expect(resolvePeriod(new Date(Number.NaN), new Date()).valid).toBe(false);
  });

  it('rejeita períodos fora dos limites suportados', () => {
    expect(resolvePeriod(new Date(2026, 9, 16), new Date(3026, 9, 16)).valid).toBe(false);
    expect(resolvePeriod(new Date(1969, 11, 31), new Date(2026, 0, 1)).valid).toBe(false);
    expect(resolvePeriod(new Date(2000, 0, 1), new Date(2999, 11, 31)).valid).toBe(true);
  });

  it('soma dias atravessando meses', () => {
    expect(addDays(new Date(2026, 9, 16), 30)).toEqual(new Date(2026, 10, 15));
  });

  it('identifica o fuso horário local', () => {
    const zone = getLocalTimeZone(new Date(2026, 9, 16));
    expect(zone.name.length).toBeGreaterThan(0);
    expect(zone.offset).toMatch(/^GMT[+-]\d{2}:\d{2}$/);
  });
});

describe('PtBrDateAdapter', () => {
  let adapter: PtBrDateAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PtBrDateAdapter, { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' }],
    });
    adapter = TestBed.inject(PtBrDateAdapter);
  });

  it('interpreta datas no formato dd/mm/aaaa', () => {
    expect(adapter.parse('16/10/2026')).toEqual(new Date(2026, 9, 16));
    expect(adapter.parse('1/2/2028')).toEqual(new Date(2028, 1, 1));
  });

  it('marca datas inexistentes como inválidas', () => {
    const parsed = adapter.parse('31/02/2027');
    expect(parsed).not.toBeNull();
    expect(adapter.isValid(parsed!)).toBe(false);
  });

  it('retorna null para texto vazio', () => {
    expect(adapter.parse('')).toBeNull();
  });
});
