import { Permissions } from '../../../../support/dictionary';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import '../../../../support/api/specifications';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        requiredStandardFields: ['700', '800'],
        requiredLocalField: '980',
        testFieldContent: '$a C514969 Test update for required fields validation',
        expectedRequiredErrors: [
          'Field 700 is required.',
          'Field 800 is required.',
          'Field 980 is required.',
        ],
        marcFile: {
          marc: 'marcBibFileC514969.mrc',
          fileName: `testMarcFileC514969.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
      };

      const createdRecordIDs = [];
      const createdRuleFieldIds = [];
      const updatedStandardFieldIds = [];
      let bibliographicSpecId;

      before('Create user and data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          DataImport.uploadFileViaApi(
            testData.marcFile.marc,
            testData.marcFile.fileName,
            testData.marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs.push(record[testData.marcFile.propertyName].id);
            });

            cy.getSpecificationIds().then((specs) => {
              const bibliographicSpec = specs.find((s) => s.profile === 'bibliographic');
              bibliographicSpecId = bibliographicSpec.id;

              cy.getSpecificationFields(bibliographicSpecId).then((fieldsResponse) => {
                const existingFields = fieldsResponse.body.fields;

                testData.requiredStandardFields.forEach((tag) => {
                  const field = existingFields.find((f) => f.tag === tag);
                  if (field) {
                    updatedStandardFieldIds.push(field.id);
                    cy.updateSpecificationField(field.id, {
                      ...field,
                      required: true,
                    });
                  }
                });

                cy.createSpecificationField(bibliographicSpecId, {
                  tag: testData.requiredLocalField,
                  label: 'Test Field - Required Local Field',
                  required: true,
                }).then((fieldResponse) => {
                  createdRuleFieldIds.push(fieldResponse.body.id);
                });
              });
            });
          });
        });
      });

      beforeEach('Login', () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        cy.getSpecificationFields(bibliographicSpecId).then((fieldsResponse) => {
          const existingFields = fieldsResponse.body.fields;

          updatedStandardFieldIds.forEach((fieldId) => {
            const field = existingFields.find((f) => f.id === fieldId);
            if (field) {
              cy.updateSpecificationField(fieldId, {
                ...field,
                required: false,
              });
            }
          });
        });

        createdRuleFieldIds.forEach((fieldId) => {
          cy.deleteSpecificationField(fieldId);
        });

        createdRecordIDs.forEach((recordId) => {
          InventoryInstance.deleteInstanceViaApi(recordId);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C514969 Cannot derive MARC bib record without required fields (Standard and Local) (spitfire)',
        { tags: ['criticalPathFlaky', 'spitfire', 'C514969', 'nonParallel'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.deriveNewMarcBib();

          [...testData.requiredStandardFields, testData.requiredLocalField].forEach((tag) => {
            QuickMarcEditor.checkTagAbsent(tag);
          });

          QuickMarcEditor.updateExistingField('245', testData.testFieldContent);

          QuickMarcEditor.pressSaveAndCloseButton();

          testData.expectedRequiredErrors.forEach((errorMessage) => {
            QuickMarcEditor.checkCallout(errorMessage);
          });

          QuickMarcEditor.verifyValidationCallout(0, testData.expectedRequiredErrors.length);

          QuickMarcEditor.checkButtonSaveAndCloseEnable();
        },
      );
    });
  });
});
