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
import { ClassificationTypes } from '../../../../support/fragments/settings/inventory';

let user;
const testInstancesData = [
  {
    // Instance 1
    title: `AT_C808447_FolioInstance_1_${getRandomPostfix()}`,
    identifiers: [
      {
        identifierTypeId: '',
        value: '9783518573235',
        typeName: 'ISBN',
      },
    ],
    classifications: [
      {
        classificationNumber: 'HC107.I2',
        classificationTypeId: '',
        typeName: 'NLM',
      },
    ],
  },
  {
    // Instance 2 - multiple identifiers and classifications
    title: `AT_C808447_FolioInstance_2_${getRandomPostfix()}`,
    identifiers: [
      {
        identifierTypeId: '',
        value: '3518573233',
        typeName: 'ISBN',
      },
      {
        identifierTypeId: '',
        value: 'agr24000455',
        typeName: 'LCCN',
      },
      {
        identifierTypeId: '',
        value: '(OCoLC)236211132',
        typeName: 'OCLC',
      },
    ],
    classifications: [
      {
        classificationNumber: 'HC107.I2 I193',
        classificationTypeId: '',
        typeName: 'NLM',
      },
      {
        classificationNumber: '128.20903',
        classificationTypeId: '',
        typeName: 'SUDOC',
      },
      {
        classificationNumber: '346.7304305',
        classificationTypeId: '',
        typeName: 'National Agricultural Library',
      },
    ],
  },
  {
    // Instance 3
    title: `AT_C808447_FolioInstance_3_${getRandomPostfix()}`,
    identifiers: [
      {
        identifierTypeId: '',
        value: '(OCoLC)450127451',
        typeName: 'OCLC',
      },
    ],
    classifications: [
      {
        classificationNumber: 'HC305.H55 2025',
        classificationTypeId: '',
        typeName: 'National Agricultural Library',
      },
    ],
  },
  {
    // Instance 4 - no identifiers, no classifications
    title: `AT_C808447_FolioInstance_4_${getRandomPostfix()}`,
    identifiers: [],
    classifications: [],
  },
];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808447');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          ClassificationTypes.getClassificationTypesViaApi().then(({ classificationTypes }) => {
            // Helper function to find classification type ID by name
            const findClassificationTypeId = (typeName) => {
              return classificationTypes.find((type) => type.name === typeName)?.id;
            };

            // Set classification type IDs dynamically
            testInstancesData.forEach((instanceData) => {
              instanceData.classifications.forEach((classification) => {
                classification.classificationTypeId = findClassificationTypeId(
                  classification.typeName,
                );
              });
            });

            // Get identifier types using forEach approach
            const identifierTypeNames = ['ISBN', 'LCCN', 'OCLC'];
            const identifierTypes = {};
            let completedCount = 0;

            const processIdentifierType = (typeName) => {
              InventoryInstances.getIdentifierTypes({ query: `name="${typeName}"` }).then(
                (typeData) => {
                  identifierTypes[typeName] = typeData.id;
                  completedCount++;

                  // Check if all identifier types have been processed
                  if (completedCount === identifierTypeNames.length) {
                    // Set identifier type IDs dynamically
                    testInstancesData.forEach((instanceData) => {
                      instanceData.identifiers.forEach((identifier) => {
                        identifier.identifierTypeId = identifierTypes[identifier.typeName];
                      });
                    });

                    cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                      const instanceTypeId = instanceTypeData[0].id;

                      testInstancesData.forEach((instanceData, index) => {
                        const identifiersForApi = instanceData.identifiers.map((identifier) => ({
                          identifierTypeId: identifier.identifierTypeId,
                          value: identifier.value,
                        }));

                        const classificationsForApi = instanceData.classifications.map(
                          (classification) => ({
                            classificationNumber: classification.classificationNumber,
                            classificationTypeId: classification.classificationTypeId,
                          }),
                        );

                        InventoryInstances.createFolioInstanceViaApi({
                          instance: {
                            instanceTypeId,
                            title: instanceData.title,
                            identifiers: identifiersForApi,
                            classifications: classificationsForApi,
                          },
                        }).then((createdInstance) => {
                          cy.getInstanceById(createdInstance.instanceId).then(
                            (instanceResponse) => {
                              testInstancesData[index].hrid = instanceResponse.hrid;
                              testInstancesData[index].id = instanceResponse.id;
                            },
                          );
                        });
                      });
                    });
                  }
                },
              );
            };

            identifierTypeNames.forEach(processIdentifierType);
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

      // Trillium
      it.skip(
        'C808447 Search instances by Identifiers fields, Classifications fields (firebird)',
        { tags: [] },
        () => {
          // Map identifiers and classifications data for UI display format
          const mappedInstancesDataToUIView = testInstancesData.map((instance) => ({
            ...instance,
            identifiers: instance.identifiers.map((identifier) => ({
              identifier: identifier.value,
              identifierType: identifier.typeName,
            })),
            classifications: instance.classifications.map((classification) => ({
              classification: classification.classificationNumber,
              classificationIdentifierType: classification.typeName,
            })),
          }));

          // Step 1: Verify Identifiers fields are queryable under "Select options" dropdown
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          const identifiersFields = [
            instanceFieldValues.identifiersIdentifier,
            instanceFieldValues.identifiersIdentifierType,
          ];

          identifiersFields.forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });

          QueryModal.verifySubsetOfFieldsSortedAlphabetically(identifiersFields);

          // Step 2: Search instances by "Instance — Identifiers — Identifier type" field using "equals" operator
          QueryModal.clickSelectFieldButton();
          QueryModal.selectField(instanceFieldValues.identifiersIdentifierType);
          QueryModal.verifySelectedField(instanceFieldValues.identifiersIdentifierType);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('ISBN');
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C808447_FolioInstance', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyQueryAreaContent(
            '(instance.identifiers[*]->identifier_type_name == ISBN) AND (instance.title starts with AT_C808447_FolioInstance)',
          );

          const expectedInstancesToFind = [
            mappedInstancesDataToUIView[0],
            mappedInstancesDataToUIView[1],
          ];

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyIdentifiersEmbeddedTableInQueryModal(
              instance.hrid,
              instance.identifiers,
            );
          });

          QueryModal.verifyColumnDisplayed('Instance — Identifiers');

          const notExpectedToFindInstanceHrids = [
            mappedInstancesDataToUIView[2].hrid,
            mappedInstancesDataToUIView[3].hrid,
          ];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search instances by "Instance — Identifiers — Identifier" field using "contains" operator
          QueryModal.selectField(instanceFieldValues.identifiersIdentifier);
          QueryModal.verifySelectedField(instanceFieldValues.identifiersIdentifier);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('3518573');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyQueryAreaContent(
            '(instance.identifiers[*]->identifier_value contains 3518573) AND (instance.title starts with AT_C808447_FolioInstance)',
          );

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyIdentifiersEmbeddedTableInQueryModal(
              instance.hrid,
              instance.identifiers,
            );
          });
          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 4: Check display of Instance data from Preconditions in "Instance — Identifiers" column in the result table
          QueryModal.clickGarbage(0);
          QueryModal.clickTestQuery();
          QueryModal.verifyMatchedRecordsByIdentifier(
            mappedInstancesDataToUIView[3].hrid,
            'Instance — Identifiers',
            '',
          );
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns('Instance — Identifiers');
          QueryModal.clickShowColumnsButton();

          // Step 5: Verify Classifications fields are queryable under "Select options" dropdown
          const classificationsFields = [
            instanceFieldValues.classificationsClassification,
            instanceFieldValues.classificationsClassificationIdentifierType,
          ];

          classificationsFields.forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });

          QueryModal.verifySubsetOfFieldsSortedAlphabetically(classificationsFields);

          // Step 6: Search instances by "Instance — Classifications — Classification identifier type" field using "in" operator
          QueryModal.clickSelectFieldButton();
          QueryModal.selectField(instanceFieldValues.classificationsClassificationIdentifierType);
          QueryModal.verifySelectedField(
            instanceFieldValues.classificationsClassificationIdentifierType,
          );
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueMultiselect('NLM');
          QueryModal.fillInValueMultiselect('SUDOC');
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C808447_FolioInstance', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyQueryAreaContent(
            '(instance.classifications[*]->type_name in [NLM, SUDOC]) AND (instance.title starts with AT_C808447_FolioInstance)',
          );

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyClassificationsEmbeddedTableInQueryModal(
              instance.hrid,
              instance.classifications,
            );
          });
          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 7: Search instances by "Instance — Classifications — Classification" field using "starts with" operator
          QueryModal.selectField(instanceFieldValues.classificationsClassification);
          QueryModal.verifySelectedField(instanceFieldValues.classificationsClassification);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield('HC107.');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyQueryAreaContent(
            '(instance.classifications[*]->number starts with HC107.) AND (instance.title starts with AT_C808447_FolioInstance)',
          );

          expectedInstancesToFind.forEach((instance) => {
            QueryModal.verifyClassificationsEmbeddedTableInQueryModal(
              instance.hrid,
              instance.classifications,
            );
          });
          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 8: Check display of Instance data from Preconditions in "Instance — Classifications" column in the result table
          QueryModal.clickGarbage(0);
          QueryModal.clickTestQuery();
          QueryModal.verifyMatchedRecordsByIdentifier(
            mappedInstancesDataToUIView[3].hrid,
            'Instance — Classifications',
            '',
          );
        },
      );
    });
  });
});
