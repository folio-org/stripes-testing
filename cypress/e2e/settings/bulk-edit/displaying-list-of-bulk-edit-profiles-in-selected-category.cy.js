import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';
import { APPLICATION_NAMES, LOCATION_NAMES } from '../../../support/constants';
import BulkEditPane, {
  PROFILE_TYPES,
} from '../../../support/fragments/settings/bulk-edit/bulkEditPane';
import ItemsBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/itemsBulkEditProfilesPane';
import HoldingsBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/holdingsBulkEditProfilesPane';
import InstancesBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/instancesBulkEditProfilesPane';
import UsersBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/usersBulkEditProfilesPane';
import { COLUMN_NAMES } from '../../../support/fragments/settings/bulk-edit/profilePane/bulkEditProfilesPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import {
  createBulkEditProfileBody,
  createSuppressFromDiscoveryRule,
  ActionCreators,
  ItemsRules,
  HoldingsRules,
} from '../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';

let user;
let adminUser;

const createItemsProfileBody = (index) => {
  return createBulkEditProfileBody({
    name: `AT_C740208_ItemsProfile${index}_${getRandomPostfix()}`,
    description: `Test items profile ${index}`,
    locked: false,
    entityType: 'ITEM',
    ruleDetails: [
      ItemsRules.createItemNoteRule(ActionCreators.addToExisting('Test copy note'), null, false),
    ],
  });
};

const createHoldingsProfileBody = (index) => {
  return createBulkEditProfileBody({
    name: `AT_C740208_HoldingsProfile${index}_${getRandomPostfix()}`,
    description: `Test holdings profile ${index}`,
    locked: false,
    entityType: 'HOLDINGS_RECORD',
    ruleDetails: [HoldingsRules.createPermanentLocationRule(ActionCreators.replaceWith(null))],
  });
};

const createInstancesProfileBody = (index) => {
  return createBulkEditProfileBody({
    name: `AT_C740208_InstancesProfile${index}_${getRandomPostfix()}`,
    description: `Test instances profile ${index}`,
    locked: false,
    entityType: 'INSTANCE',
    ruleDetails: [createSuppressFromDiscoveryRule(true, false, false)],
  });
};

const createMarcInstancesProfileBody = (index) => {
  return createBulkEditProfileBody({
    name: `AT_C740208_MarcInstancesProfile${index}_${getRandomPostfix()}`,
    description: `Test MARC instances profile ${index}`,
    locked: false,
    entityType: 'INSTANCE_MARC',
    ruleDetails: [createSuppressFromDiscoveryRule(true, false, false)],
  });
};

const createUsersProfileBody = (index) => {
  return createBulkEditProfileBody({
    name: `AT_C740208_UsersProfile${index}_${getRandomPostfix()}`,
    description: `Test users profile ${index}`,
    locked: false,
    entityType: 'USER',
    ruleDetails: [
      {
        bulkEditFieldId: 'USER.PATRON_GROUP',
        actions: [
          {
            type: 'REPLACE_WITH',
            updated: null,
          },
        ],
      },
    ],
  });
};

