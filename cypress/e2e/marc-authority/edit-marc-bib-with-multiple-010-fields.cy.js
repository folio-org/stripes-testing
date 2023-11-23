import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TestTypes from '../../support/dictionary/testTypes';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('MARC -> MARC Bibliographic -> Edit MARC bib', () => {
  const testData = {
    tag010: '010',
    tag011: '011',
    tag010Values: ['58020553', '766384'],
  };
  const marcFiles = [
    {
      marc: 'marcBibFileForC380643.mrc',
      fileName: `testMarcFileC380643.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcBibFileForC380645.mrc',
      fileName: `testMarcFileC380645.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
  ];
  const instanceIds = [];
  const calloutMessage = 'Record cannot be saved with more than one 010 field';

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        // #1 - #4 upload test marcBibFile
        marcFiles.forEach((marcFile) => {
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          Logs.getCreatedItemsID().then((link) => {
            instanceIds.push(link.split('/')[5]);
          });
          cy.visit(TopMenu.dataImportPath);
        });
      });
    });
  });

  beforeEach('Login with User', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    instanceIds.forEach((id) => {
      InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C380643 Editing imported "MARC Bibliographic" record with multiple "010" fields (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.searchByTitle('C380643 The Journal of ecclesiastical history.');
      InventoryInstances.selectInstance();

      // #5 Click on the "Actions" button placed on the third pane >> Select "Edit MARC bibliographic record" option.
      InventoryInstance.editMarcBibliographicRecord();
      // * Two fields "010" are shown.
      QuickMarcEditor.verifyNumOfFieldsWithTag(testData.tag010, 2);

      // #6 Edit any field of "MARC Bibliographic" record (except "010").
      QuickMarcEditor.updateExistingField('245', `$a ${getRandomPostfix()}`);

      // #7 Click "Save & close" button
      QuickMarcEditor.pressSaveAndClose();
      InteractorsTools.checkCalloutMessage(calloutMessage, 'error');

      // #8 Change tag value of second "010" field to "011".
      QuickMarcEditor.updateExistingTagValue(5, testData.tag011);
      // Only one field "010" is shown. For example:
      QuickMarcEditor.verifyNumOfFieldsWithTag(testData.tag010, 1);

      // #9 Click "Save & close" button
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      // #10 Click on the "Actions" >> "View source".
      InventoryInstance.viewSource();
      // * Only one "010" field is displayed, according to changes made by user at step 8.
      InventoryViewSource.verifyRecordNotContainsDuplicatedContent(testData.tag010);
    },
  );

  it(
    'C380645 Edit "MARC Bibliographic" record with multiple "010" fields (spitfire) (TaaS)',
    { tags: ['extendedPath', DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle('C380645 The Journal of ecclesiastical history.');
      InventoryInstances.selectInstance();

      // # 1 Click on the "Actions" button placed on the third pane >> Select "Edit MARC bibliographic record" option.
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyNumOfFieldsWithTag(testData.tag010, 1);

      // # 2 Edit any field of "MARC Bibliographic" record (except "010").
      QuickMarcEditor.updateExistingField('245', `$a ${getRandomPostfix()}`);
      QuickMarcEditor.checkButtonsEnabled();

      // # 3 Add new "010" field and fill in it as specified: 010  \\$a   766384
      QuickMarcEditor.addNewField('010', '766384', 4);
      QuickMarcEditor.checkContent('766384', 5);

      // # 4 Click "Save & close" button
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.verifyAndDismissMultiple010TagCallout();

      // # 5 Click "Save & keep editng" button
      cy.wait(1000);
      QuickMarcEditor.clickSaveAndKeepEditingButton();
      QuickMarcEditor.verifyAndDismissMultiple010TagCallout();

      // # 6 Delete one of the "010" fields.
      QuickMarcEditor.deleteField(5);
      QuickMarcEditor.verifyNumOfFieldsWithTag(testData.tag010, 1);

      // # 7 Click "Save & keep editing" button
      QuickMarcEditor.clickSaveAndKeepEditing();
      QuickMarcEditor.verifyNumOfFieldsWithTag(testData.tag010, 1);
    },
  );
});
