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
        tag902: '902',
        tag948: '948',
        successMessage:
          'This record has successfully saved and is in process. Changes may not appear immediately.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC523592.mrc',
          fileName: `testMarcFileC523592.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
      ];

      const createdRecordIDs = [];

      before('Create test data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
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
        'C523592 "MARC validation rules check" modal appears during edit of MARC bib record (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C523592'] },
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

          QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag902);
          cy.wait(1000);
          QuickMarcEditor.deleteField(130);

          QuickMarcEditor.simulateSlowNetwork('**/records-editor/validate', 5000);

          QuickMarcEditor.pressSaveAndCloseButton();

          QuickMarcEditor.verifySlowInternetConnectionModal();

          cy.wait('@slowNetworkRequest');
          cy.wait(1500);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkDeletingFieldsModal();

          QuickMarcEditor.confirmDeletingFields();

          QuickMarcEditor.checkCallout(testData.successMessage);
          InventoryInstance.waitLoading();
        },
      );
    });
  });
});
