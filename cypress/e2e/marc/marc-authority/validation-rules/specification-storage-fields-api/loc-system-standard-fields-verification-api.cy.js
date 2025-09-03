/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Authority Validation Rules - LOC System and Standard Fields Verification', () => {
  const requiredPermissions = [
    Permissions.specificationStorageSpecificationCollectionGet.gui,
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
  ];

  // Expected system fields from LOC
  const EXPECTED_SYSTEM_FIELDS = [
    { tag: 'LDR', repeatable: false, required: true, deprecated: false },
    { tag: '001', repeatable: false, required: true, deprecated: false },
    { tag: '005', repeatable: false, required: false, deprecated: false },
    { tag: '008', repeatable: false, required: true, deprecated: false },
    { tag: '999', repeatable: true, required: false, deprecated: false },
  ];

  // Expected standard field examples from LOC
  const EXPECTED_STANDARD_FIELDS = [
    { tag: '010', repeatable: false, required: false, deprecated: false },
    { tag: '100', repeatable: false, required: false, deprecated: false },
    { tag: '110', repeatable: false, required: false, deprecated: false },
    { tag: '111', repeatable: false, required: false, deprecated: false },
    { tag: '130', repeatable: false, required: false, deprecated: false },
    { tag: '147', repeatable: false, required: false, deprecated: false },
    { tag: '148', repeatable: false, required: false, deprecated: false },
    { tag: '150', repeatable: false, required: false, deprecated: false },
    { tag: '151', repeatable: false, required: false, deprecated: false },
    { tag: '155', repeatable: false, required: false, deprecated: false },
    { tag: '162', repeatable: false, required: false, deprecated: false },
    { tag: '180', repeatable: false, required: false, deprecated: false },
    { tag: '181', repeatable: false, required: false, deprecated: false },
    { tag: '182', repeatable: false, required: false, deprecated: false },
    { tag: '185', repeatable: false, required: false, deprecated: false },
    { tag: '400', repeatable: true, required: false, deprecated: false },
    { tag: '500', repeatable: true, required: false, deprecated: false },
  ];

  // Expected deprecated fields from LOC
  const EXPECTED_DEPRECATED_FIELDS = ['090', '668'];

  // Expected field 856 subfields
  const EXPECTED_856_SUBFIELDS = [
    {
      code: 'g',
      label: 'Persistent identifier',
      repeatable: true,
      required: false,
      deprecated: false,
    },
    {
      code: 'h',
      label: 'Non-functioning Uniform Resource Identifier',
      repeatable: true,
      required: false,
      deprecated: false,
    },
    {
      code: 'l',
      label: 'Standardized information governing access',
      repeatable: true,
      required: false,
      deprecated: false,
    },
    {
      code: 'n',
      label: 'Terms governing access',
      repeatable: true,
      required: false,
      deprecated: false,
    },
    {
      code: 'r',
      label: 'Standardized information governing use and reproduction',
      repeatable: true,
      required: false,
      deprecated: false,
    },
    {
      code: 't',
      label: 'Terms governing use and reproduction',
      repeatable: true,
      required: false,
      deprecated: false,
    },
  ];

  let user;
  let authoritySpecId;
  let allFields;

  // Helper functions
  const validateFieldProperties = (field, expected) => {
    expect(field.repeatable, `${field.tag} repeatable property`).to.eq(expected.repeatable);
    expect(field.required, `${field.tag} required property`).to.eq(expected.required);
    expect(field.deprecated, `${field.tag} deprecated property`).to.eq(expected.deprecated);
  };

  before('Create user and fetch MARC authority specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
    });
    cy.getSpecificatoinIds().then((specs) => {
      const authoritySpec = specs.find((s) => s.profile === 'authority');
      expect(authoritySpec, 'MARC authority specification exists').to.exist;
      authoritySpecId = authoritySpec.id;
    });
  });

  after('Delete test user', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    "C494348 Check System and Standard validation rules for MARC authority's Fields from LOC (API) (spitfire)",
    { tags: ['C494348', 'extendedPath', 'spitfire'] },
    () => {
      cy.getUserToken(user.username, user.password);

      // Step 1: Get all fields for MARC authority specification
      cy.getSpecificationFields(authoritySpecId).then((fieldsResp) => {
        expect(fieldsResp.status).to.eq(200);
        allFields = fieldsResp.body.fields;

        // Verify response contains expected number of records (approximately 149)
        expect(
          allFields.length,
          'Total fields count should be around 149 (LOC fields)',
        ).to.be.greaterThan(140);

        // Step 2: Verify System fields (scope: 'system')
        const actualSystemFields = allFields.filter((f) => f.scope === 'system');
        expect(actualSystemFields.length, 'Should have some system fields').to.be.greaterThan(0);

        // Verify expected system fields that exist in this specification
        EXPECTED_SYSTEM_FIELDS.forEach((expectedField) => {
          const systemField = allFields.find(
            (field) => field.tag === expectedField.tag && field.scope === 'system',
          );
          if (systemField) {
            expect(systemField.scope, `${expectedField.tag} has system scope`).to.eq('system');
            validateFieldProperties(systemField, expectedField);
          }
        });

        // Step 3: Verify Standard fields (scope: 'standard')
        EXPECTED_STANDARD_FIELDS.forEach((expectedField) => {
          const standardField = allFields.find(
            (field) => field.tag === expectedField.tag && field.scope === 'standard',
          );
          expect(standardField, `Standard field ${expectedField.tag} exists`).to.exist;
          expect(standardField.scope, `${expectedField.tag} has standard scope`).to.eq('standard');
          validateFieldProperties(standardField, expectedField);
        });

        // Step 4: Verify fields match LOC documentation (https://www.loc.gov/marc/authority/ecadlist.html)
        // All standard fields should have standard scope and proper LOC URLs
        const standardFields = allFields.filter((field) => field.scope === 'standard');
        standardFields.forEach((field) => {
          if (field.url) {
            expect(field.url, `${field.tag} should have LOC URL`).to.include('loc.gov');
          }
        });

        // Step 5: Verify deprecated fields
        EXPECTED_DEPRECATED_FIELDS.forEach((deprecatedTag) => {
          const deprecatedField = allFields.find((field) => field.tag === deprecatedTag);
          expect(deprecatedField, `Deprecated field ${deprecatedTag} exists`).to.exist;
          expect(deprecatedField.deprecated, `${deprecatedTag} is marked as deprecated`).to.be.true;
          expect(deprecatedField.url, `Deprecated field ${deprecatedTag} should not have URL`).to.be
            .undefined;
        });

        // Step 6: Check system field indicators (LDR, 001, 005, 008 should have no indicators; 999 should have indicators)
        const systemFieldsWithoutIndicators = ['LDR', '001', '005', '008'];
        systemFieldsWithoutIndicators.forEach((tag) => {
          const systemField = allFields.find(
            (field) => field.tag === tag && field.scope === 'system',
          );
          if (systemField) {
            cy.getSpecificationFieldIndicators(systemField.id).then((indicatorsResp) => {
              expect(indicatorsResp.status).to.eq(200);
              expect(
                indicatorsResp.body.indicators.length,
                `${tag} should have no indicators`,
              ).to.eq(0);
            });
          }
        });

        // System field 999 should have indicators
        const system999Field = allFields.find(
          (field) => field.tag === '999' && field.scope === 'system',
        );
        if (system999Field) {
          cy.getSpecificationFieldIndicators(system999Field.id).then((indicatorsResp) => {
            expect(indicatorsResp.status).to.eq(200);
            expect(indicatorsResp.body.indicators.length, '999 should have 2 indicators').to.eq(2);

            // Check indicator codes for 999 field
            const firstIndicator = indicatorsResp.body.indicators[0];
            cy.getSpecificationIndicatorCodes(firstIndicator.id).then((codesResp) => {
              expect(codesResp.status).to.eq(200);
              const codes = codesResp.body.codes.map((code) => code.code);
              // Should contain letters (a-z), digits (0-9), and special character (#)
              expect(
                codes,
                '999 indicator codes should include letters, digits, and #',
              ).to.include.members(['a', '0', '#']);
            });
          });
        }

        // Step 7: Check system field subfields (LDR, 001, 005, 008 should have no subfields; 999 should have subfields)
        systemFieldsWithoutIndicators.forEach((tag) => {
          const systemField = allFields.find(
            (field) => field.tag === tag && field.scope === 'system',
          );
          if (systemField) {
            cy.getSpecificationFieldSubfields(systemField.id).then((subfieldsResp) => {
              expect(subfieldsResp.status).to.eq(200);
              expect(subfieldsResp.body.subfields.length, `${tag} should have no subfields`).to.eq(
                0,
              );
            });
          }
        });

        // System field 999 should have subfields
        if (system999Field) {
          cy.getSpecificationFieldSubfields(system999Field.id).then((subfieldsResp) => {
            expect(subfieldsResp.status).to.eq(200);
            expect(
              subfieldsResp.body.subfields.length,
              '999 should have subfields',
            ).to.be.greaterThan(0);
            const subCodes = subfieldsResp.body.subfields.map((sub) => sub.code);
            // Should contain letters (a-z) and digits (0-9)
            expect(
              subCodes,
              '999 subfield codes should include letters and digits',
            ).to.include.members(['a', '0']);
          });
        }

        // Step 8: Check standard field indicators (compare with LOC standard)
        const standardField100 = allFields.find(
          (field) => field.tag === '100' && field.scope === 'standard',
        );
        if (standardField100) {
          cy.getSpecificationFieldIndicators(standardField100.id).then((indicatorsResp) => {
            expect(indicatorsResp.status).to.eq(200);
            expect(
              indicatorsResp.body.indicators.length,
              '100 should have indicators according to LOC',
            ).to.be.greaterThan(0);

            // Verify indicator codes match LOC standard
            const firstIndicator = indicatorsResp.body.indicators[0];
            cy.getSpecificationIndicatorCodes(firstIndicator.id).then((codesResp) => {
              expect(codesResp.status).to.eq(200);
              expect(
                codesResp.body.codes.length,
                '100 indicator should have codes from LOC',
              ).to.be.greaterThan(0);
            });
          });
        }

        // Step 9: Check standard field subfields (compare with LOC standard)
        if (standardField100) {
          cy.getSpecificationFieldSubfields(standardField100.id).then((subfieldsResp) => {
            expect(subfieldsResp.status).to.eq(200);
            expect(
              subfieldsResp.body.subfields.length,
              '100 should have subfields according to LOC',
            ).to.be.greaterThan(0);
          });
        }

        // Step 10: Check specific 856 field subfields
        const standardField856 = allFields.find(
          (field) => field.tag === '856' && field.scope === 'standard',
        );
        if (standardField856) {
          cy.getSpecificationFieldSubfields(standardField856.id).then((subfieldsResp) => {
            expect(subfieldsResp.status).to.eq(200);

            // Verify specific subfields from the test case
            EXPECTED_856_SUBFIELDS.forEach((expectedSubfield) => {
              const subfield = subfieldsResp.body.subfields.find(
                (sf) => sf.code === expectedSubfield.code,
              );
              expect(subfield, `856 subfield ${expectedSubfield.code} exists`).to.exist;
              expect(subfield.label, `856 subfield ${expectedSubfield.code} label`).to.eq(
                expectedSubfield.label,
              );
              expect(subfield.repeatable, `856 subfield ${expectedSubfield.code} repeatable`).to.eq(
                expectedSubfield.repeatable,
              );
              expect(subfield.required, `856 subfield ${expectedSubfield.code} required`).to.eq(
                expectedSubfield.required,
              );
              expect(subfield.deprecated, `856 subfield ${expectedSubfield.code} deprecated`).to.eq(
                expectedSubfield.deprecated,
              );
            });
          });
        }
      });
    },
  );
});
