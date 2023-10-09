import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import { JOB_STATUS_NAMES } from '../../support/constants';

describe('MARC -› MARC Authority', () => {
  const testData = {
    expectedProperties: [
      'authRefType',
      'headingRef',
      'headingType',
      'id',
      'naturalId',
      'sourceFileId',
    ],
  };

  const marcFile = {
    marc: 'marcAuthFileC360532.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create SRS MARC Authority',
    authorityHeading: 'C360532 Cartoons & Comics',
  };

  before('Creating user, importing record', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.uploadFile(marcFile.marc, marcFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          testData.createdRecordID = link.split('/')[5];
        });
      });
    });
  });

  before('Login', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.marcAuthorities,
      waiter: MarcAuthorities.waitLoading,
    });
  });

  after('Deleting user, record', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    MarcAuthority.deleteViaAPI(testData.createdRecordID);
  });

  it(
    'C360532 Verify that "sourceFileId" and "naturalId" fields exist in response to search "MARC Authority" records. (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      MarcAuthorities.searchBy('Keyword', 'Cartoons & Comics');
      MarcAuthorities.verifyAuthorityPropertiesAfterSearch(testData.expectedProperties);
    },
  );
});
