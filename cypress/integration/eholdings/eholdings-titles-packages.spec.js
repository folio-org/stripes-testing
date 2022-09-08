import EHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import testTypes from '../../support/dictionary/testTypes';
import features from '../../support/dictionary/features';
import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';

describe('ui-eholdings: Search titles', () => {
  const testData = {
    title: 'Chemical Engineering',
    publicationType: 'Journal'
  };

  before('Creating user and getting info about title', () => {
    cy.createTempUser([permissions.uieHoldingsRecordsEdit.gui,
    permissions.uieHoldingsPackageTitleSelectUnselect.gui]).then(userProperties => {
      testData.userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password, { path: TopMenu.eholdingsPath, waiter: EHoldingsTitlesSearch.waitLoading });
    });

    EHoldingsTitlesSearch.getViaApi({ 'filter[name]': testData.title, 'filter[type]': testData.publicationType.toLowerCase() }).then((res) => {
      testData.titleProps = res[0];
    });
  });

  after('Deleting created user', () => {
    Users.deleteViaApi(testData.userId);
  });

  it('C684 Title Search: Search titles for chemical engineering. Then filter results to journals. (spitfire)', { tags: [testTypes.smoke, devTeams.spitfire, features.eHoldings] }, () => {
    EHoldingSearch.switchToTitles();
    EHoldingsTitlesSearch.byTitle(testData.title);
    EHoldingsTitlesSearch.byPublicationType(testData.publicationType);
    EHoldingsTitlesSearch.openTitle(testData.titleProps.attributes.name);
    EHoldingsTitlesSearch.checkTitleInfo(testData.publicationType, testData.title);
  });
});
