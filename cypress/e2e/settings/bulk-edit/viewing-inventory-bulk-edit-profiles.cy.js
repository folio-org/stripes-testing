import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  LOCATION_NAMES,
} from '../../../support/constants';
import BulkEditPane, {
  PROFILE_TYPES,
} from '../../../support/fragments/settings/bulk-edit/bulkEditPane';
import ItemsBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/itemsBulkEditProfilesPane';
import ItemsBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/itemsBulkEditProfileView';
import HoldingsBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/holdingsBulkEditProfilesPane';
import HoldingsBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/holdingsBulkEditProfileView';
import InstancesBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/instancesBulkEditProfilesPane';
import InstancesBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/instancesBulkEditProfileView';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import {
  createBulkEditProfileBody,
  createSuppressFromDiscoveryRule,
  ActionCreators,
  ItemsRules,
  HoldingsRules,
  MarcRules,
  MarcActionCreators,
} from '../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';

let user;

const createItemsProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C740202_ItemsProfile_${getRandomPostfix()}`,
    description: 'Test profile for viewing verification',
    locked: false,
    entityType: 'ITEM',
    ruleDetails: [
      ItemsRules.createItemNoteRule(
        ActionCreators.addToExisting('Test copy note for viewing'),
        null, // Will be set dynamically
        false,
      ),
    ],
  });
};

const createHoldingsProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C740202_HoldingsProfile_${getRandomPostfix()}`,
    description: 'Test profile for viewing verification',
    locked: false,
    entityType: 'HOLDINGS_RECORD',
    ruleDetails: [
      HoldingsRules.createPermanentLocationRule(
        ActionCreators.replaceWith(null), // Will be set dynamically
      ),
    ],
  });
};

const createInstancesProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C740202_InstancesProfile_${getRandomPostfix()}`,
    description: 'Test profile for viewing verification',
    locked: false,
    entityType: 'INSTANCE',
    ruleDetails: [createSuppressFromDiscoveryRule(true, false, false)],
  });
};

const createMarcInstancesProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C740202_MarcInstancesProfile_${getRandomPostfix()}`,
    description: 'Test profile for viewing verification',
    locked: false,
    entityType: 'INSTANCE_MARC',
    ruleDetails: [createSuppressFromDiscoveryRule(true, false, false)],
    marcRuleDetails: [
      MarcRules.createMarcFieldRule('901', '1', '1', 'a', [
        MarcActionCreators.addToExisting('Test data'),
      ]),
    ],
  });
};

