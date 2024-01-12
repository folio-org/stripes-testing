import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC -> MARC Bibliographic -> Edit MARC bib', () => {
  const testData = {
    tag245: '245',
    tag250: '250',
    rowNumber: 14,
    title: 'C375124 The Journal of ecclesiastical history.',
    content: '$a C375124',
  };
  const marcFiles = [
    {
      marc: 'marcBibFileForC375124.mrc',
      fileName: `testMarcFileC375124.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
  ];
  const instanceIds = [];

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        marcFiles.forEach((marcFile) => {
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(marcFile.fileName);
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
    'C375124 User unable to delete "245" field for "MARC bibliographic" record when editing record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(testData.title);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.checkFieldsExist([testData.tag245]);
      QuickMarcEditor.verifyEditableFieldIcons(testData.rowNumber, false);
      QuickMarcEditor.addNewField(testData.tag250, testData.content, testData.rowNumber);
      QuickMarcEditor.updateExistingTagName(testData.tag250, testData.tag245);
      QuickMarcEditor.verifyEditableFieldIcons(testData.rowNumber + 1, false);
    },
  );
});
