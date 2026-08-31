import { Permissions } from '../../../support/dictionary';
import { EHoldingsResourceEdit, EHoldingsResourceView } from '../../../support/fragments/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      resourcePath: '/resources/19-166-115780928',
      updatedEmbargoValue: String(Math.floor(Math.random() * 12) + 1),
      updatedEmbargoUnit: 'Months',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };

    before('Create user', () => {
      cy.getAdminToken();
      EHoldingsResourceEdit.addCustomCoverageViaAPI(testData.resourcePath.split('/').pop(), {
        beginDate: testData.startDate,
        endDate: testData.endDate,
      });

      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        EHoldingsResourceEdit.addCustomEmbargoViaAPI(testData.resourcePath.split('/').pop(), {
          embargoValue: String(Number(testData.updatedEmbargoValue) + 2),
          embargoUnit: 'Days',
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
      'C702 Edit "Custom Embargo" period for "Resource" that has specified "Managed embargo period" (promin)',
      { tags: ['extendedPath', 'promin', 'C702'] },
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
