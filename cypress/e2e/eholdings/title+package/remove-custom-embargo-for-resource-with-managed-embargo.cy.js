import { Permissions } from '../../../support/dictionary';
import { EHoldingsResourceEdit, EHoldingsResourceView } from '../../../support/fragments/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      resourceId: '19-166-60764',
    };

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath + `/resources/${testData.resourceId}`,
          waiter: EHoldingsResourceView.waitLoading,
        });
      });
    });

    after('Delete user and restore custom embargo', () => {
      cy.getAdminToken();
      EHoldingsResourceEdit.addCustomEmbargoViaAPI(testData.resourceId, {
        embargoValue: 4,
        embargoUnit: 'Months',
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C421986 Remove "Custom Embargo" period for "Resource" that has specified "Managed embargo period" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C421986'] },
      () => {
        EHoldingsResourceView.waitLoading();

        EHoldingsResourceView.verifyCustomEmbargoExists();
        EHoldingsResourceView.goToEdit();
        EHoldingsResourceEdit.waitLoading();

        EHoldingsResourceEdit.removeCustomEmbargo();
        EHoldingsResourceEdit.verifyCustomEmbargoRemovalMessage();
        EHoldingsResourceEdit.verifySaveButtonEnabled();

        EHoldingsResourceEdit.saveAndClose();
        EHoldingsResourceView.waitLoading();

        EHoldingsResourceView.verifyCustomEmbargoAbsent();
      },
    );
  });
});
