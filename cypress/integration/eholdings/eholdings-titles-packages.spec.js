import EHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import features from '../../support/dictionary/features';

describe('ui-eholdings: Search titles', () => {
  const testData = {
    title: 'Chemical Engineering',
    publicationType: 'Journal'
  };

  before('Creating user and getting info about title', () => {
    cy.loginAsAdmin();
    cy.getAdminToken();
    cy.visit(TopMenu.eholdingsPath);
    EHoldingsTitlesSearch.getViaApi({ 'filter[name]' : testData.title, 'filter[type]' : testData.publicationType.toLowerCase() }).then((res) => {
      testData.titleProps = res[0];
    });
  });

  it('C684 Title Search: Search titles for chemical engineering. Then filter results to journals. (spitfire)', { tags:  [testTypes.smoke, features.eHoldings] }, () => {
    EHoldingSearch.switchToTitles();
    EHoldingsTitlesSearch.byTitle(testData.title);
    EHoldingsTitlesSearch.byPublicationType(testData.publicationType);
    EHoldingsTitlesSearch.openTitle(testData.titleProps.attributes.name);
    EHoldingsTitlesSearch.checkTitleInfo(testData.publicationType, testData.title);
  });
});
