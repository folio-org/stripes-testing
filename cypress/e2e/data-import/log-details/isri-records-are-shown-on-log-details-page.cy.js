import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import EditTargetProfile from '../../../support/fragments/settings/inventory/integrations/editTargetProfile';
import ViewTargetProfile from '../../../support/fragments/settings/inventory/integrations/viewTargetProfile';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    const instanceHrids = [];
    const OCLCAuthentication = '100481406/PAOLF';
    const oclcNumber = '1234567';
    const targetProfileName = 'OCLC WorldCat';

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        instanceHrids.forEach((instanceHrid) => {
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
            (instance) => {
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
        });
      });
    });

    it(
      'C375147 Verify that no ISRI records are shown on Data Import Landing page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        cy.visit(SettingsMenu.targetProfilesPath);
        Z3950TargetProfiles.openTargetProfile();
        ViewTargetProfile.getAuthentication().then((auth) => {
          if (auth !== OCLCAuthentication) {
            ViewTargetProfile.edit();
            EditTargetProfile.fillAuthentication(OCLCAuthentication);
            EditTargetProfile.save(targetProfileName);
            Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.importWithOclc(oclcNumber);
            InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
              instanceHrids.push(initialInstanceHrId);
            });
            InventoryInstance.checkCalloutMessage(
              `Record ${oclcNumber} created. Results may take a few moments to become visible in Inventory`,
            );
          } else {
            Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.importWithOclc(oclcNumber);
            InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
              instanceHrids.push(initialInstanceHrId);
            });
            InventoryInstance.checkCalloutMessage(
              `Record ${oclcNumber} created. Results may take a few moments to become visible in Inventory`,
            );
          }
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        Logs.verifyNoFileNameLogAbsent();
        Logs.openViewAllLogs();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.checkByReverseChronologicalOrder();
        LogsViewAll.checkJobProfileNameByRow(0, 'No file name');
      },
    );

    it(
      'C375148 Verify that ISRI records are shown on log details page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        cy.visit(SettingsMenu.targetProfilesPath);
        Z3950TargetProfiles.openTargetProfile();
        ViewTargetProfile.getAuthentication().then((auth) => {
          if (auth !== OCLCAuthentication) {
            ViewTargetProfile.edit();
            EditTargetProfile.fillAuthentication(OCLCAuthentication);
            EditTargetProfile.save(targetProfileName);
            Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.importWithOclc(oclcNumber);
            InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
              instanceHrids.push(initialInstanceHrId);
            });
            InventoryInstance.checkCalloutMessage(
              `Record ${oclcNumber} created. Results may take a few moments to become visible in Inventory`,
            );
          } else {
            Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.importWithOclc(oclcNumber);
            InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
              instanceHrids.push(initialInstanceHrId);
            });
            InventoryInstance.checkCalloutMessage(
              `Record ${oclcNumber} created. Results may take a few moments to become visible in Inventory`,
            );
          }
        });
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        Logs.openViewAllLogs();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.checkByReverseChronologicalOrder();
        LogsViewAll.openInventorysingleRecordImportsAccordion();
        LogsViewAll.singleRecordImportsStatuses.forEach((filter) => {
          LogsViewAll.filterJobsByInventorySingleRecordImports(filter);
          LogsViewAll.checkByInventorySingleRecordFileName(filter);
          LogsViewAll.filterJobsByInventorySingleRecordImports(filter);
          LogsViewAll.verifyFilterInactive(filter);
        });
      },
    );
  });
});
