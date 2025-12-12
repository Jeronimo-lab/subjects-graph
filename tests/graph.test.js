import { describe, it, expect } from 'vitest';
import { Graph } from '../docs/graph.js';
import { config, subject, subjects, edge, statusColor, availabilityColor } from './helpers/common.js';
import { createMockDrawer } from './helpers/mockDrawer.js';

describe('Graph rendering', () => {
  it('renders two subjects linked by an arrow (I1 -> I2)', () => {
    const subjects = [
      subject('I1', 'APPROVED'),
      subject('I2', 'INACTIVE'),
    ];

    const graph = new Graph(config, subjects, []);
    const drawer = createMockDrawer();
    graph.render(drawer);

    // Should draw 2 circles (one per subject)
    expect(drawer.shapes.circles).toHaveLength(2);
    expect(drawer.shapes.circles).toContainEqual({
      label: 'I1',
      tooltip: 'Inglés I',
      position: { x: 400, y: 100 },
      fillColor: statusColor('APPROVED'),
      borderColor: availabilityColor('APPROVED'),
    });
    expect(drawer.shapes.circles).toContainEqual({
      label: 'I2',
      tooltip: 'Inglés II',
      position: { x: 500, y: 100 },
      fillColor: statusColor('INACTIVE'),
      borderColor: availabilityColor('APPROVED'),
    });

    // Should draw 1 arrow from I1 to I2
    expect(drawer.shapes.arrows).toHaveLength(1);
    expect(drawer.shapes.arrows).toContainEqual({
      id: 'I1-I2',
      from: 'I1',
      to: 'I2',
      color: availabilityColor('APPROVED'),
    });
  });
});

