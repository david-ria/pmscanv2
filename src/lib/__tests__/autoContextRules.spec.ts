import { describe, it, expect } from 'vitest';
import { evaluateAutoContextRules, AutoContextConfig, AutoContextEvaluationData } from '../autoContextConfig';

const baseData: AutoContextEvaluationData = {
  wifi: { home: false, work: false, known: false, currentSSID: null, previousSSID: null },
  location: { insideHome: false, insideWork: false, gpsQuality: 'good' },
  movement: { speed: 0, isMoving: false, walkingSignature: false },
  time: { currentHour: 12, isWeekend: false },
  connectivity: { cellularSignal: true, carBluetooth: false },
  weather: { main: 'Clear', temperature: 20, humidity: 50 },
  context: { latestContext: '' },
};

const rules = AutoContextConfig.getAllRules();

describe('AutoContext Rules — core scenarios', () => {
  it('Feu rouge: reste Driving sans marche', () => {
    const data: AutoContextEvaluationData = {
      ...baseData,
      context: { latestContext: 'Driving' },
      movement: { speed: 2, isMoving: false, walkingSignature: false },
      location: { ...baseData.location, gpsQuality: 'good' }
    };
    const result = evaluateAutoContextRules(rules, data);
    expect(result).toBe('Driving');
  });

  it('Sortie de voiture: bascule vers Walking quand marche détectée', () => {
    const data: AutoContextEvaluationData = {
      ...baseData,
      context: { latestContext: 'Driving' },
      movement: { speed: 4, isMoving: true, walkingSignature: true },
    };
    const result = evaluateAutoContextRules(rules, data);
    expect(result).toBe('Outdoor walking');
  });

  it('Jogging 9-12 km/h: marche détectée => Jogging', () => {
    const data: AutoContextEvaluationData = {
      ...baseData,
      movement: { speed: 10, isMoving: true, walkingSignature: true },
    };
    const result = evaluateAutoContextRules(rules, data);
    expect(result).toBe('Outdoor jogging');
  });

  it('Cyclisme 15-20 km/h: pas de marche => Cycling', () => {
    const data: AutoContextEvaluationData = {
      ...baseData,
      movement: { speed: 18, isMoving: true, walkingSignature: false },
    };
    const result = evaluateAutoContextRules(rules, data);
    expect(result).toBe('Outdoor cycling');
  });

  it('Bouchon 3–8 km/h: contexte Driving + pas de marche => Driving', () => {
    const data: AutoContextEvaluationData = {
      ...baseData,
      context: { latestContext: 'Driving' },
      movement: { speed: 6, isMoving: true, walkingSignature: false },
    };
    const result = evaluateAutoContextRules(rules, data);
    expect(result).toBe('Driving');
  });

  it('Sans accéléro (walkingSignature undefined): fallback vitesse-seule', () => {
    const data: AutoContextEvaluationData = {
      ...baseData,
      movement: { speed: 9, isMoving: true, walkingSignature: undefined },
      location: { ...baseData.location, gpsQuality: 'good' }
    };
    const result = evaluateAutoContextRules(rules, data);
    // Should fallback to outdoor cycling based on speed alone
    expect(typeof result).toBe('string');
    expect(result).toBe('Outdoor cycling');
  });

  it('High speed driving > 30 km/h', () => {
    const data: AutoContextEvaluationData = {
      ...baseData,
      movement: { speed: 35, isMoving: true, walkingSignature: false },
    };
    const result = evaluateAutoContextRules(rules, data);
    expect(result).toBe('Driving');
  });

  it('Medium speed driving 20-30 km/h', () => {
    const data: AutoContextEvaluationData = {
      ...baseData,
      movement: { speed: 25, isMoving: true, walkingSignature: false },
    };
    const result = evaluateAutoContextRules(rules, data);
    expect(result).toBe('Driving');
  });

  it('Car bluetooth connected should trigger driving', () => {
    const data: AutoContextEvaluationData = {
      ...baseData,
      connectivity: { ...baseData.connectivity, carBluetooth: true },
      movement: { speed: 10, isMoving: true, walkingSignature: false },
    };
    const result = evaluateAutoContextRules(rules, data);
    expect(result).toBe('Driving');
  });

  it('Walking speed with walking signature', () => {
    const data: AutoContextEvaluationData = {
      ...baseData,
      movement: { speed: 5, isMoving: true, walkingSignature: true },
    };
    const result = evaluateAutoContextRules(rules, data);
    expect(result).toBe('Outdoor walking');
  });

  it('Walking speed without walking signature should not match walking rule', () => {
    const data: AutoContextEvaluationData = {
      ...baseData,
      movement: { speed: 5, isMoving: true, walkingSignature: false },
    };
    const result = evaluateAutoContextRules(rules, data);
    // Should not match walking rule due to lack of walking signature
    expect(result).not.toBe('Outdoor walking');
  });

  it('Cycling speed with walking signature should prefer jogging over cycling', () => {
    const data: AutoContextEvaluationData = {
      ...baseData,
      movement: { speed: 12, isMoving: true, walkingSignature: true },
    };
    const result = evaluateAutoContextRules(rules, data);
    // Should match jogging rule (higher priority and has walking signature)
    expect(result).toBe('Outdoor jogging');
  });

  it('Driving sticky rule prevents switching to walking without walking signature', () => {
    const data: AutoContextEvaluationData = {
      ...baseData,
      context: { latestContext: 'Driving' },
      movement: { speed: 8, isMoving: true, walkingSignature: false },
    };
    const result = evaluateAutoContextRules(rules, data);
    expect(result).toBe('Driving');
  });

  it('Driving with walking signature should allow switching to other activities', () => {
    const data: AutoContextEvaluationData = {
      ...baseData,
      context: { latestContext: 'Driving' },
      movement: { speed: 8, isMoving: true, walkingSignature: true },
    };
    const result = evaluateAutoContextRules(rules, data);
    // Should not match driving sticky rule due to walking signature
    expect(result).not.toBe('Driving');
    expect(['Outdoor walking', 'Outdoor jogging']).toContain(result);
  });
});