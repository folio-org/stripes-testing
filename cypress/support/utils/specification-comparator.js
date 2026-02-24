/**
 * Utility for comparing MARC specifications and identifying differences
 * Used by the restore process to determine which resources need to be updated
 */

/**
 * Deep comparison of two objects for specific fields
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @param {Array<string>} fields - Fields to compare
 * @returns {boolean} - True if all fields match
 */
function areFieldsEqual(obj1, obj2, fields) {
  return fields.every((field) => {
    const val1 = obj1[field];
    const val2 = obj2[field];

    // Handle null/undefined
    if (val1 === val2) return true;
    if (val1 == null || val2 == null) return false;

    // Deep comparison for objects
    if (typeof val1 === 'object' && typeof val2 === 'object') {
      return JSON.stringify(val1) === JSON.stringify(val2);
    }

    return val1 === val2;
  });
}

/**
 * Get changed fields from a list
 * @param {Array} fieldsToCompare - List to compare
 * @returns {Object} - Object with changed fields properties
 */
function getChangedFields(originalFields, currentFields) {
  const changes = {};

  originalFields.forEach((origField) => {
    const currField = currentFields.find((f) => f.id === origField.id);

    if (!currField) {
      // Field was deleted - we'll need to recreate it
      changes[origField.id] = { type: 'deleted', original: origField };
      return;
    }

    // Skip system-managed fields - they should not be modified by tests
    if (origField.scope === 'system') {
      return;
    }

    // Compare field properties
    const fieldPropsToCompare = [
      'tag',
      'label',
      'repeatable',
      'required',
      'deprecated',
      'scope',
      'url',
    ];

    if (!areFieldsEqual(origField, currField, fieldPropsToCompare)) {
      changes[origField.id] = {
        type: 'modified',
        original: origField,
        current: currField,
        changedFields: fieldPropsToCompare.filter((prop) => origField[prop] !== currField[prop]),
      };
    }
  });

  return changes;
}

/**
 * Get changed subfields from a list
 * @param {Array} originalSubfields - Original subfields
 * @param {Array} currentSubfields - Current subfields
 * @returns {Object} - Object with changed subfield properties
 */
function getChangedSubfields(originalSubfields, currentSubfields) {
  const changes = {};

  originalSubfields.forEach((origSubfield) => {
    const currSubfield = currentSubfields.find((s) => s.id === origSubfield.id);

    if (!currSubfield) {
      changes[origSubfield.id] = { type: 'deleted', original: origSubfield };
      return;
    }

    // Skip system-managed subfields
    if (origSubfield.scope === 'system') {
      return;
    }

    const subfieldPropsToCompare = [
      'code',
      'label',
      'repeatable',
      'required',
      'deprecated',
      'scope',
    ];

    if (!areFieldsEqual(origSubfield, currSubfield, subfieldPropsToCompare)) {
      changes[origSubfield.id] = {
        type: 'modified',
        original: origSubfield,
        current: currSubfield,
        changedFields: subfieldPropsToCompare.filter(
          (prop) => origSubfield[prop] !== currSubfield[prop],
        ),
      };
    }
  });

  return changes;
}

/**
 * Get changed indicators from a list
 * @param {Array} originalIndicators - Original indicators
 * @param {Array} currentIndicators - Current indicators
 * @returns {Object} - Object with changed indicator properties
 */
function getChangedIndicators(originalIndicators, currentIndicators) {
  const changes = {};

  originalIndicators.forEach((origIndicator) => {
    const currIndicator = currentIndicators.find((i) => i.id === origIndicator.id);

    if (!currIndicator) {
      changes[origIndicator.id] = { type: 'deleted', original: origIndicator };
      return;
    }

    const indicatorPropsToCompare = ['order', 'label'];

    if (!areFieldsEqual(origIndicator, currIndicator, indicatorPropsToCompare)) {
      changes[origIndicator.id] = {
        type: 'modified',
        original: origIndicator,
        current: currIndicator,
        changedFields: indicatorPropsToCompare.filter(
          (prop) => origIndicator[prop] !== currIndicator[prop],
        ),
      };
    }
  });

  return changes;
}

/**
 * Get changed indicator codes from a list
 * @param {Array} originalCodes - Original indicator codes
 * @param {Array} currentCodes - Current indicator codes
 * @returns {Object} - Object with changed indicator code properties
 */
function getChangedIndicatorCodes(originalCodes, currentCodes) {
  const changes = {};

  originalCodes.forEach((origCode) => {
    const currCode = currentCodes.find((c) => c.id === origCode.id);

    if (!currCode) {
      changes[origCode.id] = { type: 'deleted', original: origCode };
      return;
    }

    // Skip system-managed codes
    if (origCode.scope === 'system') {
      return;
    }

    const codePropsToCompare = ['code', 'label', 'deprecated', 'scope'];

    if (!areFieldsEqual(origCode, currCode, codePropsToCompare)) {
      changes[origCode.id] = {
        type: 'modified',
        original: origCode,
        current: currCode,
        changedFields: codePropsToCompare.filter((prop) => origCode[prop] !== currCode[prop]),
      };
    }
  });

  return changes;
}

