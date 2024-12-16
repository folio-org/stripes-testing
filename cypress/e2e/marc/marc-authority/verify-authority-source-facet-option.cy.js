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
      searchOption: 'Personal name',
      searchValue: `t!)-${getRandomPostfix()}`,
      authorityOption: 'LC Subject Headings (LCSH)',
    };

    const marcFiles = [
      {
        marc: 'marcAuthFileC365626.mrc',
        fileName: `testMarcFileC365626.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 1,
      },
    ];

    const createdRecordIDs = [];

    before('Create test data', () => {
      cy.getAdminToken();
      marcFiles.forEach((marcFile) => {
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record.authority.id);
          });
        });
      });

      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      MarcAuthority.deleteViaAPI(createdRecordIDs[0]);
    });

    it(
      'C365626 Search | Verify that the "Authority source" facet option will display the name of facet option when zero results are returned (Spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C365626'] },
      () => {
        MarcAuthorities.switchToSearch();
        MarcAuthorities.checkAuthoritySourceOptions();
        MarcAuthorities.chooseAuthoritySourceOption(testData.authorityOption);
        MarcAuthorities.checkSelectedAuthoritySource(testData.authorityOption);
        MarcAuthorities.verifySearchResultTabletIsAbsent(false);
        MarcAuthorities.searchByParameter(testData.searchOption, testData.searchValue);
        MarcAuthorities.checkNoResultsMessage(
          `No results found for "${testData.searchValue}". Please check your spelling and filters.`,
        );
        MarcAuthorities.checkSelectedAuthoritySource(testData.authorityOption);
        MarcAuthorities.verifySelectedTextOfAuthoritySourceAndCount(testData.authorityOption, 0);
      },
    );
  });
});
