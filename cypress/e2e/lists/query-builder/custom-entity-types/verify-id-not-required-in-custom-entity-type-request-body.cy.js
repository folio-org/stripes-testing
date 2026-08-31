import Capabilities from '../../../../support/dictionary/capabilities';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

let userData = {};
let customEntityType;
const entityTypeName = `Custom ET- no id in body C844855 ${getRandomPostfix()}`;
const listName = `AT_C844855_List_${getRandomPostfix()}`;
const capabSetsToAssign = [
  CapabilitySets.moduleListsManage,
  CapabilitySets.uiUsersView,
  CapabilitySets.uiInventoryInstanceView,
];
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
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, capabsToAssign, capabSetsToAssign);
        });
      });

      after('Delete test data', () => {
        cy.getUserToken(userData.username, userData.password);
        if (customEntityType?.id) {
          Lists.deleteCustomEntityTypeById(customEntityType.id);
        }
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C844855 Verify that `id` is not required in the request body of POST /entity-types/custom API (athena)',
        { tags: ['extendedPath', 'athena', 'C844855'] },
        () => {
          cy.getUserToken(userData.username, userData.password);

          Lists.generateSimpleUsersEntityTypeSource().then((source) => {
            customEntityType = {
              id: '',
              name: entityTypeName,
              description: 'test custom entity type',
              labelAlias: null,
              crossTenantQueriesEnabled: false,
              defaultSort: [
                {
                  columnName: 'users.id',
                  direction: 'ASC',
                },
              ],
              fromClause: null,
              idView: null,
              sources: [source],
              requiredPermissions: [],
              additionalEcsConditions: [],
              shared: false,
              private: false,
            };

            cy.wait(10_000);

            // Step 1: Execute POST API to create custom entity type with empty id
            Lists.createCustomEntityType(customEntityType).then((response) => {
              customEntityType.id = response.body.id;

              expect(response.status).to.equal(201);
              expect(response.body.id).to.not.equal('');
              expect(response.body).to.have.property('name', entityTypeName);
              expect(response.body).to.have.property('description', 'test custom entity type');
              expect(response.body).to.have.property('labelAlias', null);
              expect(response.body).to.have.property('crossTenantQueriesEnabled', false);
              expect(response.body).to.have.property('owner', userData.userId);
              expect(response.body).to.have.property('isCustom', true);
              expect(response.body).to.have.property('private', false);
              expect(response.body).to.have.property('shared', false);
              expect(response.body).to.have.property('deleted', false);
              expect(response.body.requiredPermissions).to.deep.equal([]);
              expect(response.body.additionalEcsConditions).to.deep.equal([]);
              expect(response.body.sources[0]).to.deep.include({
                type: 'entity-type',
                alias: source.alias,
                name: source.name,
                targetId: source.targetId,
                useIdColumns: source.useIdColumns,
                essentialOnly: source.essentialOnly,
              });
            });

            cy.wait(60 * 1000 * 5); // need to wait around 5 minutes for the created custom entity type to be available in Lists

            // Step 2: Go to Lists landing page and verify the ET is available and queryable
            cy.login(userData.username, userData.password, {
              path: TopMenu.listsPath,
              waiter: Lists.waitLoading,
            });

            Lists.openNewListPane();
            Lists.setName(listName);
            Lists.setDescription('Test list for custom entity type C844855');
            Lists.selectRecordType(entityTypeName);
            Lists.buildQuery();
            QueryModal.verify();

            // Build a query to find the precondition user by UUID
            QueryModal.selectField('users — Username');
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInValueTextfield(userData.username);
            QueryModal.verifyTextFieldValue(userData.username);
            QueryModal.clickTestQuery();
            QueryModal.waitForQueryTestToFinish();
            QueryModal.verifyPreviewOfRecordsMatched();
            QueryModal.verifyNumberOfRowsInPreviewTable(1);
            QueryModal.verifyRecordWithContent(userData.username);
          });
        },
      );
    });
  });
});
