import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import Features from '../../support/dictionary/features';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthoritiesSearch from '../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import Users from '../../support/fragments/users/users';
import MarcAuthoritiesDelete from '../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC Authority management', () => {
  const testData = {
    uniqueFileName: `C350643autotestFile.${getRandomPostfix()}.mrc`,
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    recrod: 'Angelou, Maya. And still I rise',
    searchOption: 'Name-title',
  };

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.settingsDataImportView.gui,
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
  });

  afterEach('Deleting data', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();
  });

  after('Deleting created user', () => {
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it('C350643 Delete a "MARC Authority" record via "MARC Authority" app (spitfire)', { tags: [TestTypes.criticalPath, Features.authority, DevTeams.spitfire] }, () => {
    DataImport.importFile(MarcAuthority.defaultCreateJobProfile, testData.uniqueFileName);
    MarcAuthoritiesDelete.clickDeleteButton();
    MarcAuthoritiesDelete.checkDeleteModal();
    MarcAuthoritiesDelete.confirmDelete();
    MarcAuthoritiesDelete.checkDelete(MarcAuthority.defaultAuthority.headingReference);
    cy.visit(TopMenu.marcAuthorities);
    MarcAuthoritiesSearch.searchBy('Uniform title', MarcAuthority.defaultAuthority.headingReference);
    MarcAuthoritiesDelete.checkEmptySearchResults(MarcAuthority.defaultAuthority.headingReference);
  });

  it('C357549 Delete a "MARC Authority" record (from browse result list) (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    DataImport.uploadFile('marcFileForC357549.mrc', testData.fileName);
    DataImport.importFileForBrowse(MarcAuthority.defaultCreateJobProfile, testData.fileName);
    cy.visit(TopMenu.marcAuthorities);
    MarcAuthorities.switchToBrowse();
    MarcAuthorityBrowse.searchBy(testData.searchOption, testData.recrod);
    MarcAuthorities.selectItem(testData.recrod);
    MarcAuthority.waitLoading();
    MarcAuthoritiesDelete.clickDeleteButton();
    MarcAuthoritiesDelete.checkDeleteModal();
    MarcAuthoritiesDelete.confirmDelete();
    MarcAuthoritiesDelete.checkAfterDeletion(testData.recrod);
  });
});