const testData = {
  itemsProfileName: null,
  holdingsProfileName: null,
  instancesProfileName: null,
  marcInstancesProfileName: null,
  profileDescription: 'Test profile for viewing verification',
  createdProfileIds: [],
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditSettingsView.gui,
        Permissions.bulkEditSettingsDelete.gui,
        Permissions.bulkEditSettingsLockEdit.gui,
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getAdminSourceRecord().then((record) => {
          testData.adminSourceRecord = record;
        });

        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
          const locationId = res.id;

          InventoryInstances.getItemNoteTypes({
            query: 'name="Copy note"',
          }).then((response) => {
            const noteTypeId = response[0].id;

            // Create profile bodies using factory functions
            const itemsProfile = createItemsProfileBody();
            itemsProfile.ruleDetails[0].actions[0].parameters[0].value = noteTypeId;

            const holdingsProfile = createHoldingsProfileBody();
            holdingsProfile.ruleDetails[0].actions[0].updated = locationId;

            const instancesProfile = createInstancesProfileBody();
            const marcInstancesProfile = createMarcInstancesProfileBody();

            // Create test profiles for each type
            const profiles = [
              { body: itemsProfile, nameKey: 'itemsProfileName' },
              { body: holdingsProfile, nameKey: 'holdingsProfileName' },
              { body: instancesProfile, nameKey: 'instancesProfileName' },
              { body: marcInstancesProfile, nameKey: 'marcInstancesProfileName' },
            ];

            profiles.forEach((profileConfig) => {
              cy.createBulkEditProfile(profileConfig.body).then((profile) => {
                testData[profileConfig.nameKey] = profile.name;
                testData.createdProfileIds.push(profile.id);
              });
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

    it(
      'C740202 Viewing Inventory bulk edit profiles (firebird)',
      { tags: ['smoke', 'firebird', 'C740202'] },
      () => {
        // Step 1: Click "Bulk edit" option in "Settings" pane
        SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
        BulkEditPane.waitLoading();

        // Step 2: Verify profiles types listed under "Inventory profiles" group
        BulkEditPane.verifyProfilesTypesPresent([
          PROFILE_TYPES.HOLDINGS,
          PROFILE_TYPES.INSTANCES,
          PROFILE_TYPES.ITEMS,
        ]);
        BulkEditPane.verifyProfilesTypesAbsent([PROFILE_TYPES.USERS]);

        // Step 3: Click "Items bulk edit profiles" and click on any existing items bulk edit profile row
        BulkEditPane.clickItemsBulkEditProfiles();
        ItemsBulkEditProfilesPane.waitLoading();
        ItemsBulkEditProfilesPane.verifyPaneElements();
        ItemsBulkEditProfilesPane.clickProfileRow(testData.itemsProfileName);
        ItemsBulkEditProfileView.waitLoading();
        ItemsBulkEditProfileView.verifyProfileDetails(
          testData.itemsProfileName,
          testData.profileDescription,
        );

        // Step 4: Verify elements under "Summary" accordion
        ItemsBulkEditProfileView.verifyLockProfileCheckboxChecked(false);
        ItemsBulkEditProfileView.verifyMetadataSectionExists();

        // Step 5: Verify elements under "Bulk edits" accordion
        ItemsBulkEditProfileView.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.COPY_NOTE,
        );
        ItemsBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.ADD_NOTE);
        ItemsBulkEditProfileView.verifyTextInDataTextArea('Test copy note for viewing');

        // Step 6: Expand Standard metadata information under "Summary" accordion
        ItemsBulkEditProfileView.verifyMetadataSectionExists();
        ItemsBulkEditProfileView.expandMetadataSection();
        ItemsBulkEditProfileView.verifyMetadataSection(
          testData.adminSourceRecord,
          testData.adminSourceRecord,
        );

        // Step 7: Click "Collapse all" link
        ItemsBulkEditProfileView.clickCollapseAllLinkAndVerify();

        // Step 8: Click "X" button
        ItemsBulkEditProfileView.clickCloseFormButton();
        BulkEditPane.waitLoading();
        ItemsBulkEditProfilesPane.waitLoading();

        // Step 9: Click "Holdings bulk edit profiles" and click on any existing holdings bulk edit profile row
        BulkEditPane.clickHoldingsBulkEditProfiles();
        HoldingsBulkEditProfilesPane.waitLoading();
        HoldingsBulkEditProfilesPane.verifyPaneElements();
        HoldingsBulkEditProfilesPane.clickProfileRow(testData.holdingsProfileName);
        HoldingsBulkEditProfileView.waitLoading();
        HoldingsBulkEditProfileView.verifyProfileDetails(
          testData.holdingsProfileName,
          testData.profileDescription,
        );

        // Step 10: Verify elements under "Summary" accordion
        HoldingsBulkEditProfileView.verifyMetadataSectionExists();
        HoldingsBulkEditProfileView.expandMetadataSection();
        HoldingsBulkEditProfileView.verifyMetadataSection(
          testData.adminSourceRecord,
          testData.adminSourceRecord,
        );
        HoldingsBulkEditProfileView.verifyLockProfileCheckboxChecked(false);

        // Step 11: Verify elements under "Bulk edits" accordion
        HoldingsBulkEditProfileView.verifySelectedOption('Permanent holdings location');
        HoldingsBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.REPLACE_WITH);
        HoldingsBulkEditProfileView.verifySelectedLocation(`${LOCATION_NAMES.MAIN_LIBRARY} `);

        // Step 12: Click "X" button, then "Instances bulk edit profiles" and click on any existing FOLIO instances bulk edit profile
        HoldingsBulkEditProfileView.clickCloseFormButton();
        BulkEditPane.waitLoading();
        BulkEditPane.clickInstancesBulkEditProfiles();
        InstancesBulkEditProfilesPane.waitLoading();
        InstancesBulkEditProfilesPane.verifyPaneElements();
        InstancesBulkEditProfilesPane.clickProfileRow(testData.instancesProfileName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifyProfileDetails(
          testData.instancesProfileName,
          testData.profileDescription,
        );

        // Step 13: Verify elements under "Summary" accordion
        InstancesBulkEditProfileView.verifyMetadataSectionExists();
        InstancesBulkEditProfileView.expandMetadataSection();
        InstancesBulkEditProfileView.verifyMetadataSection(
          testData.adminSourceRecord,
          testData.adminSourceRecord,
        );
        InstancesBulkEditProfileView.verifyLockProfileCheckboxChecked(false);
        InstancesBulkEditProfileView.verifyLockProfileCheckboxChecked(false);

        // Step 14: Verify elements under "Bulk edits" accordion
        InstancesBulkEditProfileView.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        );
        InstancesBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.SET_FALSE);

        // Step 15: Click "X" button and click on any existing instances with source MARC bulk edit profile
        InstancesBulkEditProfileView.clickCloseFormButton();
        BulkEditPane.waitLoading();
        BulkEditPane.clickInstancesBulkEditProfiles();
        InstancesBulkEditProfilesPane.waitLoading();
        InstancesBulkEditProfilesPane.verifyPaneElements();
        InstancesBulkEditProfilesPane.clickProfileRow(testData.marcInstancesProfileName);
        InstancesBulkEditProfileView.waitLoading();
        InstancesBulkEditProfileView.verifyProfileDetails(
          testData.marcInstancesProfileName,
          testData.profileDescription,
        );

        // Step 16: Verify elements under "Summary" accordion
        InstancesBulkEditProfileView.verifyMetadataSectionExists();
        InstancesBulkEditProfileView.expandMetadataSection();
        InstancesBulkEditProfileView.verifyMetadataSection(
          testData.adminSourceRecord,
          testData.adminSourceRecord,
        );
        InstancesBulkEditProfileView.verifyLockProfileCheckboxChecked(false);

        // Step 17: Verify elements under "Bulk edits for administrative data" accordion
        InstancesBulkEditProfileView.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        );
        InstancesBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.SET_FALSE);

        // Step 18: Verify elements under "Bulk edits for instances with source MARC" accordion
        InstancesBulkEditProfileView.verifyBulkEditForMarcInstancesAccordionExists();
        InstancesBulkEditProfileView.verifyTagAndIndicatorsAndSubfieldValues('901', '1', '1', 'a');
        InstancesBulkEditProfileView.verifySelectedMarcAction(BULK_EDIT_ACTIONS.ADD);
        InstancesBulkEditProfileView.verifyDataTextAreaForMarcInstance('Test data');
      },
    );
  });
});
