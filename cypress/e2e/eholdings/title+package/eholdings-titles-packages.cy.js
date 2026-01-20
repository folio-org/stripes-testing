import { Permissions } from '../../../support/dictionary';
import EHoldingsResourceEdit from '../../../support/fragments/eholdings/eHoldingsResourceEdit';
import EHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitle from '../../../support/fragments/eholdings/eHoldingsTitle';
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
      label2Value: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. ${getRandomPostfix()}`,
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
      EHoldingsTitlesSearch.getViaApi({
        'filter[subject]': testData.subject,
        'filter[type]': testData.publicationType.toLowerCase(),
      }).then((res) => {
        testData.titleProps = res[0];
      });
      cy.getEHoldingsCustomLabelsViaAPI().then((labels) => {
        testData.label1 = labels[0].attributes.displayLabel;
        testData.label2 = labels[1].attributes.displayLabel;
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
        EHoldingsTitlesSearch.openTitle(testData.titleProps.attributes.name);
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
        EHoldingsResourceView.goToEdit();
        EHoldingsResourceEdit.fillCustomLabelValue(testData.label1, testData.label1Value);
        EHoldingsResourceEdit.fillCustomLabelValue(testData.label2, testData.label2Value);
        EHoldingsResourceEdit.saveAndClose();
        EHoldingsResourceView.verifyCustomLabelValue(testData.label1, testData.label1Value);
        EHoldingsResourceView.verifyCustomLabelValue(testData.label2, testData.label2Value);
      },
    );
  });
});
