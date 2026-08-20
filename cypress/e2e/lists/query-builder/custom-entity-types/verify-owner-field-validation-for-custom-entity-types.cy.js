import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import Capabilities from '../../../../support/dictionary/capabilities';
import { Lists } from '../../../../support/fragments/lists/lists';
import Users from '../../../../support/fragments/users/users';

let userData1 = {};
let userData2 = {};
let entityTypeWithEmptyOwner;
let invalidUuidEntityType;
const capabSetsToAssign = [CapabilitySets.moduleListsManage];
const capabsToAssign = [
  Capabilities.fqmEntityTypesCustomCollectionCreate,
  Capabilities.fqmEntityTypesCustomItemView,
  Capabilities.fqmEntityTypesCustomItemEdit,
  Capabilities.fqmEntityTypesCustomItemDelete,
];

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Custom Entity Types', () => {
      before('Create test data', () => {
        cy.createTempUser([]).then((userProperties) => {
          userData1 = userProperties;
          cy.assignCapabilitiesToExistingUser(userData1.userId, capabsToAssign, capabSetsToAssign);
        });

        cy.createTempUser([]).then((userProperties) => {
          userData2 = userProperties;
          cy.assignCapabilitiesToExistingUser(userData2.userId, capabsToAssign, capabSetsToAssign);
        });
      });

      after('Delete test data', () => {
        cy.getUserToken(userData2.username, userData2.password);
        if (entityTypeWithEmptyOwner?.id) {
          Lists.deleteCustomEntityTypeById(entityTypeWithEmptyOwner.id);
        }
        cy.getAdminToken();
        Users.deleteViaApi(userData1.userId);
        Users.deleteViaApi(userData2.userId);
      });

      it(
        'C825344 Verify the "Owner" field validation for custom entity types (athena)',
        { tags: ['criticalPath', 'athena', 'C825344'] },
        () => {
          cy.getUserToken(userData1.username, userData1.password);

          Lists.generateSimpleUsersEntityTypeSource().then((source) => {
            // Step 1: Create custom entity type without sending owner uuid
            const entityTypeWithoutOwner = Lists.generateCustomEntityTypeBodyWithSources(
              'Custom entity type without owner C825344',
              [source],
              true,
            );

            Lists.createCustomEntityType(entityTypeWithoutOwner).then((response) => {
              expect(response.status).to.equal(201);
              expect(response.body).to.have.property('id', entityTypeWithoutOwner.id);
              expect(response.body).to.have.property('owner', userData1.userId);
              Lists.deleteCustomEntityTypeById(entityTypeWithoutOwner.id);
            });

            // Step 2: Create custom entity type sending valid owner uuid of User 1
            const entityTypeWithOwner = Lists.generateCustomEntityTypeBodyWithSources(
              'Custom entity type with owner C825344',
              [source],
              true,
            );
            entityTypeWithOwner.owner = userData1.userId;

            Lists.createCustomEntityType(entityTypeWithOwner).then((response) => {
              expect(response.status).to.equal(201);
              expect(response.body).to.have.property('id', entityTypeWithOwner.id);
              expect(response.body).to.have.property('owner', userData1.userId);
              Lists.deleteCustomEntityTypeById(entityTypeWithOwner.id);
            });

            // Step 3: Create custom entity type sending null/empty owner uuid
            entityTypeWithEmptyOwner = Lists.generateCustomEntityTypeBodyWithSources(
              'Custom entity type with empty owner C825344',
              [source],
              true,
            );
            entityTypeWithEmptyOwner.owner = '';

            Lists.createCustomEntityType(entityTypeWithEmptyOwner).then((response) => {
              expect(response.status).to.equal(201);
              expect(response.body).to.have.property('id', entityTypeWithEmptyOwner.id);
              expect(response.body).to.have.property('owner', userData1.userId);
            });

            // Step 4: Create custom entity type where owner uuid is User 2 (different user)
            const entityTypeWithOwnerMismatch = Lists.generateCustomEntityTypeBodyWithSources(
              'Custom entity type owner mismatch C825344',
              [source],
              true,
            );
            entityTypeWithOwnerMismatch.owner = userData2.userId;

            Lists.createCustomEntityType(entityTypeWithOwnerMismatch).then((response) => {
              expect(response.status).to.equal(400);
              expect(response.body.code).to.equal('entity.type.invalid');
              expect(response.body.message).to.include(
                "owner ID mismatch: the provided owner ID does not match the current user's ID.",
              );
              expect(response.body.parameters).to.deep.equal([
                {
                  key: 'id',
                  value: entityTypeWithOwnerMismatch.id,
                },
              ]);
            });

            // Step 5: Create custom entity type with invalid owner uuid
            invalidUuidEntityType = Lists.generateCustomEntityTypeBodyWithSources(
              'Custom entity type invalid owner C825344',
              [source],
              true,
            );
            invalidUuidEntityType.owner = 'invalid_uuid';

            Lists.createCustomEntityType(invalidUuidEntityType).then((response) => {
              expect(response.status).to.equal(400);
              expect(response.body.title).to.equal('Bad Request');
              expect(response.body.detail).to.equal('Failed to read request');
            });

            // Step 6: Update existing custom ET sending null owner uuid
            const entityTypeUpdateNullOwner = {
              ...entityTypeWithEmptyOwner,
              owner: null,
            };

            Lists.updateCustomEntityTypeById(
              entityTypeWithEmptyOwner.id,
              entityTypeUpdateNullOwner,
            ).then((response) => {
              expect(response.status).to.equal(200);
              expect(response.body).to.have.property('owner', userData1.userId);
            });

            // Step 7: Update existing custom ET sending owner uuid for User 2
            const entityTypeUpdateUser2Owner = {
              ...entityTypeWithEmptyOwner,
              owner: userData2.userId,
            };

            Lists.updateCustomEntityTypeById(
              entityTypeWithEmptyOwner.id,
              entityTypeUpdateUser2Owner,
            ).then((response) => {
              expect(response.status).to.equal(200);
              expect(response.body).to.have.property('owner', userData2.userId);
            });

            // Step 8: Update existing custom ET sending invalid owner uuid
            const entityTypeUpdateInvalidOwner = {
              ...entityTypeWithEmptyOwner,
              owner: 'user_uuid_other_than_user_1_or_user_2',
            };

            Lists.updateCustomEntityTypeById(
              entityTypeWithEmptyOwner.id,
              entityTypeUpdateInvalidOwner,
            ).then((response) => {
              expect(response.status).to.equal(400);
              expect(response.body.title).to.equal('Bad Request');
              expect(response.body.detail).to.equal('Failed to read request');
            });
          });
        },
      );
    });
  });
});
