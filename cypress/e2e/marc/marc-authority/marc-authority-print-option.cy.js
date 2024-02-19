import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../support/fragments/users/users';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      authority: {
        searchInput: 'Beatles',
        searchOption: 'Keyword',
      },
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      marcFiles: [
        {
          marc: 'marcAuthFileForC380635.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          numOfRecords: 1,
          propertyName: 'relatedAuthorityInfo',
        },
      ],
    };
    const createdAuthorityIDs = [];

    before('Create test data', () => {
      cy.getAdminToken();
      testData.marcFiles.forEach((marcFile) => {
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          testData.jobProfileToRun,
        ).then((response) => {
          response.entries.forEach((record) => {
            createdAuthorityIDs.push(record[marcFile.propertyName].idList[0]);
          });
        });
      });

      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
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
      'C380635 "Print" option is located below "Edit" option in "Actions" menu for "MARC authority" record (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.searchInput);
        MarcAuthorities.selectFirstRecord();
        MarcAuthority.checkActionDropdownContent();
      },
    );
  });
});
