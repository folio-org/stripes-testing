import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';

import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
  instanceFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';

let user;
const testInstancesData = [
  {
    // Instance 1 - FOLIO with "Dutch; Flemish"
    title: `AT_C965840_FolioInstance_1_${getRandomPostfix()}`,
    source: 'FOLIO',
    languageCode: 'dut',
    expectedLanguageNames: ['Dutch; Flemish'],
  },
  {
    // Instance 2 - FOLIO with "Undetermined" (no code)
    title: `AT_C965840_FolioInstance_2_${getRandomPostfix()}`,
    source: 'FOLIO',
    languageCode: 'und',
    expectedLanguageNames: ['Undetermined'],
  },
  {
    // Instance 3 - MARC with code "sgn" -> "Sign Languages"
    title: `AT_C965840_MarcInstance_3_${getRandomPostfix()}`,
    source: 'MARC',
    languageCode: 'sgn',
    expectedLanguageNames: ['Sign Languages'],
  },
  {
    // Instance 4 - MARC with code "ase" -> "Undetermined"
    title: `AT_C965840_MarcInstance_4_${getRandomPostfix()}`,
    source: 'MARC',
    languageCode: 'ase',
    expectedLanguageNames: ['Undetermined'],
  },
];

const verifyLanguages = (instance, expectedLanguages) => {
  const languagesText = expectedLanguages.join(' | ');
  QueryModal.verifyMatchedRecordsByIdentifier(instance.hrid, 'Instance — Languages', languagesText);
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C965840');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            const instanceTypeId = instanceTypeData[0].id;

            // Create FOLIO instances (Instance 1 and Instance 2)
            testInstancesData.forEach((instanceData, index) => {
              if (instanceData.source === 'FOLIO') {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: instanceData.title,
                    languages: [instanceData.languageCode],
                  },
                }).then((createdInstance) => {
                  cy.getInstanceById(createdInstance.instanceId).then((instanceResponse) => {
                    testInstancesData[index].hrid = instanceResponse.hrid;
                    testInstancesData[index].id = instanceResponse.id;
                  });
                });
              } else if (instanceData.source === 'MARC') {
                // Create MARC instances (Instance 3 and Instance 4)
                const marcInstanceFields = [
                  {
                    tag: '008',
                    content: {
                      ...QuickMarcEditor.defaultValid008Values,
                      Lang: instanceData.languageCode,
                    },
                  },
                  {
                    tag: '245',
                    content: `$a ${instanceData.title} $6 880-01`,
                    indicators: ['1', '0'],
                  },
                ];

                cy.createMarcBibliographicViaAPI(
                  QuickMarcEditor.defaultValidLdr,
                  marcInstanceFields,
                ).then((instanceId) => {
                  cy.getInstanceById(instanceId).then((instanceResponse) => {
                    testInstancesData[index].hrid = instanceResponse.hrid;
                    testInstancesData[index].id = instanceResponse.id;
                  });
                });
              }
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
        'C965840 Verify localized language names when search instances by Languages (firebird)',
        { tags: ['extendedPath', 'firebird', 'C965840'] },
        () => {
          // Step 1: Verify language dropdown displays localized names
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.selectField(instanceFieldValues.languages);
          QueryModal.verifySelectedField(instanceFieldValues.languages);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);

          // Step 2: Search "Dutch; Flemish" -> verify Instance 1 found
          QueryModal.chooseValueSelect('Dutch; Flemish');
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C965840', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.verifyQueryAreaContent(
            '(instance.languages == Dutch; Flemish) AND (instance.title starts with AT_C965840)',
          );

          // Expected to find: Instance 1 (Dutch; Flemish)
          const expectedInstancesStep2 = [testInstancesData[0]];

          expectedInstancesStep2.forEach((instance) => {
            verifyLanguages(instance, instance.expectedLanguageNames);
          });

          // Not expected to find: Instance 2, Instance 3, Instance 4
          const notExpectedHridsStep2 = [
            testInstancesData[1].hrid,
            testInstancesData[2].hrid,
            testInstancesData[3].hrid,
          ];

          notExpectedHridsStep2.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search "Undetermined" without code -> verify Instance 2 found, Instance 4 NOT found
          QueryModal.clickGarbage(0);
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.languages, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelectByValue('und', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.verifyQueryAreaContent(
            '(instance.title starts with AT_C965840) AND (instance.languages == Undetermined)',
          );

          // Expected to find: Instance 2 (Undetermined with "und" code)
          const expectedInstancesStep3 = [testInstancesData[1]];

          expectedInstancesStep3.forEach((instance) => {
            verifyLanguages(instance, instance.expectedLanguageNames);
          });

          // Not expected to find: Instance 1, Instance 3, Instance 4
          const notExpectedHridsStep3 = [
            testInstancesData[0].hrid,
            testInstancesData[2].hrid,
            testInstancesData[3].hrid,
          ];

          notExpectedHridsStep3.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 4: Search "Sign Languages" -> verify Instance 3 found
          QueryModal.clickGarbage(1);
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.languages, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect('Sign Languages', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.verifyQueryAreaContent(
            '(instance.title starts with AT_C965840) AND (instance.languages == Sign Languages)',
          );

          // Expected to find: Instance 3 (Sign Languages)
          const expectedInstancesStep4 = [testInstancesData[2]];

          expectedInstancesStep4.forEach((instance) => {
            verifyLanguages(instance, instance.expectedLanguageNames);
          });

          // Not expected to find: Instance 1, Instance 2, Instance 4
          const notExpectedHridsStep4 = [
            testInstancesData[0].hrid,
            testInstancesData[1].hrid,
            testInstancesData[3].hrid,
          ];

          notExpectedHridsStep4.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 5: Search "Undetermined" with "ase" code -> verify Instance 4 found, Instance 2 NOT found
          QueryModal.clickGarbage(1);
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.languages, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelectByValue('ase', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.verifyQueryAreaContent(
            '(instance.title starts with AT_C965840) AND (instance.languages == Undetermined)',
          );

          // Expected to find: Instance 4 (Undetermined with "ase" code)
          const expectedInstancesStep5 = [testInstancesData[3]];

          expectedInstancesStep5.forEach((instance) => {
            verifyLanguages(instance, instance.expectedLanguageNames);
          });

          // Not expected to find: Instance 1, Instance 2, Instance 3
          const notExpectedHridsStep5 = [
            testInstancesData[0].hrid,
            testInstancesData[1].hrid,
            testInstancesData[2].hrid,
          ];

          notExpectedHridsStep5.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 6: Search using "in" operator with all values -> verify all 4 instances found
          QueryModal.clickGarbage(1);
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.languages, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.selectAllMatchingFromMultiselect('Undetermined', 1);
          QueryModal.chooseFromValueMultiselect('Dutch; Flemish', 1);
          QueryModal.chooseFromValueMultiselect('Sign Languages', 1);

          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(4);
          // Expected to find: All 4 instances
          testInstancesData.forEach((instance) => {
            verifyLanguages(instance, instance.expectedLanguageNames);
          });

          // Step 7: Run query, view preview -> verify "Languages" column shows codes
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          BulkEditSearchPane.verifySpecificTabHighlighted('Query');
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
          );

          testInstancesData.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.hrid,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.LANGUAGES,
              instance.languageCode,
            );
          });
        },
      );
    });
  });
});
