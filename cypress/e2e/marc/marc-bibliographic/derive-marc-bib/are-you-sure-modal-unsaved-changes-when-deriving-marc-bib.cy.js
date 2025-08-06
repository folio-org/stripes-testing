import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
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
    describe('Derive MARC bib', () => {
      const testData = {};
      const marcFile = {
        marc: 'marcBibFileForC434153.mrc',
        fileName: `testMarcFileC434153.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };
      let createdRecordIDs;

      before('Creating data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.dataImportUploadAll.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs = record[marcFile.propertyName].id;
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

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs);
      });

      it(
        'C434153 "Are you sure?" modal is displayed after user pressed "ESC" button when record has unsaved changes - Derive a new MARC bib record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C434153'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs);
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.byShared('No');
          });
          InventoryInstance.selectTopRecord();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.addNewField('010', '$a   766384', 6);
          QuickMarcEditor.verifySaveAndCloseButtonEnabled();
          QuickMarcEditor.discardChangesWithEscapeKey(5);
          QuickMarcEditor.cancelEditConfirmationPresented();
        },
      );
    });
  });
});
