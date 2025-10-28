import { Permissions } from '../../../support/dictionary';
import EHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    let user;
    const testData = {
      resourceId: '58-473-185972',
      resourcePath: '/eholdings/resources/58-473-185972',
    };

    const resourceInformationFields = [
      'Title',
      'Alternate title(s)',
      'Publisher',
      'Publication type',
      'ISSN (Print)',
      'ISSN (Online)',
      'Subjects',
      'Package',
      'Provider',
      'Package content type',
      'Title type',
      'Peer reviewed',
    ];

    before('Create test user', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.moduleeHoldingsEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: testData.resourcePath,
          waiter: EHoldingsResourceView.waitLoading,
        });
      });
    });

    after('Delete test user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C360109 Check the content of "Resource information" accordion in "Title+package" detail record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C360109'] },
      () => {
        EHoldingsResourceView.verifyResourceInformationAccordionExists();

        EHoldingsResourceView.verifyResourceInformationFieldsInOrder(resourceInformationFields);

        EHoldingsResourceView.verifyAlternateTitlesSeparatedBySemicolon();
      },
    );
  });
});
