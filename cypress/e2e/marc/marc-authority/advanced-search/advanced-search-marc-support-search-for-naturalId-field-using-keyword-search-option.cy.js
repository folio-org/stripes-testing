import getRandomPostfix from '../../../../support/utils/stringTools';
import { Permissions } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Advanced Search', () => {
      const testData = {
        marcFile: {
          marc: 'C350617MarcAuth.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
        },
      };
      const createdAuthorityIDs = [];

      before(() => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          testData.marcFile.marc,
          testData.marcFile.fileName,
          testData.marcFile.jobProfileToRun,
        ).then((response) => {
          response.entries.forEach((record) => {
            createdAuthorityIDs.push(record.relatedAuthorityInfo.idList[0]);
          });
        });

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C350617 Advanced search MARC: support search for "naturalId" field using "Keyword" search option (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          // Step 1: Click on the "Advanced search" button at the "Search & filter" pane.
          MarcAuthorities.clickAdvancedSearchButton();

          // Step 2: Fill in 3 first rows with "naturalId" values of records which have "space" between prefix and identifier value in "001" or "010" fields.
          MarcAuthorities.fillAdvancedSearchField(0, 'n83169267', 'Keyword');
          MarcAuthorities.fillAdvancedSearchField(1, 'n80036674407668', 'Keyword', 'OR');
          MarcAuthorities.fillAdvancedSearchField(2, 'n20110491614076272', 'Keyword', 'OR');

          // Step 3: Click on "Search" button.
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkAdvancedSearchModalAbsence();
          MarcAuthorities.checkResultList([
            'Lee, Stan, 1922-2018',
            'Kerouac, Jack, 1922-1969',
            'Lentz, Mark',
          ]);
        },
      );
    });
  });
});
