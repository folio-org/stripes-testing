import Capabilities from '../../../../support/dictionary/capabilities';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import { Lists } from '../../../../support/fragments/lists/lists';
import Users from '../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Custom Entity Types', () => {
      let userData = {};
      let newCustomEntityTypeWithSources;
      const listData = {
        name: `C825342-${getTestEntityValue('list')}`,
        description: `C825342-${getTestEntityValue('desc')}`,
        fqlQuery: '',
        isActive: true,
        isPrivate: false,
      };

      before('Create test data', () => {
        const capabSetsToAssign = [
          CapabilitySets.moduleListsManage,
          CapabilitySets.uiUsersView,
        ];
        const capabsToAssign = [
          Capabilities.fqmEntityTypesCustomCollectionCreate,
          Capabilities.fqmEntityTypesCustomItemDelete,
        ];
        cy.createTempUser([]).then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, capabsToAssign, capabSetsToAssign);
        }).then(() => {
          Lists.generateSimpleUsersEntityTypeSource().then((source) => {
            newCustomEntityTypeWithSources = Lists.generateCustomEntityTypeBodyWithSources(
              'Custom entity type with sources C825342',
              [source],
              false,
            );
          });
        }).then(() => {
          cy.getUserToken(userData.username, userData.password);
          Lists.createCustomEntityType(newCustomEntityTypeWithSources).then((response) => {
            expect(response.status).to.equal(201);
            listData.entityTypeId = newCustomEntityTypeWithSources.id;
          }).then(() => {
            Lists.createViaApi(listData)
              .then((body) => {
                listData.id = body.id;
              })
              .then(() => {
                Lists.waitForListToCompleteRefreshViaApi(listData.id);
              });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C825342 Verify that it\'s NOT possible to DELETE the existing custom entity type when the permission is assigned and list is created (eureka)',
        { tags: ['extendedPath', 'eureka', 'C825342'] },
        () => {
          cy.getUserToken(userData.username, userData.password);

          // Step 1: DELETE custom ET while list exists → expect 409
          Lists.deleteCustomEntityTypeById(newCustomEntityTypeWithSources.id).then((response) => {
            expect(response.status).to.equal(409);
            expect(response.body.message).to.equal(
              'Cannot delete custom entity type because it is used by the following consumers: mod-lists',
            );
            expect(response.body.code).to.equal('entity.type.in.use');
            expect(response.body.parameters[0].key).to.equal('entityTypeId');
            expect(response.body.parameters[0].value).to.equal(newCustomEntityTypeWithSources.id);
          });

          // Step 2: Delete the list → expect 204
          Lists.deleteViaApi(listData.id).then((response) => {
            expect(response.status).to.equal(204);
          });

          // Step 3: DELETE custom ET after list deleted → expect 204
          Lists.deleteCustomEntityTypeById(newCustomEntityTypeWithSources.id).then((response) => {
            expect(response.status).to.equal(204);
          });
        },
      );
    });
  });
});
