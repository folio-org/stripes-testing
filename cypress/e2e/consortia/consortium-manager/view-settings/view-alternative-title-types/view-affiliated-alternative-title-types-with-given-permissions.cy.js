import permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import AlternativeTitleTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/alternativeTitleTypesConsortiumManager';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../../support/fragments/topMenu';

const testData = {
  centralSharedType: {
    payload: {
      name: getTestEntityValue('centralSharedType_name'),
    },
  },
  centralLocalType: {
    name: getTestEntityValue('centralLocalType_name'),
  },
  collegeLocalType: {
    name: getTestEntityValue('collegeLocalType_name'),
  },
  universityLocalType: {
    name: getTestEntityValue('universityLocalType_name'),
  },
};

describe('Consortium manager', () => {
  describe('View settings', () => {
    describe('View Alternative title types', () => {
      before('create test data', () => {
        cy.getAdminToken();
        AlternativeTitleTypesConsortiumManager.createViaApi(testData.centralSharedType).then(
          (newType) => {
            testData.centralSharedType = newType;
          },
        );
        InventoryInstance.createAlternativeTitleTypeViaAPI(testData.centralLocalType.name).then(
          (alternativeTitleTypeID) => {
            testData.centralLocalType.id = alternativeTitleTypeID;
          },
        );

        cy.createTempUser([
          permissions.consortiaSettingsConsortiumManagerView.gui,
          permissions.crudAlternativeTitleTypes.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            permissions.crudAlternativeTitleTypes.gui,
          ]);
          InventoryInstance.createAlternativeTitleTypeViaAPI(testData.collegeLocalType.name).then(
            (alternativeTitleTypeID) => {
              testData.collegeLocalType.id = alternativeTitleTypeID;
            },
          );

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            permissions.crudAlternativeTitleTypes.gui,
          ]);
          InventoryInstance.createAlternativeTitleTypeViaAPI(
            testData.universityLocalType.name,
          ).then((alternativeTitleTypeID) => {
            testData.universityLocalType.id = alternativeTitleTypeID;
          });

          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });
        });
      });

      after('delete test data', () => {
        cy.setTenant(Affiliations.University);
        cy.getUniversityAdminToken();
        cy.deleteAlternativeTitleTypes(testData.universityLocalType.id);

        cy.resetTenant();
        cy.getAdminToken();

        cy.setTenant(Affiliations.College);
        cy.getCollegeAdminToken();
        cy.deleteAlternativeTitleTypes(testData.collegeLocalType.id);

        cy.setTenant(Affiliations.Consortia);
        cy.getAdminToken();
        cy.deleteAlternativeTitleTypes(testData.centralLocalType.id);
        AlternativeTitleTypesConsortiumManager.deleteViaApi(testData.centralSharedType);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C410855 User with "Consortium manager: Can view existing settings" permission is able to view the list of alternative title types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet'] },
        () => {
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          AlternativeTitleTypesConsortiumManager.choose();
          AlternativeTitleTypesConsortiumManager.verifyTypeInTheList(
            testData.centralSharedType.payload.name,
            'consortium',
            'All',
          );
          AlternativeTitleTypesConsortiumManager.verifyTypeInTheList(
            testData.centralLocalType.name,
            'local',
            tenantNames.central,
            'edit',
            'trash',
          );

          AlternativeTitleTypesConsortiumManager.verifyTypeInTheList(
            testData.collegeLocalType.name,
            'local',
            tenantNames.college,
            'edit',
            'trash',
          );
          AlternativeTitleTypesConsortiumManager.verifyTypeInTheList(
            testData.universityLocalType.name,
            'local',
            tenantNames.university,
            'edit',
            'trash',
          );

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3);
          SelectMembers.selectMembers(tenantNames.central);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyMembersSelected(2);
          AlternativeTitleTypesConsortiumManager.verifyTypeInTheList(
            testData.centralSharedType.payload.name,
            'consortium',
            'All',
          );
          AlternativeTitleTypesConsortiumManager.verifyNoTypeInTheList(
            testData.centralLocalType.name,
          );

          AlternativeTitleTypesConsortiumManager.verifyTypeInTheList(
            testData.collegeLocalType.name,
            'local',
            tenantNames.college,
            'edit',
            'trash',
          );
          AlternativeTitleTypesConsortiumManager.verifyTypeInTheList(
            testData.universityLocalType.name,
            'local',
            tenantNames.university,
            'edit',
            'trash',
          );
        },
      );
    });
  });
});
