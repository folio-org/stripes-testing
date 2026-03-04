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
import { findLocalField } from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        tag980: '980',
        field980One: '$a C552356 First not-repeatable field',
        field980Two: '$a C552356 Second not-repeatable field',
        expectedNonRepeatableError: 'Field is non-repeatable.',
        marcFile: {
          marc: 'marcBibFileC552356.mrc',
          fileName: `testMarcFileC552356.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
      };

      const createdRecordIDs = [];
      let createdRuleFieldId;
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

              cy.getSpecificationFields(bibliographicSpecId).then((fieldsResp) => {
                const existingSpecField = findLocalField(fieldsResp.body.fields, testData.tag980);
                if (existingSpecField) cy.deleteSpecificationField(existingSpecField.id);

                cy.createSpecificationField(bibliographicSpecId, {
                  tag: testData.tag980,
                  label: 'C552356 Test Field - Non-repeatable Local',
                  repeatable: false,
                  required: true,
                }).then((fieldResponse) => {
                  createdRuleFieldId = fieldResponse.body.id;
                });
              });
            });
          });
        });
      });

      beforeEach('Login', () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        }, 20_000);
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        cy.deleteSpecificationField(createdRuleFieldId);
        createdRecordIDs.forEach((recordId) => {
          InventoryInstance.deleteInstanceViaApi(recordId);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C552356 Cannot derive MARC bib record with multiple not-repeatable "Local" fields (spitfire)',
        { tags: ['extendedPathFlaky', 'spitfire', 'C552356', 'nonParallel'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.deriveNewMarcBib();

          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.addEmptyFields(5);
          QuickMarcEditor.updateExistingTagValue(5, testData.tag980);
          QuickMarcEditor.updateExistingFieldContent(5, testData.field980One);
          QuickMarcEditor.updateExistingTagValue(6, testData.tag980);
          QuickMarcEditor.updateExistingFieldContent(6, testData.field980Two);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(6, testData.expectedNonRepeatableError);
          QuickMarcEditor.verifyValidationCallout(0, 1);
        },
      );
    });
  });
});
