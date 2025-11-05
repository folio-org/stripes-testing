import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      authority: {
        searchInput: 'C375118 The Beatles',
        searchOption: 'Keyword',
      },
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      marcFiles: [
        {
          marc: 'marcAuthFileForC375118.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ],
      expectedActions: ['Edit', 'Print'],
    };
    const createdAuthorityIDs = [];

    before('Create test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C375118*');
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('The Beatles');
      testData.marcFiles.forEach((marcFile) => {
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          testData.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIDs.push(record[marcFile.propertyName].id);
          });
        });
      });

      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      createdAuthorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C375118 "Print" option is located below "Edit" option in "Actions" menu for "MARC authority" record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C375118'] },
      () => {
        MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.searchInput);
        MarcAuthorities.selectTitle(testData.authority.searchInput);
        MarcAuthority.checkActionDropdownContent(testData.expectedActions);
      },
    );
  });
});
