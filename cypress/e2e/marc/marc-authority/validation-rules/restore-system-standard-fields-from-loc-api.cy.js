/* eslint-disable no-unused-expressions */
import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';

describe('MARC Authority Validation Rules - Restore System and Standard Fields from LOC', () => {
  const LOCAL_FIELD_TAG = '890';
  const LOCAL_FIELD_DATA = {
    tag: LOCAL_FIELD_TAG,
    label: 'AT_C494349_Local Field - Custom Entry',
    url: 'http://www.example.org/field890.html',
    repeatable: false,
    required: false,
    deprecated: false,
  };
  const newField100Url = 'http://www.example.org/field100.html';
  const newField999Url = 'http://www.example.org/field999.html';

  const EXPECTED_DEPRECATED_FIELDS = ['090', '668'];

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
  let localFieldId;
  let originalField100Url;
  let originalField999Url;

  const requiredPermissions = [
    Permissions.specificationStorageSpecificationCollectionGet.gui,
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
  ];

  before('Create user and fetch authority spec ID', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
    });
    cy.getSpecificationIds().then((specs) => {
      const authoritySpec = specs.find((s) => s.profile === 'authority');
      expect(authoritySpec, 'MARC authority specification exists').to.exist;
      authoritySpecId = authoritySpec.id;
      cy.syncSpecifications(authoritySpecId);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    // Clean up local field if test failed before sync removed it
    if (localFieldId) {
      cy.deleteSpecificationField(localFieldId, false);
    }
    cy.syncSpecifications(authoritySpecId);
    Users.deleteViaApi(user.userId);
  });

  it(
    "C494349 Restore System and Standard validation rules for MARC authority's Fields from LOC (API) (spitfire)",
    { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C494349'] },
    () => {
      // Preconditions: create local field and modify system/standard fields
      cy.then(() => {
        cy.getAdminToken();

        // Create a local field
        cy.createSpecificationField(authoritySpecId, LOCAL_FIELD_DATA).then((resp) => {
          expect(resp.status).to.eq(201);
          localFieldId = resp.body.id;
        });

        // Get all fields and modify a system field and a standard field
        cy.getSpecificationFields(authoritySpecId).then((fieldsResp) => {
          const fields = fieldsResp.body.fields;

          // Modify system field 999: change required to true (default is false)
          const systemField999 = fields.find((f) => f.tag === '999' && f.scope === 'system');
          expect(systemField999, 'System field 999 exists').to.exist;
          originalField999Url = systemField999.url;
          cy.updateSpecificationField(systemField999.id, {
            tag: '999',
            label: systemField999.label,
            url: newField999Url,
            repeatable: systemField999.repeatable,
            required: systemField999.required,
            deprecated: systemField999.deprecated,
          });

          // Modify standard field 100: change required to true (default is false)
          const standardField100 = fields.find((f) => f.tag === '100' && f.scope === 'standard');
          expect(standardField100, 'Standard field 100 exists').to.exist;
          originalField100Url = standardField100.url;
          cy.updateSpecificationField(standardField100.id, {
            tag: '100',
            label: standardField100.label,
            url: newField100Url,
            repeatable: standardField100.repeatable,
            required: standardField100.required,
            deprecated: standardField100.deprecated,
          });
        });
      })

        // Step 1: GET fields - verify preconditions are in place
        .then(() => {
          cy.getUserToken(user.username, user.password);
          cy.getSpecificationFields(authoritySpecId).then((response) => {
            expect(response.status).to.eq(200);
            const fields = response.body.fields;

            // Verify local field exists
            const localField = fields.find((f) => f.tag === LOCAL_FIELD_TAG && f.scope === 'local');
            expect(localField, 'Local field exists').to.exist;

            // Verify system field 999 has user-made changes
            const changedSystemField = fields.find((f) => f.tag === '999' && f.scope === 'system');
            expect(changedSystemField, 'System field 999 with changes exists').to.exist;
            expect(changedSystemField.url, '999 URL should be changed to new URL').to.eq(
              newField999Url,
            );

            // Verify standard field 100 has user-made changes
            const changedStandardField = fields.find(
              (f) => f.tag === '100' && f.scope === 'standard',
            );
            expect(changedStandardField, 'Standard field 100 with changes exists').to.exist;
            expect(changedStandardField.url, '100 URL should be changed to new URL').to.eq(
              newField100Url,
            );
          });
        })

        // Step 2: POST /sync to restore System and Standard validation rules to LOC defaults
        .then(() => {
          cy.getAdminToken();
          cy.syncSpecifications(authoritySpecId).then((syncResp) => {
            expect(syncResp.status).to.eq(202);
          });
          // Local field is removed by sync - mark as cleaned up
          localFieldId = null;
        })

        // Steps 3-5: GET fields after sync and verify restored state
        .then(() => {
          cy.getUserToken(user.username, user.password);
          cy.getSpecificationFields(authoritySpecId).then((response) => {
            expect(response.status).to.eq(200);
            const fields = response.body.fields;

            // Verify total records count is ~148
            expect(fields.length, 'Total fields count should be around 148').to.be.greaterThan(140);

            // Step 3: Verify deprecated fields (090, 668) have deprecated:true and no url key
            EXPECTED_DEPRECATED_FIELDS.forEach((tag) => {
              const deprecatedField = fields.find((f) => f.tag === tag);
              expect(deprecatedField, `Deprecated field ${tag} exists`).to.exist;
              expect(deprecatedField.deprecated, `${tag} is marked as deprecated`).to.be.true;
              expect(deprecatedField.url, `Deprecated field ${tag} should not have URL`).to.be
                .undefined;
            });

            // Step 4: Verify local field has been removed by sync
            const localField = fields.find((f) => f.tag === LOCAL_FIELD_TAG && f.scope === 'local');
            expect(localField, 'Local field should be removed after sync').to.not.exist;

            // Verify system field 999 is restored to default (required: false)
            const restoredSystemField = fields.find((f) => f.tag === '999' && f.scope === 'system');
            expect(restoredSystemField, 'System field 999 restored').to.exist;
            expect(restoredSystemField.url, '999 URL should be restored to original URL').to.eq(
              originalField999Url,
            );

            // Verify standard field 100 is restored to default (required: false)
            const restoredStandardField = fields.find(
              (f) => f.tag === '100' && f.scope === 'standard',
            );
            expect(restoredStandardField, 'Standard field 100 restored').to.exist;
            expect(restoredStandardField.url, '100 URL should be restored to original URL').to.eq(
              originalField100Url,
            );

            // Step 5: GET subfields for 856 field and verify g, h, l, n, r, t
            const field856 = fields.find((f) => f.tag === '856');
            expect(field856, '856 field exists').to.exist;

            cy.getSpecificationFieldSubfields(field856.id).then((subfieldsResp) => {
              expect(subfieldsResp.status).to.eq(200);
              const subfields = subfieldsResp.body.subfields;

              EXPECTED_856_SUBFIELDS.forEach((expected) => {
                const subfield = subfields.find((sf) => sf.code === expected.code);
                expect(subfield, `856 subfield "${expected.code}" exists`).to.exist;
                expect(subfield.label, `"${expected.code}" label`).to.eq(expected.label);
                expect(subfield.repeatable, `"${expected.code}" repeatable`).to.eq(
                  expected.repeatable,
                );
                expect(subfield.required, `"${expected.code}" required`).to.eq(expected.required);
                expect(subfield.deprecated, `"${expected.code}" deprecated`).to.eq(
                  expected.deprecated,
                );
              });
            });
          });
        });
    },
  );
});
