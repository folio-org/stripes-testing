import { Permissions } from '../../../support/dictionary';
import { EHoldingsResourceEdit, EHoldingsResourceView } from '../../../support/fragments/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      resourceId: '19-166-60764',
      customEmbargoValue: String(Math.floor(Math.random() * 15) + 1),
      customEmbargoUnit: 'Months',
    };

    before('Create user and login', () => {
      cy.getAdminToken();
      EHoldingsResourceEdit.removeCustomEmbargoViaAPI(testData.resourceId);

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

    after('Delete user and remove custom embargo', () => {
      cy.getAdminToken();
      EHoldingsResourceEdit.removeCustomEmbargoViaAPI(testData.resourceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C421987 Add "Custom Embargo" period for "Resource" that has specified "Managed embargo period" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C421987'] },
      () => {
        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyCustomEmbargoAbsent();

        EHoldingsResourceView.goToEdit();
        EHoldingsResourceEdit.waitLoading();

        EHoldingsResourceEdit.addCustomEmbargo();
        EHoldingsResourceEdit.fillCustomEmbargo(
          testData.customEmbargoValue,
          testData.customEmbargoUnit,
        );
        EHoldingsResourceEdit.verifySaveButtonEnabled();
        EHoldingsResourceEdit.saveAndClose();

        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyCustomEmbargoValue(
          testData.customEmbargoValue,
          testData.customEmbargoUnit,
        );
      },
    );
  });
});
