import { Permissions } from '../../../support/dictionary';
import { EHoldingsResourceEdit, EHoldingsResourceView } from '../../../support/fragments/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import EHoldingsTitle from '../../../support/fragments/eholdings/eHoldingsTitle';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      resourceId: '38-467-103587',
      customEmbargoValue: String(Math.floor(Math.random() * 15) + 1),
      customEmbargoUnit: 'Months',
    };

    before('Create user and login', () => {
      cy.getAdminToken();
      EHoldingsTitle.changeResourceSelectionStatusViaApi({
        resourceId: testData.resourceId,
        isSelected: true,
      });
      EHoldingsResourceEdit.removeCustomEmbargoViaAPI(testData.resourceId);

      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    after('Delete user and remove custom embargo', () => {
      cy.getAdminToken();
      EHoldingsResourceEdit.removeCustomEmbargoViaAPI(testData.resourceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C421988 Add "Custom Embargo" period for "Resource" that doesn\'t have specified "Managed embargo period" and "Custom embargo period" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C421988'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath + `/resources/${testData.resourceId}`,
          waiter: EHoldingsResourceView.waitLoading,
        });

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
