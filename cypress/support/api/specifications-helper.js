/**
 * MARC Validation Rules Test Helpers
 * Common utilities for MARC specification and field testing
 */

// Generic finding utilities
export function findFieldByTagAndScope(fields, tag, scope) {
  return fields.find((f) => f.tag === tag && f.scope === scope);
}

export function findSubfieldByCodeAndScope(subfields, code, scope) {
  return subfields.find((subfield) => subfield.code === code && subfield.scope === scope);
}

// Convenience methods for common scopes
export function findSystemField(fields, tag) {
  return findFieldByTagAndScope(fields, tag, 'system');
}

export function findLocalField(fields, tag) {
  return findFieldByTagAndScope(fields, tag, 'local');
}

export function findStandardField(fields, tag) {
  return findFieldByTagAndScope(fields, tag, 'standard');
}

export function findLocalSubfield(subfields, code) {
  return findSubfieldByCodeAndScope(subfields, code, 'local');
}

export function findSystemSubfield(subfields, code) {
  return findSubfieldByCodeAndScope(subfields, code, 'system');
}

export function findStandardSubfield(subfields, code) {
  return findSubfieldByCodeAndScope(subfields, code, 'standard');
}
// API response validation
export function validateApiResponse(response, expectedStatus) {
  expect(response.status, `Response status should be ${expectedStatus}`).to.eq(expectedStatus);
}

// Test data generation
export function generateTestFieldData(testCaseId, options = {}) {
  const defaults = {
    scope: 'local',
    repeatable: true,
    required: false,
  };

  const fieldData = {
    tag: options.tag, // User must specify tag
    label: `AT_${testCaseId}_${options.label || 'Test_Field'}`,
    ...defaults,
    ...options,
  };

  // Only include url if it's provided and not empty
  if (options.url && options.url.trim() !== '') {
    fieldData.url = options.url;
  }

  return fieldData;
}

export function generateIndicatorData(testCaseId, order, options = {}) {
  return {
    order,
    label: `AT_${testCaseId}_${options.label || `Indicator_${order}`}`,
    ...options,
  };
}

export function generateIndicatorCodeData(testCaseId, code, options = {}) {
  return {
    code,
    label: `AT_${testCaseId}_${options.label || `Code_${code}`}`,
    ...options,
  };
}

// Subfield data generation
export function generateSubfieldData(testCaseId, code, options = {}) {
  const defaults = {
    scope: 'local',
    repeatable: true,
    required: false,
    deprecated: false,
  };

  return {
    code,
    label: `AT_${testCaseId}_${options.label || `Test_subfield_${code}`}`,
    ...defaults,
    ...options,
  };
}

// Specification helpers
export function getBibliographicSpec() {
  return cy.getSpecificationIds().then((specs) => {
    const bibSpec = specs.find((s) => s.profile === 'bibliographic');
    // eslint-disable-next-line no-unused-expressions
    expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
    return bibSpec;
  });
}

export function getAuthoritySpec() {
  return cy.getSpecificationIds().then((specs) => {
    const authSpec = specs.find((s) => s.profile === 'authority');
    // eslint-disable-next-line no-unused-expressions
    expect(authSpec, 'MARC authority specification exists').to.exist;
    return authSpec;
  });
}

export function getHoldingsSpec() {
  return cy.getSpecificationIds().then((specs) => {
    const holdingsSpec = specs.find((s) => s.profile === 'holdings');
    // eslint-disable-next-line no-unused-expressions
    expect(holdingsSpec, 'MARC holdings specification exists').to.exist;
    return holdingsSpec;
  });
}

// Field creation workflows
export function createFieldWithIndicators(specId, fieldData, indicatorsData = []) {
  return cy.createSpecificationField(specId, fieldData).then((fieldResponse) => {
    const fieldId = fieldResponse.body.id;

    if (indicatorsData.length === 0) {
      return { fieldId, indicatorIds: [] };
    }

    const indicatorPromises = indicatorsData.map((indicatorData) => cy.createSpecificationFieldIndicator(fieldId, indicatorData));

    return Cypress.Promise.all(indicatorPromises).then((indicatorResponses) => {
      const indicatorIds = indicatorResponses.map((resp) => resp.body.id);
      return { fieldId, indicatorIds };
    });
  });
}

export function createFieldWithIndicatorsAndCodes(specId, fieldData, indicatorsData = []) {
  return createFieldWithIndicators(specId, fieldData, indicatorsData).then(
    ({ fieldId, indicatorIds }) => {
      const allCodeIds = [];

      if (indicatorIds.length === 0) {
        return { fieldId, indicatorIds, codeIds: allCodeIds };
      }

      const codePromises = indicatorIds.flatMap((indicatorId, index) => {
        const codesData = indicatorsData[index]?.codes || [];
        return codesData.map((codeData) => cy.createSpecificationFieldIndicatorCode(indicatorId, codeData).then((resp) => {
          allCodeIds.push(resp.body.id);
          return resp;
        }));
      });

      return Cypress.Promise.all(codePromises).then(() => ({
        fieldId,
        indicatorIds,
        codeIds: allCodeIds,
      }));
    },
  );
}

// Cleanup utilities
export function cleanupField(fieldId, indicatorIds = []) {
  // Clean up in reverse order: codes -> indicators -> field
  const cleanupPromises = [];

  if (indicatorIds.length > 0) {
    indicatorIds.forEach((indicatorId) => {
      cleanupPromises.push(cy.deleteSpecificationFieldIndicator(indicatorId, false));
    });
  }

  if (fieldId) {
    cleanupPromises.push(cy.deleteSpecificationField(fieldId, false));
  }

  return Cypress.Promise.all(cleanupPromises);
}

// Builder pattern for creating MARC test data structures
export function createFieldTestDataBuilder(testCaseId) {
  let fieldData = {
    scope: 'local',
    repeatable: true,
    required: false,
  };
  let indicatorsData = [];

  const builder = {
    reset() {
      fieldData = {
        scope: 'local',
        repeatable: true,
        required: false,
      };
      indicatorsData = [];
      return builder;
    },

    withField(tag, label, options = {}) {
      fieldData = {
        tag,
        label: `AT_${testCaseId}_${label}`,
        ...fieldData,
        ...options,
      };
      return builder;
    },

    withIndicator(order, label, codes = []) {
      indicatorsData.push({
        order,
        label: `AT_${testCaseId}_${label}`,
        codes: codes.map((code) => ({
          code: code.code,
          label: `AT_${testCaseId}_${code.label}`,
          ...code.options,
        })),
      });
      return builder;
    },

    build() {
      return {
        field: fieldData,
        indicators: indicatorsData,
      };
    },
  };

  return builder;
}

// Toggle MARC specification rules
export function toggleAllUndefinedValidationRules(specId, { enable = true }) {
  const undefinedRules = {
    undefinedFieldRuleName: 'Undefined Field',
    undefinedIndRuleName: 'Undefined Indicator Code',
    undefinedSubfieldRuleName: 'Undefined Subfield',
  };
  Object.values(undefinedRules).forEach((ruleName) => {
    cy.getSpecificationRules(specId).then(({ body }) => {
      const ruleId = body.rules.find((rule) => rule.name === ruleName).id;
      cy.updateSpecificationRule(specId, ruleId, {
        enabled: enable,
      });
    });
  });
}
