import { Permissions } from '../../../support/dictionary';
import EHoldingsResourceEdit from '../../../support/fragments/eholdings/eHoldingsResourceEdit';
import EHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitle from '../../../support/fragments/eholdings/eHoldingsTitle';
import EHoldingsTitles from '../../../support/fragments/eholdings/eHoldingsTitles';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      subject: 'Chemical Engineering',
      publicationType: 'Journal',
      titleC9240: 'Wiley Rutledge',
      label1Value: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ${getRandomPostfix()}`,
    };

    before('Creating users and getting info about title', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uieHoldingsRecordsEdit.gui,
        Permissions.uieHoldingsPackageTitleSelectUnselect.gui,
      ]).then((userProperties) => {
        testData.C684UserProperties = userProperties;
      });
      cy.createTempUser([Permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
        testData.C9240UserProperties = userProperties;
      });
    });

    after('Deleting created users', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.C684UserProperties.userId);
      Users.deleteViaApi(testData.C9240UserProperties.userId);
    });

    it(
      'C684 Title Search: Search titles for chemical engineering. Then filter results to journals. (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'shiftLeft', 'C684'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.C684UserProperties.username, testData.C684UserProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
        });
        EHoldingSearch.switchToTitles();
        EHoldingsTitlesSearch.bySubject(testData.subject);
        EHoldingsTitlesSearch.byPublicationType(testData.publicationType);
        EHoldingsTitles.openTitle(0);
        EHoldingsTitlesSearch.checkTitleInfo(testData.publicationType, testData.subject);
      },
    );

    it(
      'C9240 Selected Title+Package: Add a value to a custom label (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C9240'] },
      () => {
        cy.login(testData.C9240UserProperties.username, testData.C9240UserProperties.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
        EHoldingSearch.switchToTitles();
        EHoldingsTitlesSearch.byTitle('Wiley');
        EHoldingsTitlesSearch.bySelectionStatus('Selected');
        EHoldingsTitlesSearch.openTitle(testData.titleC9240);
        EHoldingsTitle.openResource();
        cy.intercept('eholdings/custom-labels').as('getCustomLabels');
        EHoldingsResourceView.goToEdit();
        cy.wait('@getCustomLabels').then(({ response }) => {
          const labelName = response.body.data[0].attributes.displayLabel;
          EHoldingsResourceEdit.fillCustomLabelValue(labelName, testData.label1Value);
          EHoldingsResourceEdit.saveAndClose();
          EHoldingsResourceView.verifyCustomLabelValue(labelName, testData.label1Value);
        });
      },
    );
  });
});
