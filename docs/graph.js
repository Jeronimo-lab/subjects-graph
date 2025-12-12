/**
 * @typedef {string} AvailabilityId
 *
 * @typedef {string} StatusId
 *
 * @typedef {object} Subject
 * @property {string} id
 * @property {string} name
 * @property {StatusId} status
 * @property {Array<Prerequisite>} prerequisites
 *
 * @typedef {object} Prerequisite
 * @property {AvailabilityId} availabilityId
 * @property {Array<Dependency>} dependencies
 *
 * @typedef {object} Dependency
 * @property {StatusId} statusId
 * @property {Array<string>} subjects
 *
 * @typedef {object} Edge
 * @property {string} id
 * @property {Array<string>} dependencies
 * @property {Array<string>} targets
 *
 * @typedef {object} Config
 * @property {Array<Status>} statuses
 * @property {Array<Availability>} availabilities
 *
 * @typedef {object} Status
 * @property {StatusId} id
 * @property {string} name
 * @property {string} color
 *
 * @typedef {object} Availability
 * @property {AvailabilityId} id
 * @property {string} name
 * @property {string} color
 */

class Graph {
  /** @type {Map<string, SubjectNode>} */
  #subjects;

  /** @type {Map<string, EdgeNode>} */
  #edges;

  constructor() {
    this.#subjects = new Map();
    this.#edges = new Map();
  }

  get #nodes() {
    return [...this.#subjects.values(), ...this.#edges.values()];
  }

  /**
   * Creates and adds a subject node to the graph.
   * @param {Subject} subject
   * @return {SubjectNode}
   */
  addSubject(subject) {
    if (!this.#subjects.has(subject.id)) {
      this.#subjects.set(subject.id, new SubjectNode(subject));
    }
    return this.#subjects.get(subject.id);
  }

  /**
   * Creates and adds an edge node.
   * @param {Edge} edge
   * @return {EdgeNode}
   */
  addEdge(edge) {
    if (!this.#edges.has(edge.id)) {
      this.#edges.set(edge.id, new EdgeNode(edge));
    }
    return this.#edges.get(edge.id);
  }

  /**
   * Calculates all dependencies in the graph based on subjects and edges.
   */
  calculateDependencies() {
    for (const node of this.#nodes) {
      node.calculateDependencies(this);
    }
    for (const node of this.#nodes) {
      node.simplifyTransitiveDependencies();
    }
  }

  /**
   * Gets a node by its ID.
   * @param {string} id
   * @return {AbstractNode | null}
   */
  getNodeById(id) {
    if (this.#subjects.has(id)) {
      return this.#subjects.get(id);
    }
    if (this.#edges.has(id)) {
      return this.#edges.get(id);
    }
    return null;
  }
}

/**
 * @abstract
 */
class AbstractNode {
  /** @type {Set<Link>} */
  #dependencies;

  constructor() {
    if (new.target === AbstractNode) {
      throw new TypeError('Cannot instantiate AbstractNode');
    }
    this.#dependencies = new Set();
  }

  /**
   * Simplifies graph by removing redundant direct dependencies.
   * A direct dependency is considered redundant if there exists an indirect
   * path to the same target node.
   */
  simplifyTransitiveDependencies() {
    for (const link of this.#dependencies) {
      // Temporarily remove the link
      this.#dependencies.delete(link);
      if (this.#dependsOn(link.from)) {
        continue; // This link is redundant
      }
      this.#dependencies.add(link); // Keep the link if it's not redundant
    }
  }

  /**
   * @param {AbstractNode} node
   * @param {Set<AbstractNode>} [visited=new Set()]
   * @returns {boolean}
   */
  #dependsOn(node, visited = new Set()) {
    if (this === target) return true;
    if (visited.has(this)) return false;
    visited.add(this);
    return Array.from(this.#dependencies).some(link => link.from.#dependsOn(node, visited));
  }

  /**
   * @param {string} subjectId
   * @param {StatusId} statusId
   * @returns {boolean}
   */
  hasDependency(subjectId, statusId) {
    return Array.from(this.#dependencies)
      .some(link => link.from.hasDependency(subjectId, statusId));
  }

  /**
   * @param {AbstractNode} node
   * @protected
   */
  _addDependency(node) {
    this.#dependencies.add(new Link(node, this));
  }
}

class SubjectNode extends AbstractNode {
  /** @type {Subject} */
  #data;

  /** @param {Subject} data */
  constructor(data) {
    super();
    this.#data = data;
  }

  /**
   * @param {Graph} graph
   */
  calculateDependencies(graph) {
    this.#data.prerequisites
      .flatMap(prerequisite => prerequisite.dependencies)
      .flatMap(dependency => dependency.subjects)
      .forEach(subjectId => {
        const targetNode = graph.getNodeById(subjectId);
        if (targetNode) {
          this._addDependency(targetNode);
        } else {
          log.warn(`Subject with ID ${subjectId} not found in graph.`);
        }
      });
  }

  /**
   * @param {AvailabilityId}
   */
  satisfies(availabilityId) {
    const prerequisite = this.#data.prerequisites
      .find(p => p.availabilityId === availabilityId);

    if (!prerequisite) {
      return true;
    }

    return prerequisite.dependencies.every(d =>
      d.subjects.every(subjectId => this.hasDependency(subjectId, d.statusId))
    );
  }

  /**
   * @param {string} subjectId
   * @param {StatusId} statusId
   * @returns {boolean}
   */
  hasDependency(subjectId, statusId) {
    if (this.#data.id === subjectId) {
      return this.#data.status === statusId;
    }
    return super.hasDependency(subjectId, statusId);
  }
}

class EdgeNode extends AbstractNode {
  /** @type {Edge} */
  #data;

  /** @type {Set<AbstractNode>} */
  #targets;

  /**
   * @param {Edge} data
   */
  constructor(data) {
    super();
    this.#data = data;
    this.#targets = new Set();
  }

  /**
   * @param {Graph} graph
   */
  calculateDependencies(graph) {
    this.#data.dependencies.forEach(sourceId => {
      const sourceNode = graph.getNodeById(sourceId);
      if (sourceNode) {
        this._addDependency(sourceNode);
      } else {
        log.warn(`Edge dependency with ID ${sourceId} not found in graph.`);
      }
    });
    this.#data.targets.forEach(targetId => {
      const targetNode = graph.getNodeById(targetId);
      if (targetNode) {
        this.#targets.add(targetNode);
      } else {
        log.warn(`Edge target with ID ${targetId} not found in graph.`);
      }
    });
  }
}

class Link {
  /** @type {AbstractNode} */
  from;

  /** @type {AbstractNode} */
  #to;

  /**
   * Creates a link between two nodes.
   * The drawn arrow points from 'from' dependency to 'to' target.
   * @param {AbstractNode} from
   * @param {AbstractNode} to
   */
  constructor(from, to) {
    this.from = from;
    this.#to = to;
  }
}
