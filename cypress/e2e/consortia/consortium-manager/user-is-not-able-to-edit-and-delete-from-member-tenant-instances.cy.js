import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import ContributorTypesConsortiumManager from '../../../support/fragments/consortium-manager/inventory/instances/contributorTypesConsortiumManager';
import AlternativeTitleTypesConsortiumManager from '../../../support/fragments/consortium-manager/inventory/instances/alternativeTitleTypesConsortiumManager';
import ClassificationIdentifierTypesConsortiumManager from '../../../support/fragments/consortium-manager/inventory/instances/classificationIdentifierTypesConsortiumManager';
import FormatsConsortiumManager from '../../../support/fragments/consortium-manager/inventory/instances/formatsConsortiumManager';
import InstanceNoteTypesConsortiumManager from '../../../support/fragments/consortium-manager/inventory/instances/instanceNoteTypesConsortiumManager';
import AlternativeTitleTypes from '../../../support/fragments/settings/inventory/instances/alternativeTitleTypes';
import ClassificationIdentifierTypes from '../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import ContributorTypes from '../../../support/fragments/settings/inventory/instances/contributorTypes';
import Formats from '../../../support/fragments/settings/inventory/instances/formats';
import InstanceNoteTypes from '../../../support/fragments/settings/inventory/instances/instanceNoteTypes';
import InstanceStatusTypeConsortiumManager from '../../../support/fragments/consortium-manager/inventory/instances/instanceStatusTypeConsortiumManager';
import ModesOfIssuanceConsortiumManager from '../../../support/fragments/consortium-manager/inventory/instances/modesOfIssuanceConsortiumManager';
import NatureOfContentConsortiumManager from '../../../support/fragments/consortium-manager/inventory/instances/natureOfContentConsortiumManager';
import ResourceIdentifierTypesConsortiumManager from '../../../support/fragments/consortium-manager/inventory/instances/resourceIdentifierTypesConsortiumManager';
import ResourceTypesConsortiumManager from '../../../support/fragments/consortium-manager/inventory/instances/resourceTypesConsortiumManager';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import ModesOfIssuance from '../../../support/fragments/settings/inventory/instances/modesOfIssuance';
import NatureOfContent from '../../../support/fragments/settings/inventory/instances/natureOfContent';
import ResourceIdentifierTypes from '../../../support/fragments/settings/inventory/instances/resourceIdentifierTypes';
import ResourceTypes from '../../../support/fragments/settings/inventory/instances/resourceTypes';

const instancesGroupName = 'Instances';
const collegeInstancesGroupOptions = [
  INVENTORY_SETTINGS_TABS.ALTERNATIVE_TITLE_TYPES,
  INVENTORY_SETTINGS_TABS.CLASSIFICATION_IDENTIFIER_TYPES,
  INVENTORY_SETTINGS_TABS.CONTRIBUTOR_TYPES,
  INVENTORY_SETTINGS_TABS.FORMATS,
  INVENTORY_SETTINGS_TABS.INSTANCE_NOTE_TYPES,
];
const universityInstancesGroupOptions = [
  INVENTORY_SETTINGS_TABS.INSTANCE_STATUS_TYPES,
  INVENTORY_SETTINGS_TABS.MODES_OF_ISSUANCE,
  INVENTORY_SETTINGS_TABS.NATURE_OF_CONTENT,
  INVENTORY_SETTINGS_TABS.RESOURCE_IDENTIFIER_TYPES,
  INVENTORY_SETTINGS_TABS.RESOURCE_TYPES,
];

