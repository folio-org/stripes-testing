import { Permissions } from '../../../support/dictionary';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import EHoldingsTitles from '../../../support/fragments/eholdings/eHoldingsTitles';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import NewNote from '../../../support/fragments/notes/newNote';
import { NOTE_TYPES } from '../../../support/constants';

describe('eHoldings', () => {
  describe('Titles', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      customPackageName: `AT_C157915_EH_Package_${randomPostfix}`,
      customTitleName: `AT_C157915_EH_Title_${randomPostfix}`,
      note: {
        title: `AT_C157915_EH_NoteTitle_${randomPostfix}`,
        details: `AT_C157915_EH_NoteDetails_${randomPostfix}`,
        type: NOTE_TYPES.GENERAL,
      },
    };
    let user;

    before('Create user, data and login', () => {
      cy.then(() => {
        cy.createTempUser([
          Permissions.moduleeHoldingsEnabled.gui,
          Permissions.uiNotesItemCreate.gui,
        ]).then((userProperties) => {
          user = userProperties;
        });
        EHoldingsPackages.createPackageViaAPI({
          data: {
            type: 'packages',
            attributes: {
              name: testData.customPackageName,
              contentType: 'E-Book',
            },
          },
        }).then(({ data: { id } }) => {
          EHoldingsTitles.createEHoldingTitleVIaApi({
            titleName: testData.customTitleName,
            packageId: id,
          });
        });
      }).then(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
        EHoldingSearch.switchToTitles();
      });
    });

    after('Delete user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      EHoldingsPackages.deletePackageViaAPI(testData.customPackageName, true);
    });

    it(
      'C157915 Title Record - Add a note (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C157915'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.customTitleName);
        EHoldingsPackages.openPackageWithExpectedName(testData.customTitleName);
        EHoldingsPackageView.verifyPackageName(testData.customTitleName);

        EHoldingsPackage.addNote();
        NewNote.chooseSelectTypeByTitle(NOTE_TYPES.GENERAL);
        NewNote.fill(testData.note);
        NewNote.save();
        EHoldingsPackage.verifySpecialNotesRow(testData.note);
      },
    );
  });
});
