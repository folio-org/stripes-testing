/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findSystemField,
  validateApiResponse,
} from '../../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Validation Rules', () => {
      let user;
      let bibSpecId;
      let systemField001;
      let createdFieldId;

      const requiredPermissions = [
        Permissions.specificationStorageSpecificationCollectionGet.gui,
        Permissions.specificationStorageGetSpecificationFields.gui,
        Permissions.specificationStorageCreateSpecificationField.gui,
        Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
        Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
        Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
        Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
      ];

      before('Create user and fetch MARC bib specification', () => {
        cy.getAdminToken();
        cy.createTempUser(requiredPermissions).then((createdUser) => {
          user = createdUser;
          getBibliographicSpec().then((bibSpec) => {
            bibSpecId = bibSpec.id;
          });
        });
      });

      beforeEach('Get system field 001', () => {
        cy.getUserToken(user.username, user.password);
        cy.getSpecificationFields(bibSpecId).then((fieldsResp) => {
          validateApiResponse(fieldsResp, 200);
          systemField001 = findSystemField(fieldsResp.body.fields, '001');
          expect(systemField001, 'System field 001 should exist').to.exist;
        });
      });

      after('Delete test user and clean up', () => {
        if (createdFieldId) {
          cy.getAdminToken();
          cy.deleteSpecificationField(createdFieldId, false);
        }
        if (user) {
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
        }
      });

      it(
        'C490912 Cannot create System Field, Indicator, Subfield for MARC bib spec (API) (spitfire)',
        { tags: ['extendedPath', 'C490912', 'spitfire'] },
        () => {
          // Step 1: Attempt to create field with "system" scope - should automatically convert to "local"
          const systemScopeFieldPayload = {
            tag: '900',
            label: 'Custom Field - Contributor Data',
            url: 'http://www.example.org/field100.html',
            repeatable: true,
            required: false,
            scope: 'system',
          };

          cy.createSpecificationField(bibSpecId, systemScopeFieldPayload).then((createResp) => {
            validateApiResponse(createResp, 201);
            createdFieldId = createResp.body.id;

            // Verify that scope was automatically changed to "local"
            expect(createResp.body.scope, 'Step 1: Scope automatically changed to local').to.eq(
              'local',
            );
            expect(createResp.body.tag, 'Step 1: Field tag correct').to.eq('900');
            expect(createResp.body.label, 'Step 1: Field label correct').to.eq(
              'Custom Field - Contributor Data',
            );
            expect(createResp.body.url, 'Step 1: Field URL correct').to.eq(
              'http://www.example.org/field100.html',
            );
            expect(createResp.body.repeatable, 'Step 1: Field repeatable correct').to.eq(true);
            expect(createResp.body.required, 'Step 1: Field required correct').to.eq(false);
            expect(createResp.body.deprecated, 'Step 1: Field deprecated default').to.eq(false);
          });

          // Step 2: Attempt to create indicator for 001 control field - should fail
          const indicatorPayload = {
            order: 1,
            label: 'Ind 1 name',
          };

          cy.createSpecificationFieldIndicator(systemField001.id, indicatorPayload, false).then(
            (indicatorResp) => {
              expect(indicatorResp.status, 'Step 2: Status should be 400').to.eq(400);
              expect(
                indicatorResp.body.errors[0].message,
                'Step 2: Error message for control field indicator',
              ).to.include('Cannot define indicators for 00X control fields.');
            },
          );

          // Step 3: Attempt to create subfield for 001 control field - should fail
          const subfieldPayload = {
            code: 'a',
            label: 'Code a name',
          };

          cy.createSpecificationFieldSubfield(systemField001.id, subfieldPayload, false).then(
            (subfieldResp) => {
              expect(subfieldResp.status, 'Step 3: Status should be 400').to.eq(400);
              expect(
                subfieldResp.body.errors[0].message,
                'Step 3: Error message for control field subfield',
              ).to.include('Cannot define subfields for 00X control fields.');
            },
          );
        },
      );
    });
  });
});
