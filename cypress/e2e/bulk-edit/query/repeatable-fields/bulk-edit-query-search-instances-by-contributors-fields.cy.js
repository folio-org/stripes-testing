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
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';

let user;
let contributorNameTypes;
let contributorTypes;
const testInstancesData = [
  {
    // Instance 1
    title: `AT_C805785_FolioInstance_1_${getRandomPostfix()}`,
    contributors: [
      {
        name: 'David, Charles, 1972-',
        contributorNameType: 'Personal name',
        contributorType: 'Consultant',
        contributorTypeText: 'director.',
        primary: true,
      },
    ],
  },
  {
    // Instance 2 - multiple contributors
    title: `AT_C805785_FolioInstance_2_${getRandomPostfix()}`,
    contributors: [
      {
        name: 'David, Charles, 1972-',
        contributorNameType: 'Personal name',
        contributorType: 'Consultant',
        contributorTypeText: 'director.',
        primary: true,
      },
      {
        name: 'Blakeslee, Lys, 1985-',
        contributorNameType: 'Corporate name',
        contributorType: 'Data contributor',
        contributorTypeText: 'screenwriter.',
        primary: false,
      },
      {
        name: 'Howlett, David James, 1978-',
        contributorNameType: 'Meeting name',
        contributorType: 'Storyteller',
        contributorTypeText: '',
        primary: false,
      },
    ],
  },
  {
    // Instance 3
    title: `AT_C805785_FolioInstance_3_${getRandomPostfix()}`,
    contributors: [
      {
        name: 'Blakeslee, Lys, 1985-',
        contributorNameType: 'Meeting name',
        contributorType: 'Storyteller',
        contributorTypeText: 'distributor.',
        primary: false,
      },
    ],
  },
  {
    // Instance 4 - no contributors
    title: `AT_C805785_FolioInstance_4_${getRandomPostfix()}`,
    contributors: [],
  },
];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C805785');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get contributor name types and types
          BrowseContributors.getContributorNameTypes({
            searchParams: {
              limit: 500,
            },
          }).then((nameTypes) => {
            contributorNameTypes = nameTypes;
            BrowseContributors.getContributorTypes({ searchParams: { limit: 500 } }).then(
              (types) => {
                contributorTypes = types;

                // Get required IDs for instances
                cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                  const instanceTypeId = instanceTypeData[0].id;

                  // Helper function to find ID by name
                  const findNameTypeId = (name) => {
                    return contributorNameTypes.find((type) => type.name === name)?.id;
                  };
                  const findTypeId = (name) => {
                    return contributorTypes.find((type) => type.name === name)?.id;
                  };

                  // Create instances with contributors
                  testInstancesData.forEach((instanceData, index) => {
                    const contributorsForApi = instanceData.contributors.map((contributor) => ({
                      name: contributor.name,
                      contributorNameTypeId: findNameTypeId(contributor.contributorNameType),
                      contributorTypeId: findTypeId(contributor.contributorType),
                      contributorTypeText: contributor.contributorTypeText,
                      primary: contributor.primary,
                    }));

                    InventoryInstances.createFolioInstanceViaApi({
                      instance: {
                        instanceTypeId,
                        title: instanceData.title,
                        contributors: contributorsForApi,
                      },
                    }).then((createdInstance) => {
                      cy.getInstanceById(createdInstance.instanceId).then((instanceResponse) => {
                        testInstancesData[index].hrid = instanceResponse.hrid;
                        testInstancesData[index].id = instanceResponse.id;
                      });
                    });
                  });
                });
              },
            );
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
        'C805785 Search instances by Contributors fields using AND operator (firebird)',
        { tags: ['smoke', 'firebird', 'C805785'] },
        () => {
          // Map contributors data to convert boolean primary to string format for verification
          const mappedInstancesDataToUIView = testInstancesData.map((instance) => ({
            ...instance,
            contributors: instance.contributors.map((contributor) => ({
              name: contributor.name,
              contributorNameType: contributor.contributorNameType,
              contributorType: contributor.contributorType,
              contributorTypeFreeText: contributor.contributorTypeText,
              primary: contributor.primary ? 'True' : 'False',
            })),
          }));

          // Step 1: Verify Contributors fields are queryable under "Select options" dropdown
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          const contributorsFields = [
            instanceFieldValues.contributorName,
            instanceFieldValues.contributorNameType,
            instanceFieldValues.contributorPrimary,
            instanceFieldValues.contributorType,
            instanceFieldValues.contributorTypeFreeText,
          ];

          contributorsFields.forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });

          QueryModal.verifySubsetOfFieldsSortedAlphabetically(contributorsFields);

          // Step 2: Search instances using AND operator with multiple contributor fields
          QueryModal.clickSelectFieldButton();
          QueryModal.selectField(instanceFieldValues.contributorNameType);
          QueryModal.verifySelectedField(instanceFieldValues.contributorNameType);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueMultiselect('Personal name');
          QueryModal.fillInValueMultiselect('Corporate name');
          QueryModal.addNewRow();

          QueryModal.selectField(instanceFieldValues.contributorName, 1);
          QueryModal.verifySelectedField(instanceFieldValues.contributorName, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('David, Charles,', 1);
          QueryModal.addNewRow();

          QueryModal.selectField(instanceFieldValues.contributorPrimary, 2);
          QueryModal.verifySelectedField(instanceFieldValues.contributorPrimary, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
          QueryModal.chooseValueSelect('False', 2);
          QueryModal.addNewRow();

          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 3);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 3);
          QueryModal.fillInValueTextfield('AT_C805785_FolioInstance', 3);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          const expectedInstancesToFind = [mappedInstancesDataToUIView[1]];

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyContributorsEmbeddedTableInQueryModal(
              instance.hrid,
              instance.contributors,
            );
          });

          const notExpectedToFindInstanceHrids = [
            mappedInstancesDataToUIView[0].hrid,
            mappedInstancesDataToUIView[2].hrid,
            mappedInstancesDataToUIView[3].hrid,
          ];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search instances by "Instance — Contributors — Contributor type" field using "equals" operator
          QueryModal.selectField(instanceFieldValues.contributorType);
          QueryModal.verifySelectedField(instanceFieldValues.contributorType);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('Consultant');
          QueryModal.clickGarbage(1);
          QueryModal.clickGarbage(1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          const expectedConsultantInstances = [
            mappedInstancesDataToUIView[0],
            mappedInstancesDataToUIView[1],
          ];

          expectedConsultantInstances.forEach((instance) => {
            QueryModal.verifyContributorsEmbeddedTableInQueryModal(
              instance.hrid,
              instance.contributors,
            );
          });

          const notExpectedConsultantHrids = [
            mappedInstancesDataToUIView[2].hrid,
            mappedInstancesDataToUIView[3].hrid,
          ];

          notExpectedConsultantHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 4: Search instances by "Instance — Contributors — Contributor type, free text" field using "contains" operator
          QueryModal.selectField(instanceFieldValues.contributorTypeFreeText);
          QueryModal.verifySelectedField(instanceFieldValues.contributorTypeFreeText);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('director');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedConsultantInstances.forEach((instance) => {
            QueryModal.verifyContributorsEmbeddedTableInQueryModal(
              instance.hrid,
              instance.contributors,
            );
          });

          notExpectedConsultantHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 5: Search instances by "Instance — Contributors — Contributor type, free text" field using "is null/empty" operator with "True" value
          QueryModal.selectField(instanceFieldValues.contributorTypeFreeText);
          QueryModal.verifySelectedField(instanceFieldValues.contributorTypeFreeText);
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.chooseValueSelect('True');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          const expectedNullInstances = [
            mappedInstancesDataToUIView[1],
            mappedInstancesDataToUIView[3],
          ];

          expectedNullInstances.forEach((instance) => {
            if (instance.contributors.length > 0) {
              QueryModal.verifyContributorsEmbeddedTableInQueryModal(
                instance.hrid,
                instance.contributors,
              );
            } else {
              QueryModal.verifyMatchedRecordsByIdentifier(
                instance.hrid,
                'Instance — Contributors',
                '',
              );
            }
          });

          const notExpectedNullHrids = [
            mappedInstancesDataToUIView[0].hrid,
            mappedInstancesDataToUIView[2].hrid,
          ];

          notExpectedNullHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 6: Search instances by "Instance — Contributors — Contributor type, free text" field using "is null/empty" operator with "False" value
          QueryModal.selectField(instanceFieldValues.contributorTypeFreeText);
          QueryModal.verifySelectedField(instanceFieldValues.contributorTypeFreeText);
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.chooseValueSelect('False');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          const expectedNotNullInstances = [
            mappedInstancesDataToUIView[0],
            mappedInstancesDataToUIView[2],
          ];

          expectedNotNullInstances.forEach((instance) => {
            QueryModal.verifyContributorsEmbeddedTableInQueryModal(
              instance.hrid,
              instance.contributors,
            );
          });

          const notExpectedNotNullHrids = [
            mappedInstancesDataToUIView[1].hrid,
            mappedInstancesDataToUIView[3].hrid,
          ];

          notExpectedNotNullHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 7: Check display of Instance data from Preconditions in "Instance — Contributors" column in the result table
          QueryModal.clickGarbage(0);
          QueryModal.clickTestQuery();
          QueryModal.verifyMatchedRecordsByIdentifier(
            mappedInstancesDataToUIView[3].hrid,
            'Instance — Contributors',
            '',
          );
        },
      );
    });
  });
});
