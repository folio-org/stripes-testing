import { APPLICATION_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SubjectSources from '../../../../support/fragments/settings/inventory/instances/subjectSources';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    describe('Consortia', () => {
      const testData = {};
      const localSubjectSourceOnCollege = {
        name: `C580267 autotestSubjectSourceName${getRandomPostfix()}`,
        source: 'local',
      };

      before('Create user, data', () => {
        cy.getAdminToken();
        cy.getConsortiaId()
          .then((consortiaId) => {
            testData.consortiaId = consortiaId;

            cy.setTenant(Affiliations.College);
            SubjectSources.createViaApi({
              source: localSubjectSourceOnCollege.source,
              name: localSubjectSourceOnCollege.name,
            }).then((response) => {
              localSubjectSourceOnCollege.id = response.body.id;
            });
            InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
              testData.instanceId = instanceData.instanceId;
            });
            cy.resetTenant();
          })
          .then(() => {
            InventoryInstance.shareInstanceViaApi(
              testData.instanceId,
              testData.consortiaId,
              Affiliations.College,
              Affiliations.Consortia,
            );
          });
        cy.resetTenant();

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
        cy.setTenant(Affiliations.College);
        SubjectSources.deleteViaApi(localSubjectSourceOnCollege.id);
      });

      it(
        "C580267 (CONSORTIA) Local Subject source can't be settled for shared instance (consortia) (folijet)",
        { tags: ['extendedPathECS', 'folijet', 'C580267'] },
        () => {
          InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.addSubjectSource(localSubjectSourceOnCollege.name);
          InstanceRecordEdit.clickSaveAndCloseButton();
          InstanceRecordEdit.verifyErrorMessage(
            `400: insert or update on table "instance_subject_source" violates foreign key constraint "fk_source_id": Key (source_id)=(${localSubjectSourceOnCollege.id}) is not present in table "subject_source".`,
          );
        },
      );
    });
  });
});
