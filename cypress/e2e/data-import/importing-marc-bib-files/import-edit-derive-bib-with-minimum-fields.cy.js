import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import DateTools from '../../../support/utils/dateTools';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      initialTitle: 'Bare Minimum Bib',
      updatedTitleEdit: 'Bare Minimum Bib (after edit)',
      updatedTitleDerive: 'Bare Minimum Bib (after derive)',
      initial008EnteredValue: '750907',
      expectedFieldsInQuickMarc: ['LDR', '001', '008', '005', '245', '999'],
      marcFile: {
        marc: 'MARC_Bib_bare_minimum_C387435.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      },
    };

    const createdRecordIDs = [];

    before('Creating data', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Deleting created user and data', () => {
      Users.deleteViaApi(testData.userProperties.userId);
      createdRecordIDs.forEach((recordID) => {
        InventoryInstance.deleteInstanceViaApi(recordID);
      });
    });

    it(
      'C387435 Import and edit/derive "MARC Bib" record having only required fields (spitfire)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        DataImport.uploadFile(testData.marcFile.marc, testData.marcFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(testData.marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          createdRecordIDs.push(link.split('/')[5]);
          Logs.goToTitleLink('Created');
          InventoryInstance.checkInstanceTitle(testData.initialTitle);

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkFieldsExist(testData.expectedFieldsInQuickMarc);
          QuickMarcEditor.checkFieldsCount(testData.expectedFieldsInQuickMarc.length);
          InventorySteps.verifyHiddenFieldValueIn008(
            createdRecordIDs[0],
            'Entered',
            testData.initial008EnteredValue,
          );
          QuickMarcEditor.updateExistingField('245', '$a ' + testData.updatedTitleEdit);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.checkFieldsExist(testData.expectedFieldsInQuickMarc);
          QuickMarcEditor.checkFieldsCount(testData.expectedFieldsInQuickMarc.length);
          QuickMarcEditor.checkContent('$a ' + testData.updatedTitleEdit, 4);
          QuickMarcEditor.updateExistingField('245', testData.updatedTitleDerive);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkFieldsExist(testData.expectedFieldsInQuickMarc);
          QuickMarcEditor.checkFieldsCount(testData.expectedFieldsInQuickMarc.length);
          QuickMarcEditor.checkContent('$a ' + testData.updatedTitleDerive, 4);
          QuickMarcEditor.saveInstanceIdToArrayInQuickMarc(createdRecordIDs).then(() => {
            InventorySteps.verifyHiddenFieldValueIn008(
              createdRecordIDs[1],
              'Entered',
              DateTools.getCurrentDateYYMMDD(),
            );
          });
        });
      },
    );
  });
});
