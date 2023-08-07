import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { MultiColumnListCell } from '../../../../interactors';
import permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import TestTypes from '../../../support/dictionary/testTypes';
import Users from '../../../support/fragments/users/users';
import Helper from '../../../support/fragments/finance/financeHelper';
import DevTeams from '../../../support/dictionary/devTeams';
import { INSTANCE_SOURCE_NAMES, LOCATION_NAMES } from '../../../support/constants';
import { cy } from 'date-fns/locale';

describe('ui-inventory: holdings', () => {
  let user;
  const numberOfItems = 1000;
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `Instance ${getRandomPostfix()}`,
  };

  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken()
    .then(()=>{
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => { itemData.instanceTypeId = instanceTypes[0].id; });
      cy.getHoldingTypes({ limit: 1 }).then((res) => { itemData.holdingTypeId = res[0].id; });
      cy.getLoanTypes({ limit: 1 }).then((res) => { itemData.loanTypeId = res[0].id; });
      cy.getMaterialTypes({ limit: 1 }).then((res) => {
        itemData.materialTypeId = res.id;
      });
    }).then(() => {
      InventoryInstances.createFolioInstanceViaApi({ instance: {
        instanceTypeId: itemData.instanceTypeId,
        title: itemData.instanceTitle,
      },
      holdings: [{
        holdingsTypeId: itemData.holdingTypeId,
        permanentLocationId: defaultLocation.id,
      }],
      items: [{
        barcode: itemData.items[0].barcode,
        status:  { name: ITEM_STATUS_NAMES.AVAILABLE },
        permanentLoanType: { id: itemData.loanTypeId },
        materialType: { id: itemData.materialTypeId },
      }]});
    }).then(specialInstanceIds => {
      itemData.testInstanceIds = specialInstanceIds;
    });
    console.log(itemData.testInstanceIds);

    cy.createTempUser([
      permissions.inventoryAll.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
  });

  it('C350639: Verify the ability to see holdings with 1000+ items: CASE 1 (folijet)',
    { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
      
    });
});
