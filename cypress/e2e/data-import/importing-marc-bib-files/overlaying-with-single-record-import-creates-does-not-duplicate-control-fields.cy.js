import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import Users from '../../../support/fragments/users/users';

describe('ui-data-import', () => {
  let user;
  let instanceHrid;
  const oclcNumber = '42980246';
  const field005 = '20230427101124.9';
  const field035 = '‡a (OCoLC)ocm42980246';
  const notDuplicatedFieldsContent = {
    first006field: 'jccnn           n ',
    second006field: 'm     q  h        ',
    field007: 'sd fungnnmmned',
    field008: '991202s2000    ctua     b    001 0 eng'
  };

  before('login', () => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.inventoryAll.gui,
      permissions.uiInventorySingleRecordImport.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui
    ])
      .then(userProperties => {
        user = userProperties;

        Z3950TargetProfiles.changeOclcWorldCatValueViaApi('100473910/PAOLF');
        cy.login(user.username, user.password,
          { path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C347618 Overlaying with single record import creates does not duplicate control fields (folijet)',
    { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
      InventoryActions.import(oclcNumber);
      InventoryInstance.checkCalloutMessage(`Record ${oclcNumber} created. Results may take a few moments to become visible in Inventory`);
      cy.visit(TopMenu.dataImportPath);
      Logs.openViewAllLogs();
      LogsViewAll.openUserIdAccordion();
      LogsViewAll.filterJobsByUser(`${user.firstName} ${user.lastName}`);
      Logs.openFileDetails('No file name');
      FileDetails.openInstanceInInventory('Created');
      InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
        instanceHrid = initialInstanceHrId;

        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InventoryInstance.startOverlaySourceBibRecord();
        InventoryInstance.importWithOclc(oclcNumber);
        InventoryInstance.checkCalloutMessage(`Record ${oclcNumber} updated. Results may take a few moments to become visible in Inventory`);
        InventoryInstance.viewSource();
        InventoryViewSource.verifyRecordNotContainsDuplicatedContent(field035, 2);
        // check fields 006-008 are not duplicated
        cy.wrap(Object.values(notDuplicatedFieldsContent)).each(content => InventoryViewSource.verifyRecordNotContainsDuplicatedContent(content));
        InventoryViewSource.contains('005\t');
        InventoryViewSource.notContains(field005);
      });
    });
});
