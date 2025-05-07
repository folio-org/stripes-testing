import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        tag001: '001',
        tag001Content: '$a n 94000339',
        tag001ValueInSourceMask: /[a-z]+\d+/,
      };

      const marcFiles = [
        {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
      ];

      const createdRecordIDs = [];

      before('Create test data', () => {
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordIDs.push(record[marcFile.propertyName].id);
              });
            });
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
            InventoryInstances.waitContentLoading();
          }, 20_000);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      });

      it(
        'C387458 Add multiple 001s when editing "MARC Bibliographic" record (spitfire)(TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C387458'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.verifyInstanceResultListIsAbsent(false);
          cy.ifConsortia(() => {
            InventorySearchAndFilter.byShared('No');
            InventoryInstances.verifyInstanceResultListIsAbsent(false);
          });
          InventoryInstances.selectInstance();

          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();

          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.checkEmptyFieldAdded(5);

          QuickMarcEditor.updateExistingField('', testData.tag001Content);
          QuickMarcEditor.updateTagNameToLockedTag(5, testData.tag001);
          QuickMarcEditor.checkFourthBoxEditable(5, false);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.waitLoading();

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyNoDuplicatedFieldsWithTag(testData.tag001);
          QuickMarcEditor.checkFieldContentMatch(
            'textarea[name="records[1].content"]',
            testData.tag001ValueInSourceMask,
          );
        },
      );
    });
  });
});
