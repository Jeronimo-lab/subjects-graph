import { describe, it, expect } from 'vitest';
import { Graph } from '../docs/graph.js';

// Mock drawer that collects all shapes
function createMockDrawer() {
  const shapes = {
    circles: [],
    diamonds: [],
    arrows: [],
  };

  return {
    shapes,
    drawCircle(params) {
      shapes.circles.push(params);
    },
    drawDiamond(params) {
      shapes.diamonds.push(params);
    },
    drawArrow(params) {
      shapes.arrows.push(params);
    },
  };
}

// Minimal config for tests
const config = {
  statuses: [
    { id: 'INACTIVE', name: 'Inactiva', color: '#111827' },
    { id: 'APPROVED', name: 'Aprobada', color: '#3b82f6' },
  ],
  availabilities: [
    { id: 'INACTIVE', name: 'No disponible', color: '#323b48' },
    { id: 'APPROVED', name: 'Disponible', color: '#387dd9' },
  ],
};

describe('Graph', () => {
  it('renders two subjects linked by an arrow', () => {
    const subjects = [
      {
        id: 'A',
        name: 'Subject A',
        status: 'APPROVED',
        prerequisites: [],
        position: { x: 0, y: 0 },
      },
      {
        id: 'B',
        name: 'Subject B',
        status: 'INACTIVE',
        prerequisites: [
          {
            availabilityId: 'APPROVED',
            dependencies: [{ statusId: 'APPROVED', subjects: ['A'] }],
          },
        ],
        position: { x: 100, y: 0 },
      },
    ];

    const graph = new Graph(config, subjects, []);
    const drawer = createMockDrawer();
    graph.render(drawer);

    // Should draw 2 circles (one per subject)
    expect(drawer.shapes.circles).toHaveLength(2);
    expect(drawer.shapes.circles).toContainEqual({
      label: 'A',
      tooltip: 'Subject A',
      position: { x: 0, y: 0 },
      fillColor: '#3b82f6',
      borderColor: '#387dd9',
    });
    expect(drawer.shapes.circles).toContainEqual({
      label: 'B',
      tooltip: 'Subject B',
      position: { x: 100, y: 0 },
      fillColor: '#111827',
      borderColor: '#387dd9',
    });

    // Should draw 1 arrow from A to B
    expect(drawer.shapes.arrows).toHaveLength(1);
    expect(drawer.shapes.arrows).toContainEqual({
      id: 'A-B',
      from: 'A',
      to: 'B',
      color: '#387dd9',
    });
  });
});
