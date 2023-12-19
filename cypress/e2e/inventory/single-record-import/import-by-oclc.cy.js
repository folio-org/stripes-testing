import { Permissions } from '../../../support/dictionary';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

let user;
const oclc = '1007797324';
const OCLCAuthentication = '100481406/PAOLF';

describe('inventory', () => {
  describe('Single record import', () => {
    before('create user', () => {
      cy.createTempUser([
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
        cy.login(user.username, user.password);
      });
    });

    beforeEach('navigate to inventory', () => {
      cy.visit(TopMenu.inventoryPath);
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        cy.getInstance({ limit: 1, expandAll: true, query: `"oclc"=="${oclc}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C193953 Overlay existing Source = MARC Instance by import of single MARC Bib record from OCLC (folijet)',
      { tags: ['smoke', 'folijet'] },
      () => {
        InventoryActions.import(oclc);
        InstanceRecordView.waitLoading();
        InventoryInstance.viewSource();
        InventoryViewSource.contains('999\tf f\t$s');
      },
    );

    it(
      'C193952 Create Instance by import of single MARC Bib record from OCLC (folijet)',
      { tags: ['smoke', 'folijet'] },
      () => {
        InventorySearchAndFilter.searchByParameter('OCLC number, normalized', oclc);
        InventorySearchAndFilter.selectSearchResultItem();
        InventoryInstance.viewSource();
        InventoryViewSource.contains('999\tf f\t$s');
      },
    );
  });
});
