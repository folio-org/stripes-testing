import { Permissions } from '../../../support/dictionary';
import { EHoldingsResourceEdit, EHoldingsResourceView } from '../../../support/fragments/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      resourcePath: '/resources/19-166-60764',
      updatedEmbargoValue: String(Math.floor(Math.random() * 12) + 1),
      updatedEmbargoUnit: 'Months',
    };

    before('Create user', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        EHoldingsResourceEdit.addCustomEmbargoViaAPI(testData.resourcePath.split('/').pop(), {
          embargoValue: String(Number(testData.updatedEmbargoValue) + 1),
          embargoUnit: 'Months',
        });

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath + testData.resourcePath,
          waiter: EHoldingsResourceView.waitLoading,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C702 Edit "Custom Embargo" period for "Resource" that has specified "Managed embargo period" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C702'] },
      () => {
        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyCustomEmbargoExists();

        EHoldingsResourceView.goToEdit();
        EHoldingsResourceEdit.waitLoading();

        EHoldingsResourceEdit.fillCustomEmbargo(
          testData.updatedEmbargoValue,
          testData.updatedEmbargoUnit,
        );

        EHoldingsResourceEdit.verifySaveButtonEnabled();
        EHoldingsResourceEdit.saveAndClose();

        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyCustomEmbargoValue(
          testData.updatedEmbargoValue,
          testData.updatedEmbargoUnit,
        );
      },
    );
  });
});
