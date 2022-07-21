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

describe('MARC Authority management', () => {
  const testData = {
    userProperties: { name:'testname' },
    uniqueFileName: `autotestFile.${getRandomPostfix()}.mrc`
  };

  beforeEach(() => {
    cy.createTempUser([
      Permissions.settingsDataImportEnabled.gui,
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;

      cy.login(createdUserProperties.username, createdUserProperties.password, { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      DataImport.importFile(MarcAuthority.defaultCreateJobProfile, testData.uniqueFileName);
    });
  });

  afterEach('', () => {
    Users.deleteViaApi(testData.userProperties.userId);
  });
  it('C350572 Edit an Authority record (spitfire)', { tags:  [TestTypes.smoke, Features.authority, DevTeams.spitfire] }, () => {
    MarcAuthoritiesDelete.clickDeleteButton();
    MarcAuthoritiesDelete.checkDeleteModal();
    MarcAuthoritiesDelete.confirmDelete();
    MarcAuthoritiesDelete.checkDelete(MarcAuthority.defaultAuthority.headingReference);
    cy.visit(TopMenu.marcAuthorities);
    MarcAuthoritiesSearch.searchBy('Uniform title', MarcAuthority.defaultAuthority.headingReference);
    MarcAuthoritiesDelete.checkEmptySearchResults(MarcAuthority.defaultAuthority.headingReference);
  });
});
