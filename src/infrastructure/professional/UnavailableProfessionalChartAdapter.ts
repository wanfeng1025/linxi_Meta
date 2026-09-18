import type { ProfessionalChartAvailability, ProfessionalChartPagePort } from '@/application/page';

export class UnavailableProfessionalChartAdapter implements ProfessionalChartPagePort {
  public getAvailability(sessionId: string): ProfessionalChartAvailability {
    if (sessionId.trim().length === 0) {
      throw new Error('Professional chart availability requires a stable session ID.');
    }
    return {
      status: 'unavailable',
      adapterVersion: 'professional-chart-unavailable-adapter-v1',
      reason: '生产规则包、历法实现和双人金标准尚未满足发布门禁，因此不生成专业排盘字段。',
      missingCapabilities: [
        '八宫与世应生产规则',
        '纳甲、六亲与六神生产规则',
        '固定版本历法与日月状态',
        '旺衰、用神与动变金标准',
      ],
      confirmedFields: ['primaryHexagram', 'changedHexagram', 'movingLines'],
    };
  }
}
