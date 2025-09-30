import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import Users from '../../../support/fragments/users/users';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../support/constants';
import BulkEditPane from '../../../support/fragments/settings/bulk-edit/bulkEditPane';
import ItemsBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/itemsBulkEditProfilesPane';
import ItemsBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/itemsBulkEditProfileView';
import HoldingsBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/holdingsBulkEditProfilesPane';
import HoldingsBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/holdingsBulkEditProfileView';
import InstancesBulkEditProfilesPane from '../../../support/fragments/settings/bulk-edit/profilePane/instancesBulkEditProfilesPane';
import InstancesBulkEditProfileView from '../../../support/fragments/settings/bulk-edit/profileView/instancesBulkEditProfileView';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const testData = {
  itemsProfileName: `AT_C740202_ItemsProfile_${getRandomPostfix()}`,
  holdingsProfileName: `AT_C740202_HoldingsProfile_${getRandomPostfix()}`,
  instancesProfileName: `AT_C740202_InstancesProfile_${getRandomPostfix()}`,
  marcInstancesProfileName: `AT_C740202_MarcInstancesProfile_${getRandomPostfix()}`,
  profileDescription: 'Test profile for viewing verification',
  createdProfileIds: [],
  itemsProfileBody: {
    name: `AT_C740202_ItemsProfile_${getRandomPostfix()}`,
    description: 'Test profile for viewing verification',
    locked: false,
    entityType: 'ITEM',
    ruleDetails: [
      {
        option: 'COPY_NOTE',
        actions: [
          {
            type: 'ADD_TO_EXISTING',
            updated: 'Test copy note for viewing',
          },
        ],
      },
    ],
  },
  holdingsProfileBody: {
    name: `AT_C740202_HoldingsProfile_${getRandomPostfix()}`,
    description: 'Test profile for viewing verification',
    locked: false,
    entityType: 'HOLDINGS_RECORD',
    ruleDetails: [
      {
        option: 'PERMANENT_LOCATION',
        actions: [
          {
            type: 'REPLACE_WITH',
            updated: 'Main Library',
          },
        ],
      },
    ],
  },
  instancesProfileBody: {
    name: `AT_C740202_InstancesProfile_${getRandomPostfix()}`,
    description: 'Test profile for viewing verification',
    locked: false,
    entityType: 'INSTANCE',
    ruleDetails: [
      {
        option: 'SUPPRESS_FROM_DISCOVERY',
        actions: [
          {
            type: 'SET_TO_FALSE',
          },
        ],
      },
    ],
  },
  marcInstancesProfileBody: {
    name: `AT_C740202_MarcInstancesProfile_${getRandomPostfix()}`,
    description: 'Test profile for viewing verification',
    locked: false,
    entityType: 'INSTANCE',
    ruleDetails: [
      {
        option: 'SUPPRESS_FROM_DISCOVERY',
        actions: [
          {
            type: 'SET_TO_FALSE',
          },
        ],
      },
      {
        option: 'MARC_FIELD',
        actions: [
          {
            type: 'ADD_TO_EXISTING',
            updated: '901',
            data: [
              {
                ind1: '1',
                ind2: '1',
                subfields: [
                  {
                    subfield: 'a',
                    data: {
                      text: 'Test data',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

describe('Bulk edit', () => {
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

        // Create test profiles for each type
        cy.createBulkEditProfile(testData.itemsProfileBody).then((profile) => {
          testData.itemsProfileName = profile.name;
          testData.createdProfileIds.push(profile.id);
        });

        cy.createBulkEditProfile(testData.holdingsProfileBody).then((profile) => {
          testData.holdingsProfileName = profile.name;
          testData.createdProfileIds.push(profile.id);
        });

        cy.createBulkEditProfile(testData.instancesProfileBody).then((profile) => {
          testData.instancesProfileName = profile.name;
          testData.createdProfileIds.push(profile.id);
        });

        cy.createBulkEditProfile(testData.marcInstancesProfileBody).then((profile) => {
          testData.marcInstancesProfileName = profile.name;
          testData.createdProfileIds.push(profile.id);
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
          'Holdings bulk edit profiles',
          'Instances bulk edit profiles',
          'Items bulk edit profiles',
        ]);
        BulkEditPane.verifyProfilesTypesAbsent(['Users bulk edit profiles']);

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
        // дописать проверку метадата аккордиона
        ItemsBulkEditProfileView.verifyMetadataSectionExists();
        ItemsBulkEditProfileView.expandMetadataSection();
        ItemsBulkEditProfileView.verifyMetadataSection();

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
        HoldingsBulkEditProfileView.verifyMetadataSection();
        HoldingsBulkEditProfileView.verifyLockProfileCheckboxChecked(false);

        // Step 11: Verify elements under "Bulk edits" accordion
        HoldingsBulkEditProfileView.verifySelectedOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.HOLDINGS_RECORDS.PERMANENT_LOCATION,
        );
        HoldingsBulkEditProfileView.verifySelectedAction(BULK_EDIT_ACTIONS.REPLACE_WITH);
        HoldingsBulkEditProfileView.verifyTextInDataTextArea('Main Library');

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
        InstancesBulkEditProfileView.verifyMetadataSection();
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
        InstancesBulkEditProfileView.verifyMetadataSection();
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
