import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Users from '../../../../support/fragments/users/users';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';

describe('MARC -> MARC Bibliographic -> Edit MARC bib', () => {
  const testData = {
    absent008Fields: ['ELvl', 'Desc'],
  };
  const marcFile = {
    marc: 'oneMarcBib.mrc',
    fileName: `testMarcFileC380398${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };
  const LDRvalues = [
    // 05
    '01218aam\\a22002773c\\4500',
    '01218cam\\a22002773c\\4500',
    '01218dam\\a22002773c\\4500',
    '01218nam\\a22002773c\\4500',
    '01218pam\\a22002773c\\4500',
    // 08
    '01218nam a22002773c\\4500',
    '01218namaa22002773c\\4500',
    '01218nam\\a22002773c\\4500',
    // 17
    '01218nam\\a2200277Ac\\4500',
    '01218nam\\a2200277vc\\4500',
    '01218nam\\a22002778c\\4500',
    '01218nam\\a2200277?c\\4500',
    // 18
    '01218nam\\a22002773 \\4500',
    '01218nam\\a22002773a\\4500',
    '01218nam\\a22002773\\\\4500',
    '01218nam\\a22002773c\\4500',
    '01218nam\\a22002773i\\4500',
    '01218nam\\a22002773n\\4500',
    '01218nam\\a22002773u\\4500',
    // 19
    '01218nam\\a22002773c 4500',
    '01218nam\\a22002773ca4500',
    '01218nam\\a22002773c\\4500',
    '01218nam\\a22002773cb4500',
    '01218nam\\a22002773cc4500',
  ];

  before('Create user and data', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
      DataImport.verifyUploadState();
      DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(marcFile.jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFile.fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(marcFile.fileName);
      Logs.getCreatedItemsID().then((link) => {
        testData.instanceID = link.split('/')[5];
      });
    });

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
    ]).then((createdUserProperties) => {
      testData.user = createdUserProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceID);
    });
  });

  it(
    'C380398 Verify "LDR" validation rules with valid data for positions 05, 08, 17, 18, 19 when deriving record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      cy.wrap(LDRvalues).each((LDRvalue) => {
        InventoryInstances.searchByTitle(testData.instanceID);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.deriveNewMarcBibRecord();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.check008FieldsAbsent(...testData.absent008Fields);
        QuickMarcEditor.updateExistingField('LDR', LDRvalue);
        QuickMarcEditor.checkButtonSaveAndCloseEnable();
        QuickMarcEditor.pressSaveAndClose();
        InventoryInstance.waitInventoryLoading();
        InventoryInstances.resetAllFilters();
      });
    },
  );
});
