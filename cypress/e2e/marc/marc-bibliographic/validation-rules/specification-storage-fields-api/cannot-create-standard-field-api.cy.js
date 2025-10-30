/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  validateApiResponse,
} from '../../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Validation Rules', () => {
      let user;
      let bibSpecId;
      let createdFieldId;

      const requiredPermissions = [
        Permissions.specificationStorageSpecificationCollectionGet.gui,
        Permissions.specificationStorageGetSpecificationFields.gui,
        Permissions.specificationStorageCreateSpecificationField.gui,
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
        'C490914 Cannot create Standard Field for MARC bib spec (API) (spitfire)',
        { tags: ['extendedPath', 'C490914', 'spitfire'] },
        () => {
          cy.getUserToken(user.username, user.password);

          // Attempt to create field with "standard" scope - should automatically convert to "local"
          const standardScopeFieldPayload = {
            tag: '101',
            label: 'Custom Field - Contributor Data',
            url: 'http://www.example.org/field101.html',
            repeatable: true,
            required: false,
            scope: 'standard',
          };

          cy.createSpecificationField(bibSpecId, standardScopeFieldPayload).then((createResp) => {
            validateApiResponse(createResp, 201);
            createdFieldId = createResp.body.id;

            // Verify that scope was automatically changed to "local"
            expect(createResp.body.scope, 'Scope automatically changed to local').to.eq('local');
            expect(createResp.body.tag, 'Field tag correct').to.eq('101');
            expect(createResp.body.label, 'Field label correct').to.eq(
              'Custom Field - Contributor Data',
            );
            expect(createResp.body.url, 'Field URL correct').to.eq(
              'http://www.example.org/field101.html',
            );
            expect(createResp.body.repeatable, 'Field repeatable correct').to.eq(true);
            expect(createResp.body.required, 'Field required correct').to.eq(false);
            expect(createResp.body.deprecated, 'Field deprecated default').to.eq(false);
            expect(createResp.body.specificationId, 'Specification ID correct').to.eq(bibSpecId);
          });
        },
      );
    });
  });
});
