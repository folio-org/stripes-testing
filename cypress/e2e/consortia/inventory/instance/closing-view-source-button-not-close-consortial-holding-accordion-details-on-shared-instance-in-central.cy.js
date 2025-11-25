import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  HOLDINGS_SOURCE_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        shadowInstance: {},
        shadowHoldings: {},
      };
      const marcFile = {
        marc: 'oneMarcBib.mrc',
        marcFileName: `C411662 marcFileName${getRandomPostfix()}.mrc`,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;

          cy.setTenant(Affiliations.College);
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.marcFileName,
            DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          )
            .then((response) => {
              testData.shadowInstance = response[0].instance;

              cy.getLocations({ query: `name="${LOCATION_NAMES.DCB_UI}"` }).then((res) => {
                testData.collegeLocation = res;
                InventoryHoldings.getHoldingSources({
                  limit: 1,
                  query: `(name=="${HOLDINGS_SOURCE_NAMES.FOLIO}")`,
                }).then((holdingSources) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: testData.shadowInstance.id,
                    permanentLocationId: testData.collegeLocation.id,
                    sourceId: holdingSources[0].id,
                  }).then((holding) => {
                    testData.shadowHoldings = holding;
                  });
                });
              });
            })
            .then(() => {
              InventoryInstance.shareInstanceViaApi(
                testData.shadowInstance.id,
                testData.consortiaId,
                Affiliations.College,
                Affiliations.Consortia,
              );
            });
        });
        cy.resetTenant();

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('Delete test data', () => {
        cy.withinTenant(Affiliations.College, () => {
          InventoryHoldings.deleteHoldingRecordViaApi(testData.shadowHoldings.id);
        });
        cy.withinTenant(Affiliations.Consortia, () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(testData.shadowInstance.id);
        });
      });

      it(
        'C411662 (CONSORTIA) Verify closing the View source button does not close Consortial holdings accordion details on shared Instance in Central Tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411662'] },
        () => {
          InventoryInstances.searchByTitle(testData.shadowInstance.id);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.shadowInstance.id, false);
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.College);
          InstanceRecordView.viewSource();
          InstanceRecordView.verifySrsMarcRecord();
          InventoryViewSource.waitLoading();
          InventoryViewSource.close();
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.shadowInstance.id, true);
        },
      );
    });
  });
});
