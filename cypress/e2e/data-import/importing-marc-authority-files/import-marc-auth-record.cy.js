import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../support/fragments/users/users';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const testData = {
      createdRecordIDs: [],
      searchOption: 'Keyword',
      createdRecordTitle: 'C350666 Chin, Staceyann, 1972- Crossfire.',
      createdRecord1XXcontent: '$a C350666 Chin, Staceyann, $d 1972- $t Crossfire. $h Spoken word',
    };
    const marcFile = {
      marc: 'marcAuthFileForC350666.mrc',
      fileName: `C350666_testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numOfRecords: 1,
      authorityHeading: 'C350666 Chin, Staceyann, 1972- Crossfire. Spoken word',
      propertyName: 'authority',
    };
    const propertyName = 'authority';
    let createdAuthorityID;

    before('Create test data and login', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C350666*');

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('Deleting data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID);
    });

    it(
      'C350666 Create a MARC authority record via data import (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C350666'] },
      () => {
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityID = record[propertyName].id;
          });
        });
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.waitLoading();
        MarcAuthorities.searchBy(testData.searchOption, testData.createdRecordTitle);
        MarcAuthorities.selectTitle(testData.createdRecordTitle);
        MarcAuthority.contains(testData.createdRecord1XXcontent);
      },
    );
  });
});
