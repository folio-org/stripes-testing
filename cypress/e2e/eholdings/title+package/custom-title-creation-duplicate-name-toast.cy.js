import { Permissions } from '../../../support/dictionary';
import {
  EHoldingsNewCustomTitle,
  EHoldingsPackages,
  EHoldingsSearch,
  EHoldingsTitles,
  EHoldingsTitlesSearch,
} from '../../../support/fragments/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const postfix = getRandomPostfix();
    const testData = {
      packageName: `AT_C1404905_Package_${postfix}`,
      titleName: `AT_C1404905_Title_${postfix}`,
    };

    before('Create custom package, custom title, and user', () => {
      cy.getAdminToken();
      EHoldingsPackages.deleteAllPackagesByNameViaAPI('AT_C1404905_*');
      EHoldingsPackages.createPackageViaAPI({
        data: {
          attributes: { name: testData.packageName, contentType: 'E-Book' },
        },
      }).then(({ data }) => {
        testData.packageId = data.id;

        EHoldingsTitles.createEHoldingTitleVIaApi({
          packageId: testData.packageId,
          titleName: testData.titleName,
        }).then((title) => {
          testData.titleId = title.id;
        });
      });

      cy.createTempUser([Permissions.uieHoldingsTitlesPackagesCreateDelete.gui]).then((user) => {
        testData.user = user;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsSearch.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      EHoldingsPackages.deletePackageViaAPI(testData.packageName);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1404905 Custom title creation shows "Custom Title with the provided name already exists" toast when the name already exists (promin)',
      { tags: ['extendedPath', 'promin', 'C1404905'] },
      () => {
        // Step 1: open the "Titles" tab
        EHoldingsSearch.switchToTitles();
        EHoldingsTitlesSearch.waitLoading();

        // Step 2: click "New" - the "New custom title" pane opens
        EHoldingsNewCustomTitle.createNewTitle();
        EHoldingsNewCustomTitle.waitLoading();

        // Step 3: enter the existing title's exact name, select the custom package, save
        EHoldingsNewCustomTitle.fillInRequiredProperties(testData.packageName, testData.titleName);
        EHoldingsNewCustomTitle.saveAndClose();
        EHoldingsNewCustomTitle.verifyDuplicateTitleNameCallout();

        // Step 4: enter the same name in upper case - the duplicate check is case-insensitive
        EHoldingsNewCustomTitle.fillInTitleName(testData.titleName.toUpperCase());
        EHoldingsNewCustomTitle.saveAndClose();
        EHoldingsNewCustomTitle.verifyDuplicateTitleNameCallout();

        // Step 5: the creation pane remains open, and no duplicate title was created
        EHoldingsNewCustomTitle.waitLoading();
        EHoldingsTitles.getEHoldingsTitlesByTitleNameViaApi({
          titleName: testData.titleName,
        }).then((response) => {
          expect(response.data).to.have.length(1);
        });
      },
    );
  });
});
