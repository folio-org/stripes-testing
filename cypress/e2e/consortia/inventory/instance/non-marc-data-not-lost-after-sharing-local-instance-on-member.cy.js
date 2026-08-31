import { INSTANCE_STATUS_TERM_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryActions from '../../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import NatureOfContent from '../../../../support/fragments/settings/inventory/instances/natureOfContent';
import Z3950TargetProfiles from '../../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        oclcNumber: '1031421568',
        today: DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD'),
        instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.CATALOGED,
        adminNote: `AT_C423680_Note_${getRandomPostfix()}`,
      };

      before('Create user, setup Z39.50', () => {
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([
          Permissions.uiInventorySingleRecordImport.gui,
          Permissions.inventoryAll.gui,
          Permissions.consortiaInventoryShareLocalInstance.gui,
          Permissions.settingsDataImportEnabled.gui,
          Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
          Permissions.enableStaffSuppressFacet.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.getStatisticalCodes({ limit: 1, query: 'source<>local' }).then((codes) => {
            testData.statisticalCode = codes[0];
          });
          cy.getStatisticalCodeTypes({ limit: 300, query: 'source<>local' }).then((codeTypes) => {
            testData.statisticalCodeTypes = codeTypes;
          });
          cy.then(() => {
            const code = testData.statisticalCode;
            const typeName = testData.statisticalCodeTypes.find(
              (t) => t.id === code.statisticalCodeTypeId,
            )?.name;
            testData.statisticalCodeOptionName = `${typeName}:    ${code.code} - ${code.name}`;
          });
          NatureOfContent.getViaApi({ limit: 1, query: 'source<>local' }).then(
            ({ natureOfContentTerms }) => {
              testData.natureOfContentTerm = natureOfContentTerms[0];
            },
          );

          Z3950TargetProfiles.changeOclcWorldCatValueViaApi();

          cy.resetTenant();
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.inventoryAll.gui,
            Permissions.enableStaffSuppressFacet.gui,
          ]);

          cy.setTenant(Affiliations.College);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.user?.userId);
        if (testData.instanceId) {
          [Affiliations.Consortia, Affiliations.College].forEach((tenant) => {
            cy.withinTenant(tenant, () => {
              InventoryInstance.deleteInstanceViaApi(testData.instanceId);
            });
          });
        }
      });

      it(
        'C423680 (CONSORTIA) Check that non-marc data is not lost after sharing the local instance on member tenant (promin)',
        { tags: ['extendedPathECS', 'promin', 'C423680'] },
        () => {
          function verifyInstanceDetails() {
            InstanceRecordView.verifyInstanceIsMarkedAsStaffSuppressed();
            InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery();
            InstanceRecordView.verifyCatalogedDate(testData.today);
            InstanceRecordView.verifyInstanceStatusTerm(testData.instanceStatusTerm);
            InstanceRecordView.verifyNatureOfContent(testData.natureOfContentTerm.name);
            InstanceRecordView.verifyStatisticalCode(testData.statisticalCode.name);
            InstanceRecordView.verifyAdministrativeNote(testData.adminNote);
          }

          // Steps 1-2: Import MARC bib from OCLC
          cy.getToken(testData.user.username, testData.user.password);
          InventoryActions.import(testData.oclcNumber);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 3: Click Actions → Edit instance
          InventoryInstance.editInstance();
          InstanceRecordEdit.waitLoading();

          // Step 4: Set FOLIO-specific (non-MARC) fields and save
          InstanceRecordEdit.markAsStaffSuppress();
          InstanceRecordEdit.clickDiscoverySuppressCheckbox();
          InstanceRecordEdit.fillCatalogedDate(testData.today);
          InstanceRecordEdit.chooseInstanceStatusTerm(testData.instanceStatusTerm);
          InstanceRecordEdit.addStatisticalCode(testData.statisticalCodeOptionName);
          InstanceRecordEdit.addAdministrativeNote(testData.adminNote);
          InstanceRecordEdit.addNatureOfContent();
          InstanceRecordEdit.selectNatureOfContent(testData.natureOfContentTerm.name, {
            exactMatch: true,
          });
          InstanceRecordEdit.saveAndClose();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 5: Share local instance; verify non-MARC data is preserved
          InventoryInstance.shareInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          verifyInstanceDetails();

          // Step 6: Reload and re-verify data is not lost
          cy.reload();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          verifyInstanceDetails();

          // Steps 7-8: Copy HRID, switch to Central tenant, search
          InventoryInstance.getId().then((instanceId) => {
            testData.instanceId = instanceId;

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
            InventoryInstances.selectInstanceById(testData.instanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 9: Verify non-MARC data is preserved on Central tenant
            verifyInstanceDetails();
          });
        },
      );
    });
  });
});
