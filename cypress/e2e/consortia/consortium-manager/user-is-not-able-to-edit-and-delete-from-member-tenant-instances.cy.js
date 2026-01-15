import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../support/fragments/settingsMenu';
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

const testData = {
  centralSharedContributorTypes: {
    payload: {
      name: getTestEntityValue('centralSharedContributorTypes_name'),
      code: getTestEntityValue('code'),
    },
  },
  centralSharedAlternativeTitleTypes: {
    payload: {
      name: getTestEntityValue('centralSharedAlternativeTitleTypes_name'),
    },
  },
  centralSharedClassificationIdentifierTypes: {
    payload: {
      name: getTestEntityValue('centralSharedClassificationIdentifierTypes_name'),
    },
  },
  centralSharedFormats: {
    payload: {
      name: getTestEntityValue('centralSharedFormats_name'),
      code: getTestEntityValue('code'),
    },
  },
  centralSharedInstanceNoteTypes: {
    payload: {
      name: getTestEntityValue('centralSharedInstanceNoteTypes_name'),
    },
  },
  collegeLocalInstanceNoteTypes: {
    id: uuid(),
    name: getTestEntityValue('collegeLocalInstanceNoteTypes_name'),
    source: 'local',
  },
  centralSharedInstanceStatusTypes: {
    payload: {
      name: getTestEntityValue('centralSharedInstanceStatusTypes_name'),
      code: getTestEntityValue('code'),
    },
  },
  universityLocalInstanceStatusTypes: {
    id: uuid(),
    name: getTestEntityValue('universityLocalInstanceStatusTypes_name'),
    code: getTestEntityValue('code'),
    source: 'local',
  },
  centralSharedResourceTypes: {
    payload: {
      name: getTestEntityValue('centralSharedResourceTypes_name'),
      code: getTestEntityValue('code'),
    },
  },
  centralSharedModesOfIssuance: {
    payload: {
      name: getTestEntityValue('centralSharedModesOfIssuance_name'),
    },
  },
  centralSharedNatureOfContent: {
    payload: {
      name: getTestEntityValue('centralSharedNatureOfContent_name'),
    },
  },
  centralSharedResourceIdentifierTypes: {
    payload: {
      name: getTestEntityValue('centralSharedResourceIdentifierTypes_name'),
    },
  },
};

describe('Consortium manager', () => {
  describe('View settings', () => {
    describe('View Inventory', () => {
      before('create test data', () => {
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
        InstanceNoteTypesConsortiumManager.createViaApi(
          testData.centralSharedInstanceNoteTypes,
        ).then((newInstanceNoteTypes) => {
          testData.centralSharedInstanceNoteTypes = newInstanceNoteTypes;
        });
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
        cy.createTempUser([]).then((userProperties) => {
          // User for test C400671
          testData.user400671 = userProperties;

          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.College, testData.user400671.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user400671.userId, [
            permissions.crudAlternativeTitleTypes.gui,
            permissions.crudClassificationIdentifierTypes.gui,
            permissions.crudInstanceNoteTypes.gui,
            permissions.crudContributorTypes.gui,
            permissions.crudFormats.gui,
          ]);
          InstanceNoteTypes.createViaApi(testData.collegeLocalInstanceNoteTypes);

          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.University, testData.user400671.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user400671.userId, [
            permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
            permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
            permissions.crudDefinedResourceTypes.gui,
            permissions.crudNatureOfContent.gui,
            permissions.crudResourceIdentifierTypes.gui,
          ]);
          InstanceStatusTypes.createViaApi(testData.universityLocalInstanceStatusTypes);
          cy.resetTenant();
          cy.login(testData.user400671.username, testData.user400671.password);
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
        Users.deleteViaApi(testData.user400671.userId);
      });

      it(
        'C400671 User is NOT able to edit and delete from member tenant "Inventory - Instances" settings shared via "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C400671'] },
        () => {
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(SettingsMenu.alternativeTitleTypes);
          AlternativeTitleTypes.verifyConsortiumAlternativeTitleTypesInTheList(
            testData.centralSharedAlternativeTitleTypes.payload,
          );
          ClassificationIdentifierTypes.choose();
          ClassificationIdentifierTypes.verifyConsortiumClassificationIdentifierTypesInTheList(
            testData.centralSharedClassificationIdentifierTypes.payload,
          );
          ContributorTypes.choose();
          ContributorTypes.verifyConsortiumContributorTypesInTheList(
            testData.centralSharedContributorTypes.payload,
          );
          Formats.choose();
          Formats.verifyConsortiumFormatsInTheList(testData.centralSharedFormats.payload);
          InstanceNoteTypes.choose();
          InstanceNoteTypes.verifyConsortiumInstanceNoteTypesInTheList(
            testData.centralSharedInstanceNoteTypes.payload,
          );
          InstanceNoteTypes.verifyLocalInstanceNoteTypesInTheList(
            testData.collegeLocalInstanceNoteTypes,
          );
          InstanceNoteTypes.clickTrashButtonForInstanceNoteTypes(
            testData.collegeLocalInstanceNoteTypes.name,
          );
          InstanceNoteTypes.verifyInstanceNoteTypesAbsentInTheList(
            testData.collegeLocalInstanceNoteTypes,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          cy.visit(SettingsMenu.instanceStatusTypesPath);
          InstanceStatusTypes.verifyConsortiumInstanceStatusTypesInTheList(
            testData.centralSharedInstanceStatusTypes.payload,
          );
          InstanceStatusTypes.verifyInstanceStatusTypesAbsentInTheList(
            testData.collegeLocalInstanceNoteTypes,
          );
          InstanceStatusTypes.verifyLocalInstanceStatusTypesInTheList(
            testData.universityLocalInstanceStatusTypes,
          );
          InstanceStatusTypes.clickTrashButtonForInstanceStatusTypes(
            testData.universityLocalInstanceStatusTypes.name,
          );
          InstanceStatusTypes.verifyInstanceStatusTypesAbsentInTheList(
            testData.universityLocalInstanceStatusTypes,
          );
          cy.visit(SettingsMenu.modesOfIssuancePath);
          ModesOfIssuance.verifyConsortiumModesOfIssuancesInTheList(
            testData.centralSharedModesOfIssuance.payload,
          );
          NatureOfContent.choose();
          NatureOfContent.verifyConsortiumNatureOfContentInTheList(
            testData.centralSharedNatureOfContent.payload,
          );
          ResourceIdentifierTypes.choose();
          ResourceIdentifierTypes.verifyConsortiumResourceIdentifierTypesInTheList(
            testData.centralSharedResourceIdentifierTypes.payload,
          );
          ResourceTypes.choose();
          ResourceTypes.verifyConsortiumResourceTypesInTheList(
            testData.centralSharedResourceTypes.payload,
          );
        },
      );
    });
  });
});
