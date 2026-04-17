import Capabilities from '../../../../support/dictionary/capabilities';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import { Lists } from '../../../../support/fragments/lists/lists';
import Users from '../../../../support/fragments/users/users';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Custom Entity Types', () => {
      let userData = {};
      let nonCustomEntityTypeWithSources = { isCustom: false };

      const capabSetsToAssign = [CapabilitySets.moduleListsManage];
      const capabsToAssign = [
        Capabilities.fqmEntityTypesCustomCollectionCreate,
        Capabilities.fqmEntityTypesCustomItemView,
        Capabilities.fqmEntityTypesCustomItemEdit,
        Capabilities.fqmEntityTypesCustomItemDelete,
      ];

      before('Create test data', () => {
        cy.createTempUser([]).then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, capabsToAssign, capabSetsToAssign);
        });
        Lists.generateSimpleUsersEntityTypeSource().then((source) => {
          nonCustomEntityTypeWithSources = {
            ...nonCustomEntityTypeWithSources,
            ...Lists.generateCustomEntityTypeBodyWithSources(
              'Custom entity type with sources C825348',
              [source],
            )
          };
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C825348 Verify that the appropriate validation message exists if the user tries to create a non-custom entity type (eureka)',
        { tags: ['extendedPath', 'eureka', 'C825348'] },
        () => {
          cy.getUserToken(userData.username, userData.password);


          Lists.createCustomEntityType(nonCustomEntityTypeWithSources).then((response) => {
            expect(response.status).to.equal(404);
            expect(response.body.message).to.include(`Entity type ${nonCustomEntityTypeWithSources.id} is not a custom entity type`);
            expect(response.body.code).to.equal('entity.type.not.found');
            expect(response.body.parameters[0].key).to.equal('entityTypeId');
            expect(response.body.parameters[0].value).to.equal(nonCustomEntityTypeWithSources.id);
          });
        },
      );
    });
  });
});
