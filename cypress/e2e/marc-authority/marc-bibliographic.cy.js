import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';

describe('MARC -> MARC Bibliographic', () => {
  const testData = {};
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
  const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
  const tagArray = ['100', '110', '111', '130', '240', '600', '610', '611', '630', '650', '651', '655', '700', '710', '711', '730', '800', '810', '811', '830']
  let createdInstanceID;

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      Permissions.moduleDataImportEnabled.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
    });

    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
      DataImport.uploadFile('marcFileForC360542.mrc', fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.searchJobProfileForImport(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(fileName);
      Logs.getCreatedItemsID().then(link => {
        createdInstanceID = link.split('/')[5];
      });
      Logs.goToTitleLink('Created');
    });
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();

    if (createdInstanceID) InventoryInstance.deleteInstanceViaApi(createdInstanceID);
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it('C360542 Verify that "Link to MARC Authority record" icon displays next to MARC fields when deriving Bib record (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    InventoryInstance.deriveNewMarcBib();
    tagArray.forEach(tag => {
      QuickMarcEditor.checkLinkButtonExist(tag);
    });
  });
});
