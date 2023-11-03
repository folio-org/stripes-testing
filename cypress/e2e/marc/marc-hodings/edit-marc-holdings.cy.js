import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { LOCATION_NAMES, JOB_STATUS_NAMES } from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import Users from '../../../support/fragments/users/users';

describe('MARC -> MARC Holdings', () => {
  let user;
  let instanceHrid;

  const testData = {
    // oclc: '1007797324',
    // OCLCAuthentication: '100481406/PAOLF',
    fileNameForCreateInstance: `C359241 autotestFileName.${getRandomPostfix()}`,
    // filePathForCreateInstance: 'oneMarcBib.mrc',
    // jobProfileForCreateInstance: 'Default - Create instance and SRS MARC Bib',
    fileNameForCreateHoldings: `C359241 autotestFileName.${getRandomPostfix()}`,
    fileName: `C359241 autotestFileName.${getRandomPostfix()}`,
    filePath: 'marcBibFileForC359241.mrc',
    // fileNameForCreateHoldings: `C359241 autotestFileName.${getRandomPostfix()}`,
    jobProfileForRun: 'Default - Create Holdings and SRS MARC Holdings',
    // tag852: '852',
    // headerTitle: 'Create a new MARC Holdings record',
  };

  before('create test data and login', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    // DataImport.uploadFileViaApi('oneMarcBib.mrc', testData.fileNameForCreateInstance);
    // JobProfiles.waitFileIsImported(testData.fileNameForCreateInstance);
    // Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
    // Logs.openFileDetails(testData.fileNameForCreateInstance);
    // FileDetails.openInstanceInInventory('Created');
    // InstanceRecordView.verifyInstancePaneExists();
    // InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
    //   instanceHrid = initialInstanceHrId;

    // DataImport.editMarcFile(
    //   testData.filePath,
    //   testData.fileName,
    //   ['in11887186'],
    //   [initialInstanceHrId],
    // );
    // });
    // // upload a marc file for creating holdings
    cy.visit(TopMenu.dataImportPath);
    // // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
    // DataImport.verifyUploadState();
    // DataImport.uploadFile(testData.fileName, testData.fileNameForCreateHoldings);
    // JobProfiles.search(testData.jobProfileForRun);
    // JobProfiles.runImportFile();
    // JobProfiles.waitFileIsImported(testData.fileNameForCreateHoldings);
    // Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
    // cy.logout();

    // cy.createTempUser([
    //   Permissions.inventoryAll.gui,
    //   Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
    // ]).then((userProperties) => {
    //   user = userProperties;

    //   cy.login(user.username, user.password,
    //     { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    // Logs.openFileDetails(testData.fileNameForCreateHoldings);
    Logs.openFileDetails('C359241 autotestFileName.302.4439797476855898');
    FileDetails.openHoldingsInInventory('Created');
    // HoldingsRecordView.checkHoldingRecordViewOpened();
    // cy.pause();
    // });
  });

  it(
    'C359241 Edit MARC Holdings | Displaying of placeholder message when user deletes a row (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      HoldingsRecordView.editInQuickMarc();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.addNewField('', '', 13);
      QuickMarcEditor.checkContent('', 14);
      QuickMarcEditor.addNewField('151', '', 14);
      QuickMarcEditor.checkContent('', 15);
      QuickMarcEditor.addNewField('', 'Filled', 15);
      QuickMarcEditor.checkContent('Filled', 16);
      QuickMarcEditor.addNewField('400', 'Value', 16);
      QuickMarcEditor.checkContent('Value', 17);
      QuickMarcEditor.checkButtonsEnabled();
      // ***
      QuickMarcEditor.deleteField(14);
      cy.wait(1000);
      QuickMarcEditor.deleteField(14);
      cy.wait(1000);
      QuickMarcEditor.deleteField(14);
      cy.wait(1000);
      QuickMarcEditor.deleteField(14);
      cy.wait(1000);
      QuickMarcEditor.checkButtonsDisabled();
      // ***
      QuickMarcEditor.deleteField(13);
      QuickMarcEditor.afterDeleteNotification('871');
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.verifyTagValue(13, '871');
      QuickMarcEditor.checkContent('$8 0 $a v.1/50 (1950/1999)', 13);
      QuickMarcEditor.addValuesToExistingField(9, '861', '$8 0 $a v.54-68 (2003-2017)', '4', '1');
      QuickMarcEditor.addValuesToExistingField(10, '868', '$8 0 $a test', '4', '1');
      QuickMarcEditor.addValuesToExistingField(11, '856', '$8 0 $a test1', '4', '1');
      QuickMarcEditor.addValuesToExistingField(12, '', '$8 0 $a v.1/50 (1950/1999)', '4', '1');
      cy.wait(2000);
      // ***
      QuickMarcEditor.deleteField(10);
      QuickMarcEditor.afterDeleteNotification('861');
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.verifyTagValue(9, '861');

      QuickMarcEditor.deleteField(10);
      QuickMarcEditor.afterDeleteNotification('868');
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.verifyTagValue(9, '868');

      QuickMarcEditor.deleteField(10);
      QuickMarcEditor.afterDeleteNotification('856');
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.verifyTagValue(9, '856');

      QuickMarcEditor.deleteField(10);
      QuickMarcEditor.afterDeleteNotification('');
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.verifyTagValue(9, '');
      cy.pause();
      // ***
      QuickMarcEditor.deleteField(7);
      QuickMarcEditor.afterDeleteNotification('035');

      QuickMarcEditor.deleteField(10);
      QuickMarcEditor.afterDeleteNotification('856');

      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkDeletingFieldsModal();
      QuickMarcEditor.cancelDeletingField();
      cy.pause();
      QuickMarcEditor.verifyTagValue(7, '035');
      QuickMarcEditor.checkContent('$a 445553', 7);
      QuickMarcEditor.verifyTagValue(10, '856');
      QuickMarcEditor.checkContent('$8 0 $a test1', 10);
      // ***
      QuickMarcEditor.deleteField(5);
      QuickMarcEditor.afterDeleteNotification('014');
      QuickMarcEditor.deleteField(13);
      QuickMarcEditor.afterDeleteNotification('870');
      QuickMarcEditor.pressSaveAndClose();
    },
  );
});
