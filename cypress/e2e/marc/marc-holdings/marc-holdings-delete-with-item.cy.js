import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      marcBibTitle: `AT_C345402_MarcBibInstance_${getRandomPostfix()}`,
    };

    let recordId;
    let locationCode;
    let loanType;
    let materialType;

    before('Creating user, data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
          (location) => {
            locationCode = location.code;
          },
        );
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
          loanType = loanTypes[0];
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          materialType = res;
        });
      }).then(() => {
        cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
          recordId = instanceId;
          cy.getInstanceById(instanceId).then((instanceData) => {
            cy.createSimpleMarcHoldingsViaAPI(recordId, instanceData.hrid, locationCode).then(
              (createdHoldingsId) => {
                cy.createItem({
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  holdingsRecordId: createdHoldingsId,
                  materialType: { id: materialType.id },
                  permanentLoanType: { id: loanType.id },
                }).then(() => {
                  cy.getAdminToken();
                  cy.createTempUser([
                    Permissions.inventoryAll.gui,
                    Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
                  ]).then((tempUser) => {
                    testData.tempUser = tempUser;

                    cy.login(tempUser.username, tempUser.password, {
                      path: TopMenu.inventoryPath,
                      waiter: InventoryInstances.waitContentLoading,
                      authRefresh: true,
                    });
                  });
                });
              },
            );
          });
        });
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.tempUser.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
    });

    it(
      'C345402 Delete holdings record with item (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C345402'] },
      () => {
        InventoryInstances.searchByTitle(recordId);
        InventoryInstances.selectInstanceById(recordId);
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingView();

        HoldingsRecordView.tryToDelete({ deleteButtonShown: false });
        HoldingsRecordView.waitLoading();
      },
    );
  });
});
