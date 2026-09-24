import { Permissions } from '../../../support/dictionary';
import BatchGroups from '../../../support/fragments/settings/invoices/batchGroups';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import Users from '../../../support/fragments/users/users';
import ArrayUtils from '../../../support/utils/arrays';
import getRandomPostfix from '../../../support/utils/stringTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';

describe('Data Import', () => {
  describe('Settings', () => {
    const defaultInvoiceProfileName = 'Default - GOBI monograph invoice';
    const randomPostfix = getRandomPostfix();
    const namePrefix = 'C359014_';
    // Leading character alternates case across all 26 letters (a, B, c, D, ...) - satisfies the
    // precondition's "different letters in lowercase and uppercase", and this is already the
    // correct case-insensitive ascending order by construction
    const batchGroupNames = Array.from({ length: 26 }, (_, index) => {
      const letter = String.fromCharCode(97 + index);
      const casedLetter = index % 2 === 0 ? letter : letter.toUpperCase();
      return `${casedLetter}_${namePrefix}${randomPostfix}`;
    });

    let user;

    // Leftover batch groups from a previous (e.g. failed) run would pollute the sorted-list check
    // - always start from a clean slate, and clean up after ourselves the same way.
    const deleteTestBatchGroupsViaApi = () => {
      return BatchGroups.getBatchGroupsViaApi({ query: `name=="*${namePrefix}*"` }).then(
        (batchGroups) => {
          batchGroups.forEach((batchGroup) => {
            BatchGroups.deleteBatchGroupViaApi(batchGroup.id);
          });
        },
      );
    };

    before('Create batch groups and user', () => {
      cy.getAdminToken();
      deleteTestBatchGroupsViaApi()
        .then(() => {
          batchGroupNames.forEach((name) => {
            BatchGroups.createBatchGroupViaApi(BatchGroups.getDefaultBatchGroup({ name }));
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.settingsDataImportEnabled.gui,
            Permissions.invoiceSettingsAll.gui,
          ]).then((userProperties) => {
            user = userProperties;

            cy.login(user.username, user.password, {
              path: SettingsMenu.mappingProfilePath,
              waiter: FieldMappingProfiles.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      deleteTestBatchGroupsViaApi();
    });

    it(
      'C359014 Invoice mapping profile: checking that the "Accepted values" dropdown list contains all available groups for the "Batch group" field (promin)',
      { tags: ['extendedPath', 'promin', 'C359014'] },
      () => {
        // Steps 1-5: Settings > Data import > Field mapping profiles > search + duplicate the
        // default GOBI invoice profile, landing on the New field mapping profile form
        FieldMappingProfiles.search(defaultInvoiceProfileName);
        FieldMappingProfiles.selectMappingProfileFromList(defaultInvoiceProfileName);
        cy.wait(2000); // wait for the profile to load before editing
        FieldMappingProfiles.verifyActionMenu();
        FieldMappingProfiles.closeActionMenu();
        FieldMappingProfiles.duplicate();

        // Step 6: Open the "Batch group" field's "Accepted values" dropdown
        NewFieldMappingProfile.openBatchGroupAcceptedValues();

        // Step 7: All our own batch groups are listed, and the whole list is sorted alphabetically
        NewFieldMappingProfile.getAcceptedValuesDropdownItems().then((items) => {
          batchGroupNames.forEach((name) => {
            expect(items).to.include(name);
          });
          const isSorted = ArrayUtils.checkIsSortedAlphabetically({ array: items });
          cy.expect(isSorted, 'Batch group values sorted alphabetically').to.equal(true);
        });
      },
    );
  });
});
