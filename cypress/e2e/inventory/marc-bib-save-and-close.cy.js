import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../support/constants';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';

describe('MARC › MARC Bibliographic › Edit MARC bib', () => {
  const testData = {
    tag245rowIndex: 14,
    tag245value1: '$a Edited $h [Sound Recording] / $c Cypress Automation',
    instanceTitle1: 'Instance • Edited [Sound Recording] / Cypress Automation',
    tag245value2: '$a Edited Twice $h [Sound Recording] / $c Cypress Automation',
    instanceTitle2: 'Instance • Edited Twice [Sound Recording] / Cypress Automation',
    expectedInSourceRow: '245\t1 0\t‡a Edited ‡h [Sound Recording] / ‡c Cypress Automation',
    successMsg:
      'This record has successfully saved and is in process. Changes may not appear immediately.',
  };
  const marcFile = {
    marc: 'marcBibFileC360097.mrc',
    fileName: `testMarcFileC360097.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };
  const instanceIDs = [];

  before('Creating test user and an inventory instance', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          instanceIDs.push(link.split('/')[5]);
        });
      });
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      }).then(() => {
        InventoryInstances.waitContentLoading();
        InventoryInstance.searchByTitle(instanceIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
      });
    });
  });

  after('Deleting test user and an inventory instance', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(instanceIDs[0]);
  });

  it(
    'C360097 Verify updates are saved after clicking "Save & keep editing" button in "MARC Bibliographic" edit mode (Spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      QuickMarcEditor.updateExistingFieldContent(testData.tag245rowIndex, testData.tag245value1);
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.pressSaveAndKeepEditing(testData.successMsg);
      QuickMarcEditor.checkContent(testData.tag245value1, testData.tag245rowIndex);
      QuickMarcEditor.closeUsingCrossButton();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyInstanceTitle(testData.instanceTitle1);
      InventoryInstance.viewSource();
      InventoryViewSource.contains(testData.expectedInSourceRow);
      InventoryViewSource.close();
      InventoryInstance.waitLoading();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.updateExistingFieldContent(testData.tag245rowIndex, testData.tag245value2);
      QuickMarcEditor.pressSaveAndKeepEditing(testData.successMsg);
      QuickMarcEditor.checkContent(testData.tag245value2, testData.tag245rowIndex);
      cy.go('back');
      InventoryInstance.waitLoading();
      InventoryInstance.verifyInstanceTitle(testData.instanceTitle2);
    },
  );
});
