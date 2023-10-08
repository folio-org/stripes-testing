import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import Users from '../../support/fragments/users/users';
import MarcAuthoritiesDelete from '../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC Authority Delete', () => {
  const testData = {
    record: 'Angelou, Maya. And still I rise',
    searchOption: 'Name-title',
  };

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.settingsDataImportView.gui,
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    });
  });

  after('Deleting created user', () => {
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'Delete a "MARC Authority" record',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      cy.visit(TopMenu.marcAuthorities);
      MarcAuthorities.switchToBrowse();
      MarcAuthorityBrowse.searchBy(testData.searchOption, testData.record);
      MarcAuthoritiesDelete.clickDeleteButton();
      MarcAuthoritiesDelete.checkDeleteModal();
      MarcAuthoritiesDelete.confirmDelete();
      MarcAuthoritiesDelete.checkAfterDeletion(testData.record);
    },
  );
});
