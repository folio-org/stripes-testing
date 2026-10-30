import CapabilitySets from '../../../support/dictionary/capabilitySets';
import AreYouSureModal from '../../../support/fragments/orders/modals/areYouSureModal';
import Orders from '../../../support/fragments/orders/orders';
import { PrefixSuffix } from '../../../support/fragments/settings/orders/newPrefixSuffix';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomStringCode from '../../../support/utils/generateTextCode';

const NAME_LENGTH_ERROR = 'Name must be less than 8 alphanumeric characters';
const NAME_FIELD_PLACEHOLDER = 'name';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    let testData;

    before('Create test data', () => {
      // Prefix and suffix names are limited to alphanumeric characters, so no "AT_" prefix
      const longPrefixName = getRandomStringCode(9);
      const longSuffixName = getRandomStringCode(8);

      testData = {
        prefix: {
          nineCharsName: longPrefixName,
          eightCharsName: longPrefixName.slice(0, 8),
          name: longPrefixName.slice(0, 7),
        },
        suffix: {
          eightCharsName: longSuffixName,
          name: longSuffixName.slice(0, 7),
          elevenCharsName: getRandomStringCode(11),
        },
      };

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [CapabilitySets.uiOrdersSettingsManage],
        );

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsOrdersPath,
          waiter: Orders.waitSettingsPageLoading,
        });
        SettingOrdersNavigationMenu.selectPrefixes();
        PrefixSuffix.waitLoadingPrefixes();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      PrefixSuffix.deletePrefixByNameViaApi(testData.prefix.name);
      PrefixSuffix.deleteSuffixByNameViaApi(testData.suffix.name);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1292040 Meaningful validation message is displayed when creating or editing a prefix or suffix with a long name (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C1292040'] },
      () => {
        // Step 1: Click "New", enter a prefix name containing 9 characters, click "Save"
        SettingsPane.clickAddNewBtn();
        PrefixSuffix.fillName(testData.prefix.nineCharsName);
        SettingsPane.clickSaveBtn();
        SettingsPane.checkValidatorError({
          placeholder: NAME_FIELD_PLACEHOLDER,
          error: NAME_LENGTH_ERROR,
        });

        // Step 2: Remove one character from the "Name" field, click "Save"
        PrefixSuffix.fillName(testData.prefix.eightCharsName);
        SettingsPane.clickSaveBtn();
        SettingsPane.checkValidatorError({
          placeholder: NAME_FIELD_PLACEHOLDER,
          error: NAME_LENGTH_ERROR,
        });

        // Step 3: Remove one more character from the "Name" field, click "Save"
        PrefixSuffix.fillName(testData.prefix.name);
        SettingsPane.clickSaveBtn();
        PrefixSuffix.checkPrefixExists(testData.prefix.name);
        InteractorsTools.checkCalloutContainsMessage(
          `${testData.prefix.name} was successfully created`,
        );

        // Step 4: Click "Edit" icon of created prefix, add one more character, click "Save"
        PrefixSuffix.editPrefix(testData.prefix.name, testData.prefix.eightCharsName, '');
        SettingsPane.checkValidatorError({
          placeholder: NAME_FIELD_PLACEHOLDER,
          error: NAME_LENGTH_ERROR,
        });

        // Step 5: Click "Suffixes" option on the "Orders" pane
        SettingOrdersNavigationMenu.selectSuffixes();
        AreYouSureModal.verifyAreYouSureForm(true);

        // Step 6: Click "Close without saving" button
        AreYouSureModal.clickCloseWithoutSavingButton();
        PrefixSuffix.waitLoadingSuffixes();

        // Step 7: Click "New", enter a suffix name containing 8 characters, click "Save"
        SettingsPane.clickAddNewBtn();
        PrefixSuffix.fillName(testData.suffix.eightCharsName);
        SettingsPane.clickSaveBtn();
        SettingsPane.checkValidatorError({
          placeholder: NAME_FIELD_PLACEHOLDER,
          error: NAME_LENGTH_ERROR,
        });

        // Step 8: Clear the "Name" field, enter a suffix name containing 7 characters, click "Save"
        PrefixSuffix.fillName(testData.suffix.name);
        SettingsPane.clickSaveBtn();
        PrefixSuffix.checkSuffixExists(testData.suffix.name);
        InteractorsTools.checkCalloutContainsMessage(
          `${testData.suffix.name} was successfully created`,
        );

        // Step 9: Click "Edit" icon of created suffix, enter more than 10 characters, click "Save"
        PrefixSuffix.editSuffix(testData.suffix.name, testData.suffix.elevenCharsName, '');
        SettingsPane.checkValidatorError({
          placeholder: NAME_FIELD_PLACEHOLDER,
          error: NAME_LENGTH_ERROR,
        });

        // Step 10: Click "Cancel" button
        PrefixSuffix.clickCancelButton();
        PrefixSuffix.checkSuffixExists(testData.suffix.name);
      },
    );
  });
});
