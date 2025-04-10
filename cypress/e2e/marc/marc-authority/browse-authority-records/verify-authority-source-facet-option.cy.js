import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {};
const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
const fileName = 'marFileForC365630.mrc';
const updatedFileName = `testMarcFileUpd.${getRandomPostfix()}.mrc`;
const authoritySource = 'LC Subject Headings (LCSH)';
const createdAuthorityID = [];

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      before('Creating data', () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(fileName, updatedFileName, jobProfileToRun).then((response) => {
          response.forEach((record) => {
            createdAuthorityID.push(record.authority.id);
          });
        });

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (createdUserProperties) => {
            testData.userProperties = createdUserProperties;
            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
              cy.reload();
              MarcAuthorities.waitLoading();
            }, 20_000);
          },
        );
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
        { tags: ['extendedPath', 'spitfire', 'C365630'] },
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
