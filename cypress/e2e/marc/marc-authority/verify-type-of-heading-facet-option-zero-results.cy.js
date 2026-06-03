import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      describe('Filters', () => {
        const testData = {
          typeOfHeadingAccordionName: 'Type of heading',
          searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.GEOGRAPHIC_NAME,
          typeOfHeading: 'Corporate Name',
          nonExistingQuery: 'Paris',
        };
        const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
        const fileName = 'C365629MarcAuth.mrc';
        const updatedFileName = `testMarcFileC365629.${getRandomPostfix()}.mrc`;
        const createdAuthorityIDs = [];

        before('Create test data', () => {
          cy.getAdminToken();

          // Import MARC Authority records
          DataImport.uploadFileViaApi(fileName, updatedFileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record.authority.id);
              });
            },
          );

          // Create user and login
          cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
            (userProperties) => {
              testData.userProperties = userProperties;

              cy.login(userProperties.username, userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            },
          );
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          createdAuthorityIDs.forEach((id) => {
            MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C365629 Search | Verify that the "Type of heading" facet option will display the name of facet option when zero results are returned (spitfire)',
          { tags: ['extendedPath', 'C365629', 'spitfire'] },
          () => {
            MarcAuthorities.verifyTypeOfHeadingAccordionAndClick();
            MarcAuthorities.checkOptionsWithCountersExistInAccordion(
              testData.typeOfHeadingAccordionName,
            );
            MarcAuthorities.verifyOptionAvailableMultiselect(
              testData.typeOfHeadingAccordionName,
              testData.typeOfHeading,
            );

            MarcAuthorities.chooseTypeOfHeading(testData.typeOfHeading);
            MarcAuthorities.checkResultsListRecordsCountGreaterThan(1);
            MarcAuthorities.verifySelectedTextOfHeadingType(testData.typeOfHeading);

            MarcAuthorities.selectSearchOptionInDropdown(testData.searchOption);
            MarcAuthorities.searchByParameter(testData.searchOption, testData.nonExistingQuery);

            // Verify facet persists with zero count when no results found
            MarcAuthorities.verifyEmptySearchResults(testData.nonExistingQuery);
            MarcAuthorities.verifySelectedTextOfHeadingType(testData.typeOfHeading);
            MarcAuthorities.verifyMultiSelectOptionNumber(
              testData.typeOfHeadingAccordionName,
              testData.typeOfHeading,
              0,
            );
          },
        );
      });
    });
  });
});
