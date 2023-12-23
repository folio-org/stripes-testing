import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import MarcAuthoritiesBrowseSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesBrowseSearch';

describe('MARC -> MARC Authority', () => {
  const user = {};
  const testData = {
    marcValue: 'test',
    searchOption: 'Name-title',
  };

  before('Creating user', () => {
    cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
      (createdUserProperties) => {
        user.userProperties = createdUserProperties;
        cy.login(user.userProperties.username, user.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      },
    );
    MarcAuthorities.switchToBrowse();
  });

  after('Deleting created user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userProperties.userId);
  });

  it(
    'C422027 Verify that clicking on "Reset all" button will return focus and cursor to the Browse box (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthoritiesBrowseSearch.searchBy(testData.searchOption, testData.marcValue);
      MarcAuthorities.verifySearchResultTabletIsAbsent(false);
      MarcAuthorities.checkResetAllButtonDisabled(false);
      MarcAuthorities.clickReset();
      MarcAuthorities.verifySearchResultTabletIsAbsent(true);
      MarcAuthorities.checkDefaultBrowseOptions(testData.marcValue);
      MarcAuthorities.checkResetAllButtonDisabled();
      MarcAuthorities.checkSearchInputInFocus();
    },
  );
});