describe('Transitive deduplication', () => {
  // AyED -> PdP -> DDS chain
  // DDS depends on PdP (FINAL_EXAM_PENDING) and AyED (APPROVED)
  // PdP depends on AyED (FINAL_EXAM_PENDING)
  // So DDS -> AyED should be deduplicated (indirect path via PdP)

  // [AyED status, PdP status, DDS status, expected availability for each node, expected arrow colors]
  // All 27 combinations (3x3x3) based on actual graph.js implementation behavior
  const testCases = [
    // AyED=INACTIVE
    { statuses: ['INACTIVE', 'INACTIVE', 'INACTIVE'], availabilities: ['APPROVED', 'INACTIVE', 'INACTIVE'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['INACTIVE', 'INACTIVE', 'FINAL_EXAM_PENDING'], availabilities: ['APPROVED', 'INACTIVE', 'INACTIVE'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['INACTIVE', 'INACTIVE', 'APPROVED'], availabilities: ['APPROVED', 'INACTIVE', 'INACTIVE'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['INACTIVE', 'FINAL_EXAM_PENDING', 'INACTIVE'], availabilities: ['APPROVED', 'INACTIVE', 'INACTIVE'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['INACTIVE', 'FINAL_EXAM_PENDING', 'FINAL_EXAM_PENDING'], availabilities: ['APPROVED', 'INACTIVE', 'INACTIVE'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['INACTIVE', 'FINAL_EXAM_PENDING', 'APPROVED'], availabilities: ['APPROVED', 'INACTIVE', 'INACTIVE'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['INACTIVE', 'APPROVED', 'INACTIVE'], availabilities: ['APPROVED', 'INACTIVE', 'APPROVED'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['INACTIVE', 'APPROVED', 'FINAL_EXAM_PENDING'], availabilities: ['APPROVED', 'INACTIVE', 'APPROVED'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['INACTIVE', 'APPROVED', 'APPROVED'], availabilities: ['APPROVED', 'INACTIVE', 'APPROVED'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    // AyED=FINAL_EXAM_PENDING
    { statuses: ['FINAL_EXAM_PENDING', 'INACTIVE', 'INACTIVE'], availabilities: ['APPROVED', 'FINAL_EXAM_PENDING', 'INACTIVE'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['FINAL_EXAM_PENDING', 'INACTIVE', 'FINAL_EXAM_PENDING'], availabilities: ['APPROVED', 'FINAL_EXAM_PENDING', 'INACTIVE'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['FINAL_EXAM_PENDING', 'INACTIVE', 'APPROVED'], availabilities: ['APPROVED', 'FINAL_EXAM_PENDING', 'INACTIVE'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['FINAL_EXAM_PENDING', 'FINAL_EXAM_PENDING', 'INACTIVE'], availabilities: ['APPROVED', 'FINAL_EXAM_PENDING', 'INACTIVE'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['FINAL_EXAM_PENDING', 'FINAL_EXAM_PENDING', 'FINAL_EXAM_PENDING'], availabilities: ['APPROVED', 'FINAL_EXAM_PENDING', 'INACTIVE'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['FINAL_EXAM_PENDING', 'FINAL_EXAM_PENDING', 'APPROVED'], availabilities: ['APPROVED', 'FINAL_EXAM_PENDING', 'INACTIVE'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['FINAL_EXAM_PENDING', 'APPROVED', 'INACTIVE'], availabilities: ['APPROVED', 'FINAL_EXAM_PENDING', 'APPROVED'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['FINAL_EXAM_PENDING', 'APPROVED', 'FINAL_EXAM_PENDING'], availabilities: ['APPROVED', 'FINAL_EXAM_PENDING', 'APPROVED'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['FINAL_EXAM_PENDING', 'APPROVED', 'APPROVED'], availabilities: ['APPROVED', 'FINAL_EXAM_PENDING', 'APPROVED'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    // AyED=APPROVED
    { statuses: ['APPROVED', 'INACTIVE', 'INACTIVE'], availabilities: ['APPROVED', 'APPROVED', 'INACTIVE'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['APPROVED', 'INACTIVE', 'FINAL_EXAM_PENDING'], availabilities: ['APPROVED', 'APPROVED', 'INACTIVE'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['APPROVED', 'INACTIVE', 'APPROVED'], availabilities: ['APPROVED', 'APPROVED', 'INACTIVE'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['APPROVED', 'FINAL_EXAM_PENDING', 'INACTIVE'], availabilities: ['APPROVED', 'APPROVED', 'FINAL_EXAM_PENDING'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['APPROVED', 'FINAL_EXAM_PENDING', 'FINAL_EXAM_PENDING'], availabilities: ['APPROVED', 'APPROVED', 'FINAL_EXAM_PENDING'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['APPROVED', 'FINAL_EXAM_PENDING', 'APPROVED'], availabilities: ['APPROVED', 'APPROVED', 'FINAL_EXAM_PENDING'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['APPROVED', 'APPROVED', 'INACTIVE'], availabilities: ['APPROVED', 'APPROVED', 'APPROVED'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['APPROVED', 'APPROVED', 'FINAL_EXAM_PENDING'], availabilities: ['APPROVED', 'APPROVED', 'APPROVED'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
    { statuses: ['APPROVED', 'APPROVED', 'APPROVED'], availabilities: ['APPROVED', 'APPROVED', 'APPROVED'], arrowAvailabilities: { 'AyED-PdP': 'APPROVED', 'PdP-DDS': 'APPROVED' } },
  ];

  testCases.forEach(({ statuses: [ayedStatus, pdpStatus, ddsStatus], availabilities: [ayedAvail, pdpAvail, ddsAvail], arrowAvailabilities }) => {
    it(`deduplicates with AyED=${ayedStatus}, PdP=${pdpStatus}, DDS=${ddsStatus}`, () => {
      const testSubjects = subjects(
        ['AyED', ayedStatus],
        ['PdP', pdpStatus],
        ['DDS', ddsStatus],
      );

      const graph = new Graph(config, testSubjects, []);
      const drawer = createMockDrawer();
      graph.render(drawer);

      // Should draw 3 circles with correct colors
      expect(drawer.shapes.circles).toHaveLength(3);
      expect(drawer.shapes.circles).toContainEqual({
        label: 'AyED',
        tooltip: 'Algoritmos y Estructuras de Datos',
        position: { x: 100, y: 400 },
        fillColor: statusColor(ayedStatus),
        borderColor: availabilityColor(ayedAvail),
      });
      expect(drawer.shapes.circles).toContainEqual({
        label: 'PdP',
        tooltip: 'Paradigmas de Programación',
        position: { x: 200, y: 400 },
        fillColor: statusColor(pdpStatus),
        borderColor: availabilityColor(pdpAvail),
      });
      expect(drawer.shapes.circles).toContainEqual({
        label: 'DDS',
        tooltip: 'Diseño de Sistemas',
        position: { x: 400, y: 300 },
        fillColor: statusColor(ddsStatus),
        borderColor: availabilityColor(ddsAvail),
      });

      // Should draw 2 arrows with correct colors (NOT AyED -> DDS)
      expect(drawer.shapes.arrows).toHaveLength(2);
      expect(drawer.shapes.arrows).toContainEqual({
        id: 'AyED-PdP',
        from: 'AyED',
        to: 'PdP',
        color: availabilityColor(arrowAvailabilities['AyED-PdP']),
      });
      expect(drawer.shapes.arrows).toContainEqual({
        id: 'PdP-DDS',
        from: 'PdP',
        to: 'DDS',
        color: availabilityColor(arrowAvailabilities['PdP-DDS']),
      });
    });
  });
});
