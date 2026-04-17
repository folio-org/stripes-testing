import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import Capabilities from '../../../../support/dictionary/capabilities';
import { Lists } from '../../../../support/fragments/lists/lists';
import Users from '../../../../support/fragments/users/users';

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Custom Entity Types', () => {
      let userData = {};
      const newCustomEntityType = Lists.generateCustomEntityTypeBodyWithoutSources('Custom entity type C825336');
      let newCustomEntityTypeWithSources;

      const expectedError = {
        code: 'entity.type.invalid',
        message: 'Entity types must have at least one source defined',
        parameters: [{
          key: 'id',
          value: newCustomEntityType.id
        }]
      };

      before('Create test data', () => {
        const capabSetsToAssign = [CapabilitySets.moduleListsManage];
        const capabsToAssign = [
          Capabilities.fqmEntityTypesCustomItemView,
          Capabilities.fqmEntityTypesCustomItemEdit,
          Capabilities.fqmEntityTypesCustomCollectionCreate
        ];
        cy.createTempUser([]).then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, capabsToAssign, capabSetsToAssign);
        }).then(() => {
          Lists.generateSimpleUsersEntityTypeSource().then((source) => {
            newCustomEntityTypeWithSources = Lists.generateCustomEntityTypeBodyWithSources(
              'Custom entity type with sources C825336',
              [source],
              false
            );
          });
        });
      });

      after('Delete test data', () => {
        cy.getUserToken(userData.username, userData.password);
        Lists.deleteCustomEntityTypeById(newCustomEntityTypeWithSources.id);
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C825336 Verify that it\'s possible to create a new custom entity type when the permission is assigned (eureka)',
        { tags: ['extendedPath', 'eureka', 'C825336'] },
        () => {
          cy.getUserToken(userData.username, userData.password);

          // Step 1: POST without 'sources' field should return 400
          Lists.createCustomEntityType(newCustomEntityType).then((response) => {
            expect(response.status).to.equal(400);
            expect(response.body).to.be.deep.equal(expectedError);
          });

          // Step 2: POST with 'sources' field should return 201
          Lists.createCustomEntityType(newCustomEntityTypeWithSources).then((response) => {
            expect(response.status).to.equal(201);
          });
        },
      );

      it(
        'C825338 Verify that it\'s possible to get the newly created custom entity type when the permission is assigned (eureka)',
        { tags: ['extendedPath', 'eureka', 'C825338'] },
        () => {
          cy.getUserToken(userData.username, userData.password);

          Lists.getCustomEntityTypeById(newCustomEntityTypeWithSources.id).then((response) => {
            expect(response.status).to.equal(200);
            expect(response.body).to.have.property('id', newCustomEntityTypeWithSources.id);
            expect(response.body).to.have.property('name', newCustomEntityTypeWithSources.name);
          });
        },
      );

      it(
        'C825340 Verify that it\'s possible to update the existing custom entity type when the permission is assigned (eureka)',
        { tags: ['extendedPath', 'eureka', 'C825340'] },
        () => {
          cy.getUserToken(userData.username, userData.password);

          const updatedEntityType = {
            ...newCustomEntityTypeWithSources,
            name: 'Custom entity type name with changes C825340',
          };

          Lists.updateCustomEntityTypeById(newCustomEntityTypeWithSources.id, updatedEntityType).then((response) => {
            expect(response.status).to.equal(200);
            expect(response.body).to.have.property('id', newCustomEntityTypeWithSources.id);
            expect(response.body).to.have.property('name', updatedEntityType.name);
          });
        },
      );
    });
  });
});