const testData = {
  newClassificationIdentifierTypeName: getTestEntityValue(
    'C400671_newClassificationIdentifierType',
  ),
  newContributorType: {
    name: getTestEntityValue('C400671_newContributorType_name'),
    code: getTestEntityValue('C400671_code'),
  },
  editedInstanceNoteTypeName: getTestEntityValue('C400671_editedCollegeLocalInstanceNoteType'),
  centralSharedContributorTypes: {
    payload: {
      name: getTestEntityValue('C400671_centralSharedContributorTypes_name'),
      code: getTestEntityValue('C400671_code'),
    },
  },
  centralSharedAlternativeTitleTypes: {
    payload: {
      name: getTestEntityValue('C400671_centralSharedAlternativeTitleTypes_name'),
    },
  },
  centralSharedClassificationIdentifierTypes: {
    payload: {
      name: getTestEntityValue('C400671_centralSharedClassificationIdentifierTypes_name'),
    },
  },
  centralSharedFormats: {
    payload: {
      name: getTestEntityValue('C400671_centralSharedFormats_name'),
      code: getTestEntityValue('C400671_code'),
    },
  },
  centralSharedInstanceNoteTypes: {
    payload: {
      name: getTestEntityValue('C400671_centralSharedInstanceNoteTypes_name'),
    },
  },
  collegeLocalInstanceNoteTypes: {
    id: uuid(),
    name: getTestEntityValue('C400671_collegeLocalInstanceNoteTypes_name'),
    source: 'local',
  },
  centralSharedInstanceStatusTypes: {
    payload: {
      name: getTestEntityValue('C400671_centralSharedInstanceStatusTypes_name'),
      code: getTestEntityValue('C400671_code'),
    },
  },
  universityLocalInstanceStatusTypes: {
    id: uuid(),
    name: getTestEntityValue('C400671_universityLocalInstanceStatusTypes_name'),
    code: getTestEntityValue('C400671_code'),
    source: 'local',
  },
  centralSharedResourceTypes: {
    payload: {
      name: getTestEntityValue('C400671_centralSharedResourceTypes_name'),
      code: getTestEntityValue('C400671_code'),
    },
  },
  centralSharedModesOfIssuance: {
    payload: {
      name: getTestEntityValue('C400671_centralSharedModesOfIssuance_name'),
    },
  },
  centralSharedNatureOfContent: {
    payload: {
      name: getTestEntityValue('C400671_centralSharedNatureOfContent_name'),
    },
  },
  centralSharedResourceIdentifierTypes: {
    payload: {
      name: getTestEntityValue('C400671_centralSharedResourceIdentifierTypes_name'),
    },
  },
};

