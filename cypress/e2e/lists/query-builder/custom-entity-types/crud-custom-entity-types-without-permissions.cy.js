/* eslint-disable no-unused-expressions */
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import { Lists } from '../../../../support/fragments/lists/lists';
import Users from '../../../../support/fragments/users/users';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Custom Entity Types', () => {
      let userData = {};
      const newCustomEntityType = Lists.generateCustomEntityTypeBodyWithoutSources('Custom entity type C825335');
      const expectedError = {
        errors: [
          {
            type: 'ForbiddenException',
            code: 'authorization_error',
            message: 'Access Denied'
          }
        ],
        total_records: 1
      };

      before('Create test data', () => {
        const capabSetsToAssign = [CapabilitySets.moduleListsManage];
        cy.createTempUser([]).then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);
        }).then(() => {
          cy.getUserToken(userData.username, userData.password);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      function verifyResponse(response) {
        expect(response.status).to.equal(403);
        expect(response.body.errors).to.exist;
        expect(response.body.errors).to.have.length.greaterThan(0);
        expect(response.body).to.be.deep.equal(expectedError);
      }

      it(
        'C825335 Verify the CRUD operations for Custom Entity Types without the appropriate permissions (eureka)',
        { tags: ['extendedPath', 'eureka', 'C825335'] },
        () => {
          Lists.createCustomEntityType(newCustomEntityType).then((response) => {
            verifyResponse(response);
          });

          Lists.getCustomEntityTypeById(newCustomEntityType.id).then((response) => {
            verifyResponse(response);
          });

          Lists.updateCustomEntityTypeById(newCustomEntityType.id, newCustomEntityType).then((response) => {
            verifyResponse(response);
          });

          Lists.deleteCustomEntityTypeById(newCustomEntityType.id).then((response) => {
            verifyResponse(response);
          });
        },
      );
    });
  });
});
