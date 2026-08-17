import { Permissions } from '../../../support/dictionary';
import { EHoldingsResourceEdit, EHoldingsResourceView } from '../../../support/fragments/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      resourceId: '413-4147601-30244350',
      updatedEmbargoValue: String(Math.floor(Math.random() * 15) + 1),
      updatedEmbargoUnit: 'Months',
      beginCoverage: '2023-01-01',
      endCoverage: '2023-11-20',
    };

    before('Create user and login', () => {
      cy.getAdminToken();

      EHoldingsResourceEdit.updateResourceAttributesViaApi(testData.resourceId, {
        customCoverages: [
          {
            beginCoverage: testData.beginCoverage,
            endCoverage: testData.endCoverage,
          },
        ],
        customEmbargoPeriod: {
          embargoValue: 1,
          embargoUnit: 'Months',
        },
        isSelected: true,
      });

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

    after('Delete user and revert changes', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C421984 Edit "Custom Embargo" period for "Resource" that doesn\'t have specified "Managed embargo period" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C421984'] },
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
