import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  instanceFieldValues,
  STRING_OPERATORS,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';

let user;
const testInstancesData = [
  {
    // Instance 1
    title: `AT_C808476_FolioInstance_1_${getRandomPostfix()}`,
    publication: [
      {
        publisher: 'Harvard University Press',
        place: 'Cambridge, Massachusetts',
        dateOfPublication: '2003.',
        role: 'Production',
      },
    ],
  },
  {
    // Instance 2 - multiple publications
    title: `AT_C808476_FolioInstance_2_${getRandomPostfix()}`,
    publication: [
      {
        publisher: 'Oxford University Press',
        place: 'Oxford',
        dateOfPublication: '2018.',
        role: 'Publication',
      },
      {
        publisher: 'Harvard University Press',
        place: 'Cambridge, MA',
        dateOfPublication: '2003.',
        role: 'Production',
      },
      {
        publisher: 'Macmillan',
        place: 'New York',
        dateOfPublication: '',
        role: '',
      },
    ],
  },
  {
    // Instance 3
    title: `AT_C808476_FolioInstance_3_${getRandomPostfix()}`,
    publication: [
      {
        publisher: 'Macmillan',
        place: 'Cambridge',
        dateOfPublication: '[2003]',
        role: 'Distribution',
      },
    ],
  },
  {
    // Instance 4 - no publications
    title: `AT_C808476_FolioInstance_4_${getRandomPostfix()}`,
    publication: [],
  },
];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808476');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get required IDs for instances
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            const instanceTypeId = instanceTypeData[0].id;

            // Create instances with publications
            testInstancesData.forEach((instanceData, index) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instanceData.title,
                  publication: instanceData.publication,
                },
              }).then((createdInstance) => {
                cy.getInstanceById(createdInstance.instanceId).then((instanceResponse) => {
                  testInstancesData[index].hrid = instanceResponse.hrid;
                  testInstancesData[index].id = instanceResponse.id;
                });
              });
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);

        testInstancesData.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });

      it(
        'C808476 Search instances by Publications fields (firebird)',
        { tags: ['extendedPath', 'firebird', 'C808476'] },
        () => {
          // Step 1: Verify Publications fields are queryable under "Select options" dropdown
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          const publicationsFields = [
            instanceFieldValues.publicationsPlace,
            instanceFieldValues.publicationsDate,
            instanceFieldValues.publicationsPublisher,
            instanceFieldValues.publicationsRole,
          ];

          publicationsFields.forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });

          QueryModal.verifySubsetOfFieldsSortedAlphabetically(publicationsFields);

          // Step 2: Search instances by "Instance — Publications — Publisher" field using "contains" operator
          QueryModal.clickSelectFieldButton();
          QueryModal.selectField(instanceFieldValues.publicationsPublisher);
          QueryModal.verifySelectedField(instanceFieldValues.publicationsPublisher);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('University Press');
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C808476_FolioInstance', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.publication[*]->publisher contains University Press) AND (instance.title starts with AT_C808476_FolioInstance)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          const expectedInstancesToFind = [testInstancesData[0], testInstancesData[1]];

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyPublicationsEmbeddedTableInQueryModal(
              instance.hrid,
              instance.publication,
            );
          });

          const notExpectedToFindInstanceHrids = [
            testInstancesData[2].hrid,
            testInstancesData[3].hrid,
          ];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search instances by "Instance — Publications — Role" field using "equals" operator
          QueryModal.selectField(instanceFieldValues.publicationsRole);
          QueryModal.verifySelectedField(instanceFieldValues.publicationsRole);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('Production');
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.publication[*]->role == Production) AND (instance.title starts with AT_C808476_FolioInstance)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyPublicationsEmbeddedTableInQueryModal(
              instance.hrid,
              instance.publication,
            );
          });

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 4: Search instances by "Instance — Publications — Place" field using "starts with" operator
          QueryModal.selectField(instanceFieldValues.publicationsPlace);
          QueryModal.verifySelectedField(instanceFieldValues.publicationsPlace);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield('Cambridge, M');
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.publication[*]->place starts with Cambridge, M) AND (instance.title starts with AT_C808476_FolioInstance)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyPublicationsEmbeddedTableInQueryModal(
              instance.hrid,
              instance.publication,
            );
          });

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 5: Search instances by "Instance — Publications — Date" field using "equals" operator
          QueryModal.selectField(instanceFieldValues.publicationsDate);
          QueryModal.verifySelectedField(instanceFieldValues.publicationsDate);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield('2003.');
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.publication[*]->date_of_publication == 2003.) AND (instance.title starts with AT_C808476_FolioInstance)',
          );
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyPublicationsEmbeddedTableInQueryModal(
              instance.hrid,
              instance.publication,
            );
          });

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 6: Check display of Instance data from Preconditions in "Instance — Publications" column in the result table
          QueryModal.clickGarbage(0);
          QueryModal.clickTestQuery();
          QueryModal.verifyQueryAreaContent(
            '(instance.title starts with AT_C808476_FolioInstance)',
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testInstancesData[3].hrid,
            'Instance — Publications',
            '',
          );
        },
      );
    });
  });
});
