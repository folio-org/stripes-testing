import TestTypes from '../../../../support/dictionary/testTypes';
import DevTeams from '../../../../support/dictionary/devTeams';
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
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('MARC -> MARC Bibliographic -> Edit MARC bib', () => {
  const testData = {
    validLDR: '01218nam\\a22002773c\\4500',
  };
  const marcFile = {
    marc: 'oneMarcBib.mrc',
    fileName: `testMarcFileC380397${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };
  const LDRValues = [
    {
      position: '5',
      value: '012181am\\a22002773c\\4500',
      error:
        'Record cannot be saved. Please enter a valid Leader 05. Valid values are listed at https://loc.gov/marc/bibliographic/bdleader.html',
    },
    {
      position: '6',
      value: '01218nbm\\a22002773c\\4500',
      error:
        'Record cannot be saved. Please enter a valid Leader 06. Valid values are listed at https://loc.gov/marc/bibliographic/bdleader.html',
    },
    {
      position: '7',
      value: '01218na!\\a22002773c\\4500',
      error:
        'Record cannot be saved. Please enter a valid Leader 07. Valid values are listed at https://loc.gov/marc/bibliographic/bdleader.html',
    },
    {
      position: '8',
      value: '01218namba22002773c\\4500',
      error:
        'Record cannot be saved. Please enter a valid Leader 08. Valid values are listed at https://loc.gov/marc/bibliographic/bdleader.html',
    },
    {
      position: '18',
      value: '01218nam\\a22002773$\\4500',
      error:
        'Record cannot be saved. Please enter a valid Leader 18. Valid values are listed at https://loc.gov/marc/bibliographic/bdleader.html',
    },
    {
      position: '19',
      value: '01218nam\\a22002773cd4500',
      error:
        'Record cannot be saved. Please enter a valid Leader 19. Valid values are listed at https://loc.gov/marc/bibliographic/bdleader.html',
    },
    {
      position: 'invalid',
      value: '012181b!ba22002773$d4500',
      error:
        'Record cannot be saved. Please enter a valid Leader 05, Leader 06, Leader 07, Leader 08, Leader 18 and Leader 19. Valid values are listed at https://loc.gov/marc/bibliographic/bdleader.html',
    },
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
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.user = createdUserProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created users, Instances', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceID);
    });
  });

  it(
    'C357567 Verify "LDR" validation rules with invalid data for editable positions "05", "06", "07", "08", "18", "19" when editing record (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(testData.instanceID);
      InventoryInstances.selectInstance();
      InventoryInstance.waitInventoryLoading();
      InventoryInstance.editMarcBibliographicRecord();
      cy.wrap(LDRValues).each((ldr) => {
        QuickMarcEditor.updateExistingField('LDR', testData.validLDR);
        QuickMarcEditor.updateExistingField('LDR', ldr.value);
        QuickMarcEditor.pressSaveAndClose();
        InteractorsTools.checkCalloutErrorMessage(ldr.error);
        QuickMarcEditor.verifyInvalidLDRCalloutLink();
        QuickMarcEditor.closeCallout();
      });
    },
  );
});
