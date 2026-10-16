import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

const BR_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/** Adapter nativo que interpreta datas digitadas no formato brasileiro (dd/MM/aaaa). */
@Injectable()
export class PtBrDateAdapter extends NativeDateAdapter {
  override parse(value: unknown, parseFormat?: object): Date | null {
    if (typeof value === 'string') {
      const match = BR_DATE.exec(value.trim());
      if (match) {
        const [, day, month, year] = match.map(Number);
        const date = new Date(year, month - 1, day);
        date.setFullYear(year);
        const exists = date.getDate() === day && date.getMonth() === month - 1;
        return exists ? date : this.invalid();
      }
      if (value.trim() === '') return null;
      return this.invalid();
    }
    return super.parse(value, parseFormat);
  }

  override getFirstDayOfWeek(): number {
    return 0;
  }
}