/**
 * Compare two specification states and identify differences
 * @param {Object} originalSpec - Original specification with full structure
 * @param {Object} currentSpec - Current specification with full structure
 * @returns {Object} - Differences organized by resource type
 */
export function compareSpecifications(originalSpec, currentSpec) {
  const differences = {
    fieldsToUpdate: [],
    subfieldsToUpdate: [],
    indicatorsToUpdate: [],
    indicatorCodesToUpdate: [],
    stats: {
      totalFields: 0,
      totalSubfields: 0,
      totalIndicators: 0,
      totalIndicatorCodes: 0,
      changedFields: 0,
      changedSubfields: 0,
      changedIndicators: 0,
      changedIndicatorCodes: 0,
    },
  };

  // Compare fields
  const originalFields = originalSpec.fields || [];
  const currentFields = currentSpec.fields || [];

  differences.stats.totalFields = originalFields.length;

  const fieldChanges = getChangedFields(originalFields, currentFields);

  Object.entries(fieldChanges).forEach(([fieldId, change]) => {
    if (change.type === 'modified') {
      differences.fieldsToUpdate.push({
        id: fieldId,
        fieldId,
        original: change.original,
        changedFields: change.changedFields,
      });
      differences.stats.changedFields++;
    }
  });

  // Compare subfields, indicators, and indicator codes for each field
  originalFields.forEach((origField) => {
    const currField = currentFields.find((f) => f.id === origField.id);

    if (!currField) return; // Field deleted, handled above

    // Subfields
    const origSubfields = origField.subfields || [];
    const currSubfields = currField.subfields || [];

    differences.stats.totalSubfields += origSubfields.length;

    const subfieldChanges = getChangedSubfields(origSubfields, currSubfields);

    Object.entries(subfieldChanges).forEach(([subfieldId, change]) => {
      if (change.type === 'modified') {
        differences.subfieldsToUpdate.push({
          id: subfieldId,
          fieldId: origField.id,
          original: change.original,
          changedFields: change.changedFields,
        });
        differences.stats.changedSubfields++;
      }
    });

    // Indicators
    const origIndicators = origField.indicators || [];
    const currIndicators = currField.indicators || [];

    differences.stats.totalIndicators += origIndicators.length;

    const indicatorChanges = getChangedIndicators(origIndicators, currIndicators);

    Object.entries(indicatorChanges).forEach(([indicatorId, change]) => {
      if (change.type === 'modified') {
        differences.indicatorsToUpdate.push({
          id: indicatorId,
          fieldId: origField.id,
          original: change.original,
          changedFields: change.changedFields,
        });
        differences.stats.changedIndicators++;
      }
    });

    // Indicator codes
    origIndicators.forEach((origIndicator) => {
      const currIndicator = currIndicators.find((i) => i.id === origIndicator.id);

      if (!currIndicator) return;

      const origCodes = origIndicator.codes || [];
      const currCodes = currIndicator.codes || [];

      differences.stats.totalIndicatorCodes += origCodes.length;

      const codeChanges = getChangedIndicatorCodes(origCodes, currCodes);

      Object.entries(codeChanges).forEach(([codeId, change]) => {
        if (change.type === 'modified') {
          differences.indicatorCodesToUpdate.push({
            id: codeId,
            indicatorId: origIndicator.id,
            fieldId: origField.id,
            original: change.original,
            changedFields: change.changedFields,
          });
          differences.stats.changedIndicatorCodes++;
        }
      });
    });
  });

  return differences;
}

/**
 * Find a specification by profile (bibliographic, authority, holdings)
 * @param {Array} specifications - Array of specifications
 * @param {string} profile - Profile to find
 * @returns {Object|null} - Found specification or null
 */
export function findSpecificationByProfile(specifications, profile) {
  return specifications.find((spec) => spec.profile === profile) || null;
}

/**
 * Format differences summary for logging
 * @param {Object} differences - Differences object from compareSpecifications
 * @returns {string} - Formatted summary
 */
export function formatDifferencesSummary(differences) {
  const { stats } = differences;

  const parts = [];

  if (stats.changedFields > 0) {
    parts.push(`${stats.changedFields} fields`);
  }
  if (stats.changedSubfields > 0) {
    parts.push(`${stats.changedSubfields} subfields`);
  }
  if (stats.changedIndicators > 0) {
    parts.push(`${stats.changedIndicators} indicators`);
  }
  if (stats.changedIndicatorCodes > 0) {
    parts.push(`${stats.changedIndicatorCodes} indicator codes`);
  }

  if (parts.length === 0) {
    return 'No changes detected';
  }

  return `Changes detected: ${parts.join(', ')}`;
}
