import { calloutTypes } from '../../../../../interactors';
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
        name: `C580276 autotestSubjectSourceName${getRandomPostfix()}`,
        source: 'local',
      };

      before('Create user, data', () => {
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        SubjectSources.createViaApi({
          source: localSubjectSourceOnCollege.source,
          name: localSubjectSourceOnCollege.name,
        }).then((response) => {
          localSubjectSourceOnCollege.id = response.body.id;
        });
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });
        cy.resetTenant();

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.inventoryAll.gui,
            Permissions.consortiaInventoryShareLocalInstance.gui,
          ]);
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
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        SubjectSources.deleteViaApi(localSubjectSourceOnCollege.id);
      });

      it(
        "C580276 (CONSORTIA) Local instance can't be shared with local subject source (consortia) (folijet)",
        { tags: ['extendedPathECS', 'folijet', 'C580276'] },
        () => {
          InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.addSubjectSource(localSubjectSourceOnCollege.name);
          InstanceRecordEdit.saveAndClose();
          InstanceRecordView.waitLoading();
          InventoryInstance.clickShareLocalInstanceButton();
          InventoryInstance.clickShareInstance();
          InventoryInstance.checkCalloutMessage(
            `Local instance ${testData.instance.instanceTitle} was not shared`,
            calloutTypes.error,
          );
        },
      );
    });
  });
});
