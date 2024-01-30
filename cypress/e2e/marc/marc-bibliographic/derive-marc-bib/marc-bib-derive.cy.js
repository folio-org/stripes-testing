import { JOB_STATUS_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySteps from '../../../../support/fragments/inventory/inventorySteps';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        tag245: '245',
        newTitle: `Derived_Bib_${getRandomPostfix()}`,
        marcFile: {
          marc: 'marcBibFileC396356.mrc',
          fileName: `testMarcFileC396356.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        },
      };

      const createdRecordIDs = [];

      before('Creating data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
            () => {
              DataImport.verifyUploadState();
              DataImport.uploadFile(testData.marcFile.marc, testData.marcFile.fileName);
              JobProfiles.search(testData.marcFile.jobProfileToRun);
              JobProfiles.runImportFile();
              JobProfiles.waitFileIsImported(testData.marcFile.fileName);
              Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
              Logs.openFileDetails(testData.marcFile.fileName);
              Logs.getCreatedItemsID().then((link) => {
                createdRecordIDs.push(link.split('/')[5]);
                cy.login(testData.userProperties.username, testData.userProperties.password, {
                  path: `${TopMenu.inventoryPath}/view/${createdRecordIDs[0]}`,
                  waiter: InventoryInstances.waitContentLoading,
                });
              });
            },
          );
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdRecordIDs.forEach((recordID) => {
          InventoryInstance.deleteInstanceViaApi(recordID);
        });
      });

      it(
        'C396356 "Entered" value in "008" field updated when deriving new "MARC Bib" record (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.checkSubfieldsPresenceInTag008();
          QuickMarcEditor.updateExistingField(testData.tag245, testData.newTitle);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.checkInstanceTitle(testData.newTitle);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkSubfieldsPresenceInTag008();
          QuickMarcEditor.saveInstanceIdToArrayInQuickMarc(createdRecordIDs).then(() => {
            cy.getAdminToken();
            InventorySteps.verifyHiddenFieldValueIn008(
              createdRecordIDs[1],
              'Entered',
              DateTools.getCurrentDateYYMMDD(),
            );
          });
        },
      );
    });
  });
});
