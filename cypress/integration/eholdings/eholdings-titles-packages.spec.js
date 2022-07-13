import eHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import eHoldingsTitlesSearch from '../../support/fragments/eholdings/eHoldingsTitlesSearch';
import testTypes from '../../support/dictionary/testTypes';
import features from '../../support/dictionary/features';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import users from '../../support/fragments/users/users';

describe('ui-eholdings: Search titles', () => {
  const testData = {
    title: 'Chemical Engineering',
    publicationType: 'Journal'
  };

  before('Preconditions', () => {
    cy.createTempUser([permissions.uieHoldingsRecordsEdit.gui,
      permissions.uieHoldingsPackageTitleSelectUnselect.gui]).then(userProperties => {
      testData.userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.eholdingsPath);
    });

    eHoldingsTitlesSearch.getViaApi({ 'filter[name]' : testData.title, 'filter[type]' : testData.publicationType.toLowerCase() }).then((res) => {
      testData.titleProps = res;
    });
  });

  after('Deleting created entities', () => {
    users.deleteViaApi(testData.userId);
  });

  it('C684 Title Search: Search titles for chemical engineering. Then filter results to journals.', { tags:  [testTypes.smoke, features.eHoldings] }, () => {
    eHoldingSearch.switchToTitles();
    eHoldingsTitlesSearch.byTitle(testData.title);
    eHoldingsTitlesSearch.byPublicationType(testData.publicationType);
    eHoldingsTitlesSearch.openTitle(testData.titleProps.attributes.name);
    eHoldingsTitlesSearch.checkTitleInfo(testData.publicationType, testData.title);
  });
});
