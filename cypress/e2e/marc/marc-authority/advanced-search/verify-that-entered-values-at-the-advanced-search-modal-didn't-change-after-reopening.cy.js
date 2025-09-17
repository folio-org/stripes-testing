import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Advanced Search', () => {
      const testData = {
        marcFile: {
          marc: 'C358937MarcAuth.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
        numbers: {
          firstValue: 'sj  2018050004',
          secondValue: 'sj  2021053664',
        },
        searchOption: 'Identifier (all)',
        booleanOption: 'OR',
        matchOption: 'Exact phrase',
      };
      const createdAuthorityIDs = [];

      before(() => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          testData.marcFile.marc,
          testData.marcFile.fileName,
          testData.marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIDs.push(record.authority.id);
          });
        });

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
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
        'C358937 Verify that entered values at the "Advanced search" modal didn\'t change after reopening (Spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C358937'] },
        () => {
          // Step 1: Click on the "Advanced search" button at the "Search & filter" pane.
          MarcAuthorities.clickAdvancedSearchButton();

          // Steps 2 - 5 Filling fields with relevant info.
          MarcAuthorities.fillAdvancedSearchField(
            0,
            testData.numbers.firstValue,
            testData.searchOption,
            false,
            testData.matchOption,
          );
          MarcAuthorities.fillAdvancedSearchField(
            1,
            testData.numbers.secondValue,
            testData.searchOption,
            testData.booleanOption,
            testData.matchOption,
          );

          // Step 6: Click on "Search" button.
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkAdvancedSearchModalAbsence();
          MarcAuthorities.checkResultList([
            'María de Jesús, de Agreda, sister, 1602-1665',
            'Montessori method of education',
          ]);

          // Step 7: Click on the "Advanced search" button again.
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.checkAdvancedSearchModalFields(
            0,
            testData.numbers.firstValue,
            testData.searchOption,
            false,
            testData.matchOption,
          );
          MarcAuthorities.checkAdvancedSearchModalFields(
            1,
            testData.numbers.secondValue,
            testData.searchOption,
            testData.booleanOption,
            testData.matchOption,
          );
        },
      );
    });
  });
});
