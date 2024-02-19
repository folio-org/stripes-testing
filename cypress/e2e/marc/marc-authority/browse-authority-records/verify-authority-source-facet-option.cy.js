import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

const testData = {};
const jobProfileToRun = 'Default - Create SRS MARC Authority';
const fileName = 'marFileForC365630.mrc';
const updatedFileName = `testMarcFileUpd.${getRandomPostfix()}.mrc`;
const authoritySource = 'LC Subject Headings (LCSH)';
const createdAuthorityID = [];

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      before('Creating data', () => {
        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (createdUserProperties) => {
            testData.userProperties = createdUserProperties;
          },
        );

        cy.getAdminToken();
        DataImport.uploadFileViaApi(fileName, updatedFileName, jobProfileToRun)
          .then((response) => {
            response.entries.forEach((record) => {
              createdAuthorityID.push(record.relatedAuthorityInfo.idList[0]);
            });
          })
          .then(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });

      after('Deleting data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdAuthorityID.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C365630 Browse | Verify that the "Authority source" facet option will display the name of facet option when zero results are returned (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.checkAuthoritySourceOptions();
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.chooseAuthoritySourceOption(authoritySource);
          MarcAuthorityBrowse.searchBy('Name-title', 'Not-existing query');
          MarcAuthorityBrowse.getNotExistingHeadingReferenceValue('Not-existing query');
          MarcAuthorities.verifySelectedTextOfAuthoritySourceAndCount(authoritySource, 0);
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchResultTabletIsAbsent(true);
        },
      );
    });
  });
});
