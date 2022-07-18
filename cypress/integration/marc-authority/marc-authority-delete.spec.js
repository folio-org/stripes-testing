import TestTypes from '../../support/dictionary/testTypes';
import Features from '../../support/dictionary/features';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import MarcAuthoritiesSearch from '../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import { getLongDelay } from '../../support/utils/cypressTools';
import Users from '../../support/fragments/users/users';
import marcAuthoritiesDelete from '../../support/fragments/marcAuthority/marcAuthoritiesDelete';

describe('MARC Authority management', () => {
  const testData = {
    userProperties: { name:'testname' },
    uniqueFileName: `autotestFile.${getRandomPostfix()}.mrc`
  };
  const importFile = (profileName) => {
    cy.visit(TopMenu.dataImportPath);

    DataImport.uploadFile(MarcAuthority.defaultAuthority.name, testData.uniqueFileName);
    JobProfiles.waitLoadingList();
    JobProfiles.select(profileName);
    JobProfiles.runImportFile(testData.uniqueFileName);
    JobProfiles.openFileRecords(testData.uniqueFileName);
    DataImport.getLinkToAuthority(MarcAuthority.defaultAuthority.headingReference).then(link => {
      cy.intercept({
        method: 'GET',
        url: `/metadata-provider/jobLogEntries/${link.split('/').at(-2)}/records/${link.split('/').at(-1)}`,
      }).as('getRecord');
      cy.visit(link);
      cy.wait('@getRecord', getLongDelay()).then(response => {
        testData.internalAuthorityId = response.response.body.relatedAuthorityInfo.idList[0];

        cy.visit(TopMenu.marcAuthorities);
        MarcAuthoritiesSearch.searchBy('Uniform title', MarcAuthority.defaultAuthority.headingReference);
        MarcAuthorities.select(testData.internalAuthorityId);
        MarcAuthority.waitLoading();
      });
    });
  };

  beforeEach(() => {
    cy.createTempUser([
      Permissions.settingsDataImportEnabled.gui,
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui
    ]).then(createdUserProperties => {
      testData.userProperties.id = createdUserProperties.userId;
      testData.userProperties.firstName = createdUserProperties.firstName;
      testData.userProperties.name = createdUserProperties.username;

      cy.login(createdUserProperties.username, createdUserProperties.password);
      importFile(MarcAuthority.defaultCreateJobProfile);
    });
  });

  afterEach('', () => {
    Users.deleteViaApi(testData.userProperties.id);
  });
  it('C350572 Edit an Authority record', { tags:  [TestTypes.smoke, Features.authority, DevTeams.spitfire] }, () => {
    marcAuthoritiesDelete.clickDeleteButton();
    marcAuthoritiesDelete.checkDeleteModal();
    marcAuthoritiesDelete.confirmDelete();
    marcAuthoritiesDelete.checkDelete(MarcAuthority.defaultAuthority.headingReference);
    cy.visit(TopMenu.marcAuthorities);
    MarcAuthoritiesSearch.searchBy('Uniform title', MarcAuthority.defaultAuthority.headingReference);
    marcAuthoritiesDelete.checkEmptySearchResults(MarcAuthority.defaultAuthority.headingReference);
  });
});
