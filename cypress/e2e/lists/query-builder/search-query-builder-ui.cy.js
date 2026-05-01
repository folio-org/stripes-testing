import Permissions from '../../../support/dictionary/permissions';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Lists } from '../../../support/fragments/lists/lists';
import ClassificationIdentifierTypes from '../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Query Builder UI', () => {
    let userData = {};
    let listName;

    const addQueryBuilderCapabilitySets = (capabilitySets) => {
      const capabilitySetIds = [];

      cy.then(() => {
        capabilitySets.forEach((capabilitySet) => {
          cy.getCapabilitySetIdViaApi({
            type: capabilitySet.type,
            resource: capabilitySet.resource,
            action: capabilitySet.action,
          }).then((capabilitySetId) => capabilitySetIds.push(capabilitySetId));
        });
      }).then(() => {
        if (capabilitySetIds.length) {
          cy.addCapabilitySetsToNewUserApi(userData.userId, capabilitySetIds, true);
        }
      });
    };

    const createQueryBuilderUser = (permissions, capabilitySets = []) => {
      cy.getAdminToken();
      cy.createTempUser(permissions).then((userProperties) => {
        userData = userProperties;
        if (Cypress.env('eureka')) {
          addQueryBuilderCapabilitySets([CapabilitySets.moduleListsManage, ...capabilitySets]);
        }
      });
    };

    const deleteQueryBuilderUser = () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      userData = {};
    };

    const deleteTestList = () => {
      if (listName) {
        cy.getUserToken(userData.username, userData.password);
        Lists.deleteListByNameViaApi(listName, true);
        listName = undefined;
      }
    };

    const openQueryBuilder = (recordType) => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.openNewListPane();
      Lists.setName(listName);
      Lists.selectRecordType(recordType);
      Lists.buildQuery();
    };

    const verifyQueryBuilder = (
      field,
      operator,
      filedType,
      value,
      query,
      locator,
      valueInColumn,
    ) => {
      QueryModal.selectField(field);
      QueryModal.selectOperator(operator);
      QueryModal.populateFiled(filedType, value);
      QueryModal.testQuery();
      cy.wait(2000); // wait for query to process
      Lists.verifyQueryHeader(field);
      Lists.verifyQueryValue(value, operator, locator, valueInColumn);
      Lists.verifyPreviewOfRecordsMatched();
      QueryModal.clickRunQueryAndSave();
      QueryModal.verifyClosed();
      Lists.waitForCompilingToComplete(3000);
      Lists.verifyQuery(query);
      Lists.verifyQueryHeader(field);
      Lists.verifyQueryValue(value, operator, locator, valueInColumn);
      Lists.closeListDetailsPane();
    };

    describe('Organizations', () => {
      const recordType = 'Organizations';
      before('Create test user', () => {
        createQueryBuilderUser([
          Permissions.listsEdit.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
        ]);
      });

      after('Delete test user', () => {
        deleteQueryBuilderUser();
      });

      afterEach('Delete test list', () => {
        deleteTestList();
      });

      it(
        'C451507 Search for "organizations" in the query builder using "Status" field (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451507'] },
        () => {
          listName = getTestEntityValue('C451507_List');
          openQueryBuilder(recordType);
          verifyQueryBuilder(
            'Organization — Status',
            QUERY_OPERATIONS.EQUAL,
            'select',
            'Active',
            'organization.status == Active',
            'list-column-organization.status',
          );
        },
      );
    });

    describe('Purchase order lines', () => {
      const recordType = 'Purchase order lines';

      before('Create test user', () => {
        createQueryBuilderUser([
          Permissions.listsAll.gui,
          Permissions.usersViewRequests.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.inventoryAll.gui,
          Permissions.loansAll.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
        ]);
      });

      after('Delete test user', () => {
        deleteQueryBuilderUser();
      });

      afterEach('Delete test list', () => {
        deleteTestList();
      });

      it(
        'C451553 Verify that grouped fields display within a list row for "POL — Fund distribution" column (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451553'] },
        () => {
          listName = getTestEntityValue('C451553_List');
          openQueryBuilder(recordType);
          verifyQueryBuilder(
            'POL — UUID',
            QUERY_OPERATIONS.NOT_IN,
            'input',
            'test',
            'pol.id not in test',
            'list-column-pol.id',
          );
        },
      );
    });

    describe('Users', () => {
      const recordType = 'Users';

      before('Create test user', () => {
        createQueryBuilderUser([Permissions.listsAll.gui, Permissions.usersViewRequests.gui]);
      });

      after('Delete test user', () => {
        deleteQueryBuilderUser();
      });

      afterEach('Delete test list', () => {
        deleteTestList();
      });

      it(
        'C451548 Verify the operator null/empty with "True" value (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451548'] },
        () => {
          listName = getTestEntityValue('C451548_List');
          openQueryBuilder(recordType);
          verifyQueryBuilder(
            'User — Middle name',
            QUERY_OPERATIONS.IS_NULL,
            'select',
            'True',
            'users.middle_name is null/empty true',
            'list-column-users.middle_name',
            '',
          );
        },
      );
    });

    describe('Instances', () => {
      const recordType = 'Instances';
      const testData = {
        instanceTitle: getTestEntityValue('C_lists_query_builder_classification_instance'),
        classificationNumber: 'BJ1533.C4',
        classificationIdentifierTypeName: getTestEntityValue(
          'C_lists_query_builder_classification_type',
        ),
      };

      before('Create test user and instance', () => {
        cy.getAdminToken();
        ClassificationIdentifierTypes.createViaApi({
          name: testData.classificationIdentifierTypeName,
          source: 'local',
        }).then((response) => {
          testData.classificationIdentifierTypeId = response.body.id;
        });
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: testData.instanceTitle,
              classifications: [
                {
                  classificationNumber: testData.classificationNumber,
                  classificationTypeId: testData.classificationIdentifierTypeId,
                },
              ],
            },
          }).then(({ instanceId }) => {
            testData.instanceId = instanceId;
          });
        });
        createQueryBuilderUser(
          [Permissions.listsAll.gui, Permissions.inventoryAll.gui],
          [CapabilitySets.uiInventory],
        );
      });

      after('Delete test user and instance', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
        ClassificationIdentifierTypes.deleteViaApi(testData.classificationIdentifierTypeId);
      });

      afterEach('Delete test list', () => {
        deleteTestList();
      });

      it(
        'C451549 Verify the operator null/empty with "False" value (corsair)',
        { tags: ['criticalPath', 'corsair', 'C451549'] },
        () => {
          listName = getTestEntityValue('C451549_List');
          openQueryBuilder(recordType);
          verifyQueryBuilder(
            'Instance — Suppress from discovery',
            QUERY_OPERATIONS.IS_NULL,
            'select',
            'False',
            'instance.discovery_suppress is null/empty false',
            'list-column-instance.discovery_suppress',
            'False',
          );
        },
      );

      it(
        'Search instances in the query builder by classification identifier type (corsair)',
        { tags: ['criticalPath', 'corsair'] },
        () => {
          listName = getTestEntityValue('C_lists_query_builder_classification_list');
          openQueryBuilder(recordType);

          QueryModal.typeInAndSelectField(
            instanceFieldValues.classificationsClassificationIdentifierType,
          );
          QueryModal.verifySelectedField(
            instanceFieldValues.classificationsClassificationIdentifierType,
          );
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueMultiselect(testData.classificationIdentifierTypeName);
          QueryModal.verifySelectedMultiselectValue(testData.classificationIdentifierTypeName);
          QueryModal.testQuery();
          Lists.verifyPreviewOfRecordsMatched();
          QueryModal.verifyQueryAreaContent(
            `(instance.classifications[*]->type_name in [${testData.classificationIdentifierTypeName}])`,
          );
        },
      );
    });
  });
});