const testData = {
  itemsProfiles: [],
  holdingsProfiles: [],
  instancesProfiles: [],
  marcInstancesProfiles: [],
  usersProfiles: [],
  createdProfileIds: [],
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditSettingsView.gui,
        Permissions.bulkEditSettingsDelete.gui,
        Permissions.bulkEditSettingsLockEdit.gui,
        Permissions.bulkEditUpdateRecords.gui,
        Permissions.bulkEditEdit.gui,
        Permissions.bulkEditCsvEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getAdminUserDetails().then((adminRecord) => {
          adminUser = adminRecord;
          cy.log(adminUser);
        });

        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
          const locationId = res.id;

          InventoryInstances.getItemNoteTypes({
            query: 'name="Copy note"',
          }).then((response) => {
            const noteTypeId = response[0].id;

            cy.getUserGroups({ limit: 1 }).then((patronGroups) => {
              const patronGroupId = patronGroups[0].id;

              // Create 3 profiles for each type
              const profilesCount = 3;

              for (let i = 1; i <= profilesCount; i++) {
                // Create items profiles
                const itemsProfile = createItemsProfileBody(i);
                itemsProfile.ruleDetails[0].actions[0].parameters[0].value = noteTypeId;
                cy.createBulkEditProfile(itemsProfile).then((profile) => {
                  testData.itemsProfiles.push(profile.name);
                  testData.createdProfileIds.push(profile.id);
                });

                // Create holdings profiles
                const holdingsProfile = createHoldingsProfileBody(i);
                holdingsProfile.ruleDetails[0].actions[0].updated = locationId;
                cy.createBulkEditProfile(holdingsProfile).then((profile) => {
                  testData.holdingsProfiles.push(profile.name);
                  testData.createdProfileIds.push(profile.id);
                });

                // Create instances profiles
                const instancesProfile = createInstancesProfileBody(i);
                cy.createBulkEditProfile(instancesProfile).then((profile) => {
                  testData.instancesProfiles.push(profile.name);
                  testData.createdProfileIds.push(profile.id);
                });

                // Create MARC instances profiles
                const marcInstancesProfile = createMarcInstancesProfileBody(i);
                cy.createBulkEditProfile(marcInstancesProfile).then((profile) => {
                  testData.marcInstancesProfiles.push(profile.name);
                  testData.createdProfileIds.push(profile.id);
                });

                // Create users profiles
                const usersProfile = createUsersProfileBody(i);
                usersProfile.ruleDetails[0].actions[0].updated = patronGroupId;
                cy.createBulkEditProfile(usersProfile).then((profile) => {
                  testData.usersProfiles.push(profile.name);
                  testData.createdProfileIds.push(profile.id);
                });
              }
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      testData.createdProfileIds.forEach((id) => {
        cy.deleteBulkEditProfile(id, true);
      });
    });

    // Trillium
    it.skip(
      'C740208 Displaying the list of bulk edit profiles in a selected category (firebird)',
      { tags: [] },
      () => {
        // Step 1: Click "Bulk edit" option in "Settings" pane
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
        BulkEditPane.waitLoading();
        BulkEditPane.verifyProfilesTypesPresent([
          PROFILE_TYPES.HOLDINGS,
          PROFILE_TYPES.INSTANCES,
          PROFILE_TYPES.ITEMS,
          PROFILE_TYPES.USERS,
        ]);

        // Step 2: Click "Items bulk edit profiles" category under "Inventory profiles" group
        BulkEditPane.clickItemsBulkEditProfiles();
        ItemsBulkEditProfilesPane.waitLoading();
        ItemsBulkEditProfilesPane.verifyPaneElements();

        // Step 3: Verify the count of the existing items bulk edit profiles in the header is correct
        ItemsBulkEditProfilesPane.verifyProfileCountMatchesDisplayedProfiles('items');

        // Step 4: Verify columns' names of the table with the list of existing items bulk edit profiles
        ItemsBulkEditProfilesPane.verifyTableColumnsNames();

        // Step 5: Verify sorting of the list of existing items bulk edit profiles in the table
        ItemsBulkEditProfilesPane.verifyProfilesSortedByName();
        ItemsBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.NAME);
        ItemsBulkEditProfilesPane.verifyHeaderUnderlined(COLUMN_NAMES.NAME);

        // Step 6: Verify icons displayed next to other columns in the table
        ItemsBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.UPDATED);
        ItemsBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.UPDATED_BY);

        // Step 7: Click "Name" column name in the table with the list of existing items bulk edit profiles
        ItemsBulkEditProfilesPane.changeSortOrderByName();
        ItemsBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.NAME);
        ItemsBulkEditProfilesPane.verifyProfilesSortedByName('descending');

        // Step 8: Click "Name" column name in the table with the list of existing items bulk edit profiles once again
        ItemsBulkEditProfilesPane.changeSortOrderByName();
        ItemsBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.NAME);
        ItemsBulkEditProfilesPane.verifyProfilesSortedByName('ascending');

        // Step 9: Click on the search box and enter exact match but with changed case for the first letter
        const firstProfileName = testData.itemsProfiles[0];
        const searchTerm = firstProfileName.charAt(0).toUpperCase() + firstProfileName.slice(1);

        ItemsBulkEditProfilesPane.searchProfile(searchTerm);
        ItemsBulkEditProfilesPane.verifySearchResultsHighlighted(firstProfileName);
        ItemsBulkEditProfilesPane.verifyClearSearchIconPresent();
        ItemsBulkEditProfilesPane.verifyNumberOfFoundProfiles(1);

        // Step 10: Click "Holdings bulk edit profiles" category under "Inventory profiles" group
        BulkEditPane.clickHoldingsBulkEditProfiles();
        HoldingsBulkEditProfilesPane.waitLoading();
        HoldingsBulkEditProfilesPane.verifyPaneElements();

        // Step 11: Verify columns' names of the table with the list of existing holdings bulk edit profiles
        HoldingsBulkEditProfilesPane.verifyTableColumnsNames();
        HoldingsBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.NAME);
        HoldingsBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.UPDATED);
        HoldingsBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.UPDATED_BY);
        HoldingsBulkEditProfilesPane.verifyProfilesSortedByName();

        // Step 12: Click "Updated" column name in the table with the list of existing holdings bulk edit profiles
        HoldingsBulkEditProfilesPane.changeSortOrderByUpdatedDate();
        HoldingsBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.UPDATED);
        HoldingsBulkEditProfilesPane.verifyProfilesSortedByUpdatedDate('ascending');

        // Step 13: Click "Updated" column name in the table with the list of existing holdings bulk edit profiles once again
        HoldingsBulkEditProfilesPane.changeSortOrderByUpdatedDate();
        HoldingsBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.UPDATED);
        HoldingsBulkEditProfilesPane.verifyProfilesSortedByUpdatedDate('descending');

        // Step 14: Click on the search box and enter partial match of the names of existing holdings bulk edit profiles
        const partialSearchTerm = testData.holdingsProfiles[0].substring(0, 35);

        HoldingsBulkEditProfilesPane.searchProfile(partialSearchTerm);
        HoldingsBulkEditProfilesPane.verifySearchResultsHighlighted(partialSearchTerm);
        HoldingsBulkEditProfilesPane.verifyClearSearchIconPresent();
        HoldingsBulkEditProfilesPane.verifyNumberOfFoundProfiles(1);

        // Step 15: Click on the search box once again and click "x" icon on the right
        HoldingsBulkEditProfilesPane.clearSearch();
        HoldingsBulkEditProfilesPane.verifyProfileCountMatchesDisplayedProfiles('holdings');

        testData.holdingsProfiles.forEach((profileName) => {
          HoldingsBulkEditProfilesPane.verifyProfileExistsInTable(profileName);
        });

        // Step 16: Click "Instances bulk edit profiles" category under "Inventory profiles" group
        BulkEditPane.clickInstancesBulkEditProfiles();
        InstancesBulkEditProfilesPane.waitLoading();
        InstancesBulkEditProfilesPane.verifyPaneElements();

        // Step 17: Verify columns' names of the table with the list of existing instances bulk edit profiles
        InstancesBulkEditProfilesPane.verifyTableColumnsNames();
        InstancesBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.NAME);
        InstancesBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.UPDATED);
        InstancesBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.UPDATED_BY);
        InstancesBulkEditProfilesPane.verifyProfilesSortedByName();

        // Step 18: Verify format of the User Name displayed in "Updated by" column
        InstancesBulkEditProfilesPane.verifyProfileInTable(
          testData.instancesProfiles[0],
          'Test instances profile 1',
          adminUser,
        );

        // Step 19: Click "Updated by" column name in the table with the list of existing instances bulk edit profiles
        InstancesBulkEditProfilesPane.changeSortOrderByUpdatedBy();
        InstancesBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.UPDATED_BY);
        InstancesBulkEditProfilesPane.verifyProfilesSortedByUpdatedBy();

        // Step 20: Click "Updated by" column name in the table with the list of existing instances bulk edit profiles once again
        InstancesBulkEditProfilesPane.changeSortOrderByUpdatedBy();
        InstancesBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.UPDATED_BY);
        InstancesBulkEditProfilesPane.verifyProfilesSortedByUpdatedBy('descending');

        // Step 21: Click on the search box and enter value of non-existent instances bulk edit profile
        const nonExistentProfile = `NonExistent_${getRandomPostfix()}`;

        InstancesBulkEditProfilesPane.searchProfile(nonExistentProfile);
        InstancesBulkEditProfilesPane.verifyNoProfilesAvailable();
        InstancesBulkEditProfilesPane.verifyNumberOfFoundProfiles(0);

        // Step 22: Click "Users bulk edit profiles" category under "Other profiles" group
        BulkEditPane.clickUsersBulkEditProfiles();
        UsersBulkEditProfilesPane.waitLoading();
        UsersBulkEditProfilesPane.verifyPaneElements();

        // Step 23: Verify columns' names of the table with the list of existing users bulk edit profiles
        UsersBulkEditProfilesPane.verifyTableColumnsNames();
        UsersBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.NAME);
        UsersBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.UPDATED);
        UsersBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.UPDATED_BY);
        UsersBulkEditProfilesPane.verifyProfilesSortedByName();

        // Step 24: Click "Description" column name in the table with the list of existing users bulk edit profiles
        UsersBulkEditProfilesPane.verifyColumnNotClickable(COLUMN_NAMES.DESCRIPTION);
        UsersBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.NAME);
        UsersBulkEditProfilesPane.verifyProfilesSortedByName();

        // Step 25: Click "Status" column name in the table with the list of existing users bulk edit profiles
        UsersBulkEditProfilesPane.verifyColumnNotClickable(COLUMN_NAMES.STATUS);
        UsersBulkEditProfilesPane.verifyColumnHasIcon(COLUMN_NAMES.NAME);
        UsersBulkEditProfilesPane.verifyProfilesSortedByName();
      },
    );
  });
});
