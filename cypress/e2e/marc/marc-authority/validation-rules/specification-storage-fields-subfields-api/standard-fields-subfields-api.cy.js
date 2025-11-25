/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('Specification Storage - Standard Fields Subfield API for MARC Authority', () => {
  let user;
  let authSpecId;
  let specificationFields;
  let createdSubfieldIds = [];
  const permissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
    Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
    Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
    Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
  ];

  // Helper functions for better readability
  const findStandardFieldByTag = (tag) => {
    return specificationFields.find((field) => field.tag === tag && field.scope === 'standard');
  };

  const findLocalSubfieldByCode = (subfields, code) => {
    return subfields.find((sf) => sf.code === code && sf.scope === 'local');
  };

  const filterSubfieldsByScope = (subfields, scope) => {
    return subfields.filter((sf) => sf.scope === scope);
  };

  before('Create user and fetch MARC authority specification', () => {
    cy.getAdminToken();
    cy.createTempUser(permissions).then((createdUser) => {
      user = createdUser;
    });
    cy.getSpecificationIds().then((specs) => {
      const authSpec = specs.find((s) => s.profile === 'authority');
      expect(authSpec, 'MARC authority specification exists').to.exist;
      authSpecId = authSpec.id;
    });
  });

  beforeEach('Setup user token and get specification fields', () => {
    cy.getUserToken(user.username, user.password);
    cy.getSpecificationFields(authSpecId).then((response) => {
      expect(response.status).to.eq(200);
      specificationFields = response.body.fields;
    });
  });

  afterEach('Clean up created subfields', () => {
    if (createdSubfieldIds.length > 0) {
      cy.getAdminToken();
      createdSubfieldIds.forEach((subfieldId) => {
        cy.deleteSpecificationFieldSubfield(subfieldId);
      });
      createdSubfieldIds = [];
    }
  });

  after('Cleanup: delete user and subfields', () => {
    cy.getAdminToken();
    // Clean up all created subfields
    if (createdSubfieldIds.length > 0) {
      createdSubfieldIds.forEach((subfieldId) => {
        cy.deleteSpecificationFieldSubfield(subfieldId);
      });
    }
    Users.deleteViaApi(user.userId);
  });

  it(
    'C499784 Create Subfield Code of Standard Field for MARC authority spec (API) (spitfire)',
    { tags: ['C499784', 'extendedPath', 'spitfire'] },
    () => {
      // Find a standard field (e.g., 100 - Heading--Personal Name)
      const standardField = findStandardFieldByTag('100');
      expect(standardField, 'Standard field 100 exists').to.exist;

      // Precondition: Remove subfield 'w' if it already exists
      cy.getSpecificationFieldSubfields(standardField.id).then((getSubfieldsResp) => {
        const existingSubfield = findLocalSubfieldByCode(getSubfieldsResp.body.subfields, 'w');
        if (existingSubfield) {
          cy.deleteSpecificationFieldSubfield(existingSubfield.id);
        }
      });

      // Step 1: Create subfield with code 'w'
      const subfieldPayload = {
        code: 'w',
        label: 'Added w subfield name',
        repeatable: false,
        required: true,
        deprecated: false,
      };

      cy.createSpecificationFieldSubfield(standardField.id, subfieldPayload)
        .then((subfieldResp) => {
          expect(subfieldResp.status).to.eq(201);
          const subfieldBody = subfieldResp.body;
          const createdSubfieldId = subfieldBody.id;
          createdSubfieldIds.push(createdSubfieldId);

          // Verify response body structure
          expect(subfieldBody).to.include({
            fieldId: standardField.id,
            ...subfieldPayload,
            scope: 'local',
          });
          expect(subfieldBody.id, 'Subfield has ID').to.exist;
          expect(subfieldBody.metadata, 'Subfield has metadata').to.exist;
        })
        .then(() => {
          // Step 2: Verify the subfield was created via GET request
          cy.getSpecificationFieldSubfields(standardField.id).then((getSubfieldsResp) => {
            expect(getSubfieldsResp.status).to.eq(200);

            // Verify created subfield exists in response
            const createdSubfield = findLocalSubfieldByCode(getSubfieldsResp.body.subfields, 'w');
            expect(createdSubfield, 'Created subfield found in response').to.exist;
            expect(createdSubfield).to.include({
              fieldId: standardField.id,
              ...subfieldPayload,
              scope: 'local',
            });

            // Verify response contains both standard and local subfields
            const standardSubfields = filterSubfieldsByScope(
              getSubfieldsResp.body.subfields,
              'standard',
            );
            const localSubfields = filterSubfieldsByScope(getSubfieldsResp.body.subfields, 'local');

            expect(
              standardSubfields.length,
              'Response contains standard subfield codes (defined by LOC)',
            ).to.be.greaterThan(0);
            expect(
              localSubfields.length,
              'Response contains created by user subfield codes',
            ).to.be.greaterThan(0);

            // Verify our created subfield is in the local subfields
            const ourSubfield = localSubfields.find((sf) => sf.code === 'w');
            expect(ourSubfield, 'Our created subfield is in local subfields').to.exist;
          });
        });
    },
  );
});
