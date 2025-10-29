import { APPLICATION_NAMES, RECORD_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let instanceHrid;
    const oclcNumber = '42980246';
    const OCLCAuthentication = '100481406/PAOLF';
    const field005 = '20230427101124.9';
    const field035 = '$a (OCoLC)42980246';
    const notDuplicatedFieldsContent = {
      first006field: 'jccnn           n ',
      second006field: 'm     q  h        ',
      field007: 'sd fungnnmmned',
      field008: '991202s2000    ctua     b    001 0 eng',
    };

    before('Create test user and login', () => {
      cy.getAdminToken();
      Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C347618 Overlaying with single record import creates does not duplicate control fields (folijet)',
      { tags: ['criticalPath', 'folijet', 'C347618'] },
      () => {
        InventoryInstances.importWithOclc(oclcNumber);
        InventoryInstance.checkCalloutMessage(
          `Record ${oclcNumber} created. Results may take a few moments to become visible in Inventory`,
        );
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        Logs.openViewAllLogs();
        LogsViewAll.openUserIdAccordion();
        LogsViewAll.filterJobsByUser(`${user.firstName} ${user.lastName}`);
        Logs.openFileDetails('No file name');
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          cy.wait(1000);
          InventorySearchAndFilter.selectSearchResultItem();
          InventoryInstance.startOverlaySourceBibRecord();
          InventoryInstance.overlayWithOclc(oclcNumber);
          InventoryInstance.checkCalloutMessage(
            `Record ${oclcNumber} updated. Results may take a few moments to become visible in Inventory`,
          );
          InventoryInstance.viewSource();
          InventoryViewSource.verifyRecordNotContainsDuplicatedContent(field035, 2);
          // check fields 006-008 are not duplicated
          cy.wrap(Object.values(notDuplicatedFieldsContent)).each((content) => InventoryViewSource.verifyRecordNotContainsDuplicatedContent(content));
          InventoryViewSource.contains('005\t');
          InventoryViewSource.notContains(field005);
        });
      },
    );
  });
});