describe('Consortia', () => {
  describe('Consortium manager', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();
      ContributorTypesConsortiumManager.createViaApi(testData.centralSharedContributorTypes).then(
        (newContributorTypes) => {
          testData.centralSharedContributorTypes = newContributorTypes;
        },
      );
      ClassificationIdentifierTypesConsortiumManager.createViaApi(
        testData.centralSharedClassificationIdentifierTypes,
      ).then((newClassificationIdentifierTypes) => {
        testData.centralSharedClassificationIdentifierTypes = newClassificationIdentifierTypes;
      });
      AlternativeTitleTypesConsortiumManager.createViaApi(
        testData.centralSharedAlternativeTitleTypes,
      ).then((newAlternativeTitleTypes) => {
        testData.centralSharedAlternativeTitleTypes = newAlternativeTitleTypes;
      });
      FormatsConsortiumManager.createViaApi(testData.centralSharedFormats).then((newHFormats) => {
        testData.centralSharedFormats = newHFormats;
      });
      InstanceNoteTypesConsortiumManager.createViaApi(testData.centralSharedInstanceNoteTypes).then(
        (newInstanceNoteTypes) => {
          testData.centralSharedInstanceNoteTypes = newInstanceNoteTypes;
        },
      );
      InstanceStatusTypeConsortiumManager.createViaApi(
        testData.centralSharedInstanceStatusTypes,
      ).then((newInstanceStatusTypes) => {
        testData.centralSharedInstanceStatusTypes = newInstanceStatusTypes;
      });
      ModesOfIssuanceConsortiumManager.createViaApi(testData.centralSharedModesOfIssuance).then(
        (newModesOfIssuance) => {
          testData.centralSharedModesOfIssuance = newModesOfIssuance;
        },
      );
      NatureOfContentConsortiumManager.createViaApi(testData.centralSharedNatureOfContent).then(
        (newNatureOfContent) => {
          testData.centralSharedNatureOfContent = newNatureOfContent;
        },
      );
      ResourceIdentifierTypesConsortiumManager.createViaApi(
        testData.centralSharedResourceIdentifierTypes,
      ).then((newResourceIdentifierTypes) => {
        testData.centralSharedResourceIdentifierTypes = newResourceIdentifierTypes;
      });
      ResourceTypesConsortiumManager.createViaApi(testData.centralSharedResourceTypes).then(
        (newResourceTypes) => {
          testData.centralSharedResourceTypes = newResourceTypes;
        },
      );
      cy.resetTenant();
      cy.createTempUser([])
        .then((userProperties) => {
          testData.user = userProperties;
        })
        .then(() => {
          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: [
              permissions.crudAlternativeTitleTypes.gui,
              permissions.crudClassificationIdentifierTypes.gui,
              permissions.crudInstanceNoteTypes.gui,
              permissions.crudContributorTypes.gui,
              permissions.crudFormats.gui,
            ],
          });
          cy.affiliateUserToTenant({
            tenantId: Affiliations.University,
            userId: testData.user.userId,
            permissions: [
              permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
              permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
              permissions.crudDefinedResourceTypes.gui,
              permissions.crudNatureOfContent.gui,
              permissions.crudResourceIdentifierTypes.gui,
            ],
          });

          cy.getAdminToken();

          cy.setTenant(Affiliations.College);
          InstanceNoteTypes.createViaApi(testData.collegeLocalInstanceNoteTypes);
          cy.setTenant(Affiliations.University);
          InstanceStatusTypes.createViaApi(testData.universityLocalInstanceStatusTypes);

          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password);
        });
    });

    after('delete test data', () => {
      cy.resetTenant();
      cy.setTenant(Affiliations.Consortia);
      cy.getAdminToken();
      ContributorTypesConsortiumManager.deleteViaApi(testData.centralSharedContributorTypes);
      ClassificationIdentifierTypesConsortiumManager.deleteViaApi(
        testData.centralSharedClassificationIdentifierTypes,
      );
      AlternativeTitleTypesConsortiumManager.deleteViaApi(
        testData.centralSharedAlternativeTitleTypes,
      );
      FormatsConsortiumManager.deleteViaApi(testData.centralSharedFormats);
      InstanceNoteTypesConsortiumManager.deleteViaApi(testData.centralSharedInstanceNoteTypes);
      InstanceStatusTypeConsortiumManager.deleteViaApi(testData.centralSharedInstanceStatusTypes);
      ModesOfIssuanceConsortiumManager.deleteViaApi(testData.centralSharedModesOfIssuance);
      NatureOfContentConsortiumManager.deleteViaApi(testData.centralSharedNatureOfContent);
      ResourceIdentifierTypesConsortiumManager.deleteViaApi(
        testData.centralSharedResourceIdentifierTypes,
      );
      ResourceTypesConsortiumManager.deleteViaApi(testData.centralSharedResourceTypes);
      Users.deleteViaApi(testData.user.userId);

      cy.setTenant(Affiliations.College);
      cy.clearCookies({ domain: null });
      cy.getCollegeAdminToken();
      InstanceNoteTypes.deleteViaApi(testData.collegeLocalInstanceNoteTypes.id);
      ClassificationIdentifierTypes.deleteViaApiByName(
        testData.newClassificationIdentifierTypeName,
      );
      ContributorTypes.getViaApi({ query: `name=="${testData.newContributorType.name}"` }).then(
        (contributorTypes) => {
          contributorTypes.forEach(({ id }) => ContributorTypes.deleteViaApi(id));
        },
      );

      cy.setTenant(Affiliations.University);
      cy.clearCookies({ domain: null });
      cy.getUniversityAdminToken();
      InstanceStatusTypes.deleteViaApi(testData.universityLocalInstanceStatusTypes.id);
      cy.resetTenant();
    });

    it(
      'C400671 User is NOT able to edit and delete from member tenant "Inventory - Instances" settings shared via "Consortium manager" app (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'C400671'] },
      () => {
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

        // Step 1: Click "Settings" in the header
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);

        // Step 2: Click "Inventory" in the "Settings" pane
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.verifyGroupOptions(instancesGroupName, collegeInstancesGroupOptions);

        // Step 3: Click "Alternative title types"
        AlternativeTitleTypes.choose();
        AlternativeTitleTypes.waitLoading();
        AlternativeTitleTypes.verifyNewButtonActive();

        // Step 4: Shared "Alternative title types" have no Edit/Delete icons
        AlternativeTitleTypes.verifyConsortiumAlternativeTitleTypesInTheList(
          testData.centralSharedAlternativeTitleTypes.payload,
        );

        // Step 5: Click "Classification identifier types"
        ClassificationIdentifierTypes.choose();
        ClassificationIdentifierTypes.waitLoading();
        ClassificationIdentifierTypes.verifyNewButtonActive();

        // Step 6: Shared "Classification identifier types" have no Edit/Delete icons
        ClassificationIdentifierTypes.verifyConsortiumClassificationIdentifierTypesInTheList(
          testData.centralSharedClassificationIdentifierTypes.payload,
        );

        // Step 7: Create a new local "Classification identifier type"
        ClassificationIdentifierTypes.createClassificationIdentifierType(
          testData.newClassificationIdentifierTypeName,
        );
        ClassificationIdentifierTypes.verifyLocalClassificationIdentifierTypesInTheList({
          name: testData.newClassificationIdentifierTypeName,
          actions: ['edit', 'trash'],
        });

        // Step 8: Click "Contributor types"
        ContributorTypes.choose();
        ContributorTypes.verifyNewButtonActive();

        // Step 9: Shared "Contributor types" have no Edit/Delete icons
        ContributorTypes.verifyConsortiumContributorTypesInTheList(
          testData.centralSharedContributorTypes.payload,
        );

        // Step 10: Create a new local "Contributor type"
        ContributorTypes.createContributorType(testData.newContributorType);
        ContributorTypes.verifyLocalContributorTypesInTheList({
          name: testData.newContributorType.name,
          actions: ['edit', 'trash'],
        });
        cy.wait(3000);

        // Step 11: Delete the new local "Contributor type"
        ContributorTypes.clickTrashButtonForContributorTypes(testData.newContributorType.name);
        ContributorTypes.verifyContributorTypeDeletedCallout(testData.newContributorType.name);
        ContributorTypes.verifyContributorTypesAbsentInTheList(testData.newContributorType);
        cy.wait(3000);

        // Step 12: Click "Formats"
        Formats.choose();
        Formats.verifyNewButtonActive();

        // Step 13: Shared "Formats" have no Edit/Delete icons
        Formats.verifyConsortiumFormatsInTheList(testData.centralSharedFormats.payload);

        // Step 14: Click "Instance note types"
        InstanceNoteTypes.choose();
        InstanceNoteTypes.waitLoading();
        InstanceNoteTypes.verifyNewButtonActive();

        // Step 15: Shared "Instance note types" have no Edit/Delete icons
        InstanceNoteTypes.verifyConsortiumInstanceNoteTypesInTheList(
          testData.centralSharedInstanceNoteTypes.payload,
        );

        // Step 16: Local "Instance note type" has Edit/Delete icons
        InstanceNoteTypes.verifyLocalInstanceNoteTypesInTheList({
          ...testData.collegeLocalInstanceNoteTypes,
          actions: ['edit', 'trash'],
        });

        // Step 17: Edit the local "Instance note type"
        InstanceNoteTypes.editInstanceNoteTypeName(
          testData.collegeLocalInstanceNoteTypes.name,
          testData.editedInstanceNoteTypeName,
        );
        InstanceNoteTypes.verifyInstanceNoteTypeUpdatedCallout(testData.editedInstanceNoteTypeName);
        InstanceNoteTypes.verifyLocalInstanceNoteTypesInTheList({
          name: testData.editedInstanceNoteTypeName,
          actions: ['edit', 'trash'],
        });

        // Step 18: Switch to member-2 tenant and open "Settings" > "Inventory"
        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.verifyGroupOptions(instancesGroupName, universityInstancesGroupOptions);

        // Step 19: Click "Instance status types"
        InstanceStatusTypes.choose();
        InstanceStatusTypes.verifyNewButtonActive();

        // Step 20: Shared "Instance status types" have no Edit/Delete icons
        InstanceStatusTypes.verifyConsortiumInstanceStatusTypesInTheList(
          testData.centralSharedInstanceStatusTypes.payload,
        );

        // Step 21: Local "Instance status type" has Edit/Delete icons
        InstanceStatusTypes.verifyLocalInstanceStatusTypesInTheList({
          ...testData.universityLocalInstanceStatusTypes,
          actions: ['edit', 'trash'],
        });

        // Step 22: Click "Modes of issuance"
        ModesOfIssuance.choose();
        ModesOfIssuance.waitLoading();
        ModesOfIssuance.verifyNewButtonActive();

        // Step 23: Shared "Modes of issuance" have no Edit/Delete icons
        ModesOfIssuance.verifyConsortiumModesOfIssuancesInTheList(
          testData.centralSharedModesOfIssuance.payload,
        );

        // Step 24: Click "Nature of content"
        NatureOfContent.choose();
        NatureOfContent.waitLoading();
        NatureOfContent.verifyNewButtonActive();

        // Step 25: Shared "Nature of content" have no Edit/Delete icons
        NatureOfContent.verifyConsortiumNatureOfContentInTheList(
          testData.centralSharedNatureOfContent.payload,
        );

        // Step 26: Click "Resource identifier types"
        ResourceIdentifierTypes.choose();
        ResourceIdentifierTypes.waitLoading();
        ResourceIdentifierTypes.verifyNewButtonActive();

        // Step 27: Shared "Resource identifier types" have no Edit/Delete icons
        ResourceIdentifierTypes.verifyConsortiumResourceIdentifierTypesInTheList(
          testData.centralSharedResourceIdentifierTypes.payload,
        );

        // Step 28: Click "Resource types"
        ResourceTypes.choose();
        ResourceTypes.verifyNewButtonActive();

        // Step 29: Shared "Resource types" have no Edit/Delete icons
        ResourceTypes.verifyConsortiumResourceTypesInTheList(
          testData.centralSharedResourceTypes.payload,
        );
      },
    );
  });
});
